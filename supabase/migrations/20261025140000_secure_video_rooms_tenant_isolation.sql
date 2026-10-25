-- Migration: Video Room Tenant Isolation, Privacy Controls & Strict Access Policies
-- Phase 4 Security Hardening for Weftro V3 Meetings
-- Migration: 20261025140000_secure_video_rooms_tenant_isolation.sql

-- 0. Ensure tenant helper functions exist if not previously installed
CREATE OR REPLACE FUNCTION public.get_auth_company_id()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    company_id::text,
    (SELECT raw_app_meta_data->>'company_id' FROM auth.users WHERE id = auth.uid()),
    (auth.jwt() -> 'user_metadata' ->> 'company_id')
  )
  FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'owner')
  );
$$;

CREATE OR REPLACE FUNCTION public.user_has_space_access(check_space_id UUID)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    check_space_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.clipad_spaces s
      WHERE s.id = check_space_id
        AND (
          s.company_id::text = public.get_auth_company_id()
          OR s.created_by = auth.uid()
          OR public.is_super_admin()
        )
    )
  );
$$;

-- 1. Ensure columns exist on public.video_rooms for multi-tenant isolation and privacy enforcement
ALTER TABLE public.video_rooms 
  ADD COLUMN IF NOT EXISTS privacy_type TEXT DEFAULT 'public' CHECK (privacy_type IN ('public', 'private')),
  ADD COLUMN IF NOT EXISTS space_id UUID REFERENCES public.clipad_spaces(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_video_rooms_company_id ON public.video_rooms(company_id);
CREATE INDEX IF NOT EXISTS idx_video_rooms_host_id ON public.video_rooms(host_id);
CREATE INDEX IF NOT EXISTS idx_video_rooms_daily_name ON public.video_rooms(daily_room_name);

-- 2. Tighten Row Level Security (RLS) on public.video_rooms
-- Drop overly permissive "Anyone can view video rooms by id" policy
DROP POLICY IF EXISTS "Anyone can view video rooms by id" ON public.video_rooms;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.video_rooms;
DROP POLICY IF EXISTS "Tenant isolation for video_rooms select" ON public.video_rooms;

-- SELECT policy:
-- 1. Public meetings (privacy_type = 'public' and company_id is NULL) can be read by anyone (allowing legitimate guest join)
-- 2. Organization meetings (company_id IS NOT NULL) require authenticated viewer belonging to the same company or super_admin
-- 3. Private meetings are restricted strictly to the meeting host, same-company members, or super_admin
CREATE POLICY "Tenant isolation for video_rooms select" ON public.video_rooms
  FOR SELECT TO public
  USING (
    -- Public standalone meetings can be discovered/verified by guest callers
    (privacy_type = 'public' AND company_id IS NULL)
    OR
    -- Organization meetings require same-tenant affiliation
    (company_id IS NOT NULL AND auth.uid() IS NOT NULL AND (
      company_id::text = public.get_auth_company_id() 
      OR public.is_super_admin()
    ))
    OR
    -- Meeting host always has access to their room
    (host_id = auth.uid())
    OR
    -- Space-associated meetings verify space tenant access
    (space_id IS NOT NULL AND auth.uid() IS NOT NULL AND public.user_has_space_access(space_id))
  );

-- INSERT policy:
-- Authenticated users can insert meetings for their own company or public standalone meetings
DROP POLICY IF EXISTS "Tenant isolation for video_rooms insert" ON public.video_rooms;
CREATE POLICY "Tenant isolation for video_rooms insert" ON public.video_rooms
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Caller must be host or super_admin
    (host_id = auth.uid() OR host_id IS NULL OR public.is_super_admin())
    AND
    -- Cannot inject arbitrary other company_id
    (company_id IS NULL OR company_id::text = public.get_auth_company_id() OR public.is_super_admin())
  );

-- UPDATE policy:
-- Retain the strictly verified host-only update policy from Phase 1.1 / Phase 2
DROP POLICY IF EXISTS "Only host can update video rooms" ON public.video_rooms;
CREATE POLICY "Only host can update video rooms" ON public.video_rooms
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = host_id 
    OR public.is_super_admin()
  )
  WITH CHECK (
    auth.uid() = host_id 
    OR public.is_super_admin()
  );

-- DELETE policy:
-- Only the host or super_admin can delete a meeting room
DROP POLICY IF EXISTS "Only host can delete video rooms" ON public.video_rooms;
CREATE POLICY "Only host can delete video rooms" ON public.video_rooms
  FOR DELETE TO authenticated
  USING (
    auth.uid() = host_id 
    OR public.is_super_admin()
  );

-- 3. Dedicated Server-Side Function to Authoritatively Verify Room Access
CREATE OR REPLACE FUNCTION public.verify_meeting_access(
  p_room_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller_id UUID;
  v_caller_company TEXT;
  v_is_super_admin BOOLEAN;
  v_room RECORD;
BEGIN
  v_caller_id := auth.uid();
  v_caller_company := public.get_auth_company_id();
  v_is_super_admin := public.is_super_admin();

  SELECT id, company_id, host_id, privacy_type, status, space_id, daily_room_url
  INTO v_room
  FROM public.video_rooms
  WHERE daily_room_name = p_room_name
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'error', 'Meeting room not found'
    );
  END IF;

  -- If meeting is ended
  IF v_room.status = 'ended' THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'error', 'This meeting has ended'
    );
  END IF;

  -- Host always allowed
  IF v_caller_id IS NOT NULL AND v_room.host_id = v_caller_id THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'is_host', true,
      'privacy_type', v_room.privacy_type,
      'room_id', v_room.id
    );
  END IF;

  -- Organization meeting check
  IF v_room.company_id IS NOT NULL THEN
    IF v_caller_id IS NULL THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'error', 'Authentication required for organization meetings'
      );
    END IF;

    IF NOT v_is_super_admin AND (v_caller_company IS NULL OR v_caller_company != v_room.company_id::text) THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'error', 'Forbidden: You do not belong to the organization hosting this meeting'
      );
    END IF;
  END IF;

  -- Private meeting check
  IF v_room.privacy_type = 'private' AND v_room.company_id IS NULL THEN
    IF v_caller_id IS NULL THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'error', 'Authentication required for private meetings'
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'is_host', false,
    'privacy_type', v_room.privacy_type,
    'room_id', v_room.id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_meeting_access(TEXT) TO authenticated, anon;
