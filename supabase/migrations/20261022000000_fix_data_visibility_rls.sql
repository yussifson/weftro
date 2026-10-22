-- Migration: Fix data visibility for authenticated users
-- Problem: Users can't see their own spaces, videos, or meetings after login because:
--   1. clipad_spaces RLS only allows access by company_id match, not by creator ownership
--   2. user_has_space_access() queries clipad_spaces which is blocked by its own RLS
--   3. clipad_videos policy relies on user_has_space_access which can fail if spaces are blocked
--   4. get_auth_company_id() returns null if profiles.company_id is null/unset
-- Fix: Add owner-based access alongside company-based access for all core tables

-- ============================================================
-- 1. Fix get_auth_company_id() to be more robust
-- ============================================================
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

-- ============================================================
-- 2. Fix user_has_space_access() to also check creator ownership
-- ============================================================
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

-- ============================================================
-- 3. Fix clipad_spaces SELECT policy: allow creator to always see their own spaces
-- ============================================================
DROP POLICY IF EXISTS "Tenant isolation for clipad_spaces select" ON public.clipad_spaces;
CREATE POLICY "Tenant isolation for clipad_spaces select" ON public.clipad_spaces
  FOR SELECT TO authenticated
  USING (
    company_id::text = public.get_auth_company_id()
    OR created_by = auth.uid()
    OR public.is_super_admin()
  );

-- ============================================================
-- 4. Fix clipad_videos SELECT policy: allow creator OR company match
-- ============================================================
DROP POLICY IF EXISTS "Tenant isolation for clipad_videos select" ON public.clipad_videos;
DROP POLICY IF EXISTS "Enable read for same company users" ON public.clipad_videos;
CREATE POLICY "Tenant isolation for clipad_videos select" ON public.clipad_videos
  FOR SELECT TO authenticated
  USING (
    creator_id = auth.uid()
    OR company_id::text = public.get_auth_company_id()
    OR public.user_has_space_access(space_id)
    OR public.is_super_admin()
  );

-- ============================================================
-- 5. Fix clipad_meeting_records SELECT policy: allow host OR company match OR created_by
-- ============================================================
DROP POLICY IF EXISTS "Tenant isolation for clipad_meeting_records select" ON public.clipad_meeting_records;
DROP POLICY IF EXISTS "Enable all for same company users" ON public.clipad_meeting_records;
CREATE POLICY "Tenant isolation for clipad_meeting_records select" ON public.clipad_meeting_records
  FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR host_id = auth.uid()
    OR company_id::text = public.get_auth_company_id()
    OR (space_id IS NOT NULL AND public.user_has_space_access(space_id))
    OR public.is_super_admin()
  );

-- Re-add insert/update/delete if not present
DROP POLICY IF EXISTS "Tenant isolation for clipad_meeting_records insert" ON public.clipad_meeting_records;
CREATE POLICY "Tenant isolation for clipad_meeting_records insert" ON public.clipad_meeting_records
  FOR INSERT TO authenticated
  WITH CHECK (
    (space_id IS NULL OR public.user_has_space_access(space_id))
    OR host_id = auth.uid()
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "Tenant isolation for clipad_meeting_records update" ON public.clipad_meeting_records;
CREATE POLICY "Tenant isolation for clipad_meeting_records update" ON public.clipad_meeting_records
  FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR host_id = auth.uid()
    OR (space_id IS NOT NULL AND public.user_has_space_access(space_id))
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "Tenant isolation for clipad_meeting_records delete" ON public.clipad_meeting_records;
CREATE POLICY "Tenant isolation for clipad_meeting_records delete" ON public.clipad_meeting_records
  FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR host_id = auth.uid()
    OR public.is_super_admin()
  );

-- ============================================================
-- 6. Fix profiles SELECT: also allow viewing own profile even if company mismatch
-- ============================================================
DROP POLICY IF EXISTS "Profiles are viewable by same company or self" ON public.profiles;
CREATE POLICY "Profiles are viewable by same company or self" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR company_id::text = public.get_auth_company_id()
    OR public.is_super_admin()
  );

-- ============================================================
-- 7. Fix clipad_spaces INSERT/UPDATE: also allow if creator is the auth user
-- ============================================================
DROP POLICY IF EXISTS "Tenant isolation for clipad_spaces insert" ON public.clipad_spaces;
CREATE POLICY "Tenant isolation for clipad_spaces insert" ON public.clipad_spaces
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id::text = public.get_auth_company_id()
    OR created_by = auth.uid()
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "Tenant isolation for clipad_spaces update" ON public.clipad_spaces;
CREATE POLICY "Tenant isolation for clipad_spaces update" ON public.clipad_spaces
  FOR UPDATE TO authenticated
  USING (
    company_id::text = public.get_auth_company_id()
    OR created_by = auth.uid()
    OR public.is_super_admin()
  );

-- ============================================================
-- 8. Fix clipad_videos INSERT/UPDATE: allow creator
-- ============================================================
DROP POLICY IF EXISTS "Tenant isolation for clipad_videos insert" ON public.clipad_videos;
CREATE POLICY "Tenant isolation for clipad_videos insert" ON public.clipad_videos
  FOR INSERT TO authenticated
  WITH CHECK (
    creator_id = auth.uid()
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "Tenant isolation for clipad_videos update" ON public.clipad_videos;
CREATE POLICY "Tenant isolation for clipad_videos update" ON public.clipad_videos
  FOR UPDATE TO authenticated
  USING (
    creator_id = auth.uid()
    OR company_id::text = public.get_auth_company_id()
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "Tenant isolation for clipad_videos delete" ON public.clipad_videos;
CREATE POLICY "Tenant isolation for clipad_videos delete" ON public.clipad_videos
  FOR DELETE TO authenticated
  USING (
    creator_id = auth.uid()
    OR public.is_super_admin()
  );

-- ============================================================
-- 9. Fix clipad_action_items to allow access for assignee too
-- ============================================================
DROP POLICY IF EXISTS "Tenant isolation for clipad_action_items" ON public.clipad_action_items;
CREATE POLICY "Tenant isolation for clipad_action_items" ON public.clipad_action_items
  FOR ALL TO authenticated
  USING (
    assigned_to = auth.uid()
    OR meeting_id IN (
      SELECT id FROM public.clipad_meeting_records
      WHERE created_by = auth.uid()
         OR host_id = auth.uid()
         OR company_id::text = public.get_auth_company_id()
         OR (space_id IS NOT NULL AND public.user_has_space_access(space_id))
    )
    OR public.is_super_admin()
  )
  WITH CHECK (
    assigned_to = auth.uid()
    OR meeting_id IN (
      SELECT id FROM public.clipad_meeting_records
      WHERE created_by = auth.uid()
         OR host_id = auth.uid()
         OR (space_id IS NOT NULL AND public.user_has_space_access(space_id))
    )
    OR public.is_super_admin()
  );
