-- Security Hardening Migration: CLIPAD Enterprise Multi-Tenant Isolation & RLS Enforcement
-- Migration: 20261015120000_clipad_security_hardening.sql

-- 1. Helper Security Functions (SECURITY DEFINER with fixed search_path)
CREATE OR REPLACE FUNCTION public.get_auth_company_id()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id::text FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'
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
        AND (s.company_id::text = public.get_auth_company_id() OR public.is_super_admin())
    )
  );
$$;

-- 2. Protect public.profiles against Unauthorized Role / Company Escalation
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles are viewable by same company or self" ON public.profiles;
CREATE POLICY "Profiles are viewable by same company or self" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR company_id::text = public.get_auth_company_id()
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    id = auth.uid()
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    id = auth.uid()
    OR public.is_super_admin()
  );

CREATE OR REPLACE FUNCTION public.protect_profile_roles()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If role or company_id changed, verify caller has super_admin role or is service_role
  IF (NEW.role IS DISTINCT FROM OLD.role OR NEW.company_id IS DISTINCT FROM OLD.company_id) THEN
    IF (auth.jwt() ->> 'role' = 'service_role' OR public.is_super_admin()) THEN
      -- Permitted
    ELSE
      -- Revert unauthorized privilege changes
      NEW.role := OLD.role;
      NEW.company_id := OLD.company_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_roles ON public.profiles;
CREATE TRIGGER trg_protect_profile_roles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_roles();

-- 3. Lock Down public.companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Companies are viewable by company members or super_admins" ON public.companies;
CREATE POLICY "Companies are viewable by company members or super_admins" ON public.companies
  FOR SELECT TO authenticated
  USING (
    id::text = public.get_auth_company_id()
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "Companies can be inserted during onboarding or by super_admins" ON public.companies;
CREATE POLICY "Companies can be inserted during onboarding or by super_admins" ON public.companies
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "Companies can only be modified by admins or super_admins" ON public.companies;
CREATE POLICY "Companies can only be modified by admins or super_admins" ON public.companies
  FOR UPDATE TO authenticated
  USING (
    (id::text = public.get_auth_company_id() AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'company_admin', 'owner')))
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "Companies can only be deleted by super_admins" ON public.companies;
CREATE POLICY "Companies can only be deleted by super_admins" ON public.companies
  FOR DELETE TO authenticated
  USING (
    public.is_super_admin()
  );

-- 4. Secure public.clipad_spaces
ALTER TABLE public.clipad_spaces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read clipad_spaces" ON public.clipad_spaces;
DROP POLICY IF EXISTS "Allow authenticated insert clipad_spaces" ON public.clipad_spaces;
DROP POLICY IF EXISTS "Allow authenticated update clipad_spaces" ON public.clipad_spaces;
DROP POLICY IF EXISTS "Allow authenticated delete clipad_spaces" ON public.clipad_spaces;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.clipad_spaces;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.clipad_spaces;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.clipad_spaces;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.clipad_spaces;

CREATE POLICY "Tenant isolation for clipad_spaces select" ON public.clipad_spaces
  FOR SELECT TO authenticated
  USING (
    company_id::text = public.get_auth_company_id()
    OR public.is_super_admin()
  );

CREATE POLICY "Tenant isolation for clipad_spaces insert" ON public.clipad_spaces
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id::text = public.get_auth_company_id()
    OR public.is_super_admin()
  );

CREATE POLICY "Tenant isolation for clipad_spaces update" ON public.clipad_spaces
  FOR UPDATE TO authenticated
  USING (
    company_id::text = public.get_auth_company_id()
    OR public.is_super_admin()
  );

CREATE POLICY "Tenant isolation for clipad_spaces delete" ON public.clipad_spaces
  FOR DELETE TO authenticated
  USING (
    (company_id::text = public.get_auth_company_id() AND created_by = auth.uid())
    OR public.is_super_admin()
  );

-- 5. Secure public.clipad_videos
ALTER TABLE public.clipad_videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.clipad_videos;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.clipad_videos;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.clipad_videos;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.clipad_videos;
DROP POLICY IF EXISTS "Enable read for same company users" ON public.clipad_videos;

CREATE POLICY "Tenant isolation for clipad_videos select" ON public.clipad_videos
  FOR SELECT TO authenticated
  USING (
    (space_id IS NULL AND creator_id = auth.uid())
    OR public.user_has_space_access(space_id)
    OR public.is_super_admin()
  );

CREATE POLICY "Tenant isolation for clipad_videos insert" ON public.clipad_videos
  FOR INSERT TO authenticated
  WITH CHECK (
    creator_id = auth.uid()
    AND (space_id IS NULL OR public.user_has_space_access(space_id))
  );

CREATE POLICY "Tenant isolation for clipad_videos update" ON public.clipad_videos
  FOR UPDATE TO authenticated
  USING (
    creator_id = auth.uid()
    OR public.is_super_admin()
  );

CREATE POLICY "Tenant isolation for clipad_videos delete" ON public.clipad_videos
  FOR DELETE TO authenticated
  USING (
    creator_id = auth.uid()
    OR public.is_super_admin()
  );

-- 6. Secure public.clipad_channels & members
ALTER TABLE public.clipad_channels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.clipad_channels;

CREATE POLICY "Tenant isolation for clipad_channels select" ON public.clipad_channels
  FOR SELECT TO authenticated
  USING (public.user_has_space_access(space_id) OR public.is_super_admin());

CREATE POLICY "Tenant isolation for clipad_channels insert" ON public.clipad_channels
  FOR INSERT TO authenticated
  WITH CHECK (public.user_has_space_access(space_id) OR public.is_super_admin());

CREATE POLICY "Tenant isolation for clipad_channels update" ON public.clipad_channels
  FOR UPDATE TO authenticated
  USING (public.user_has_space_access(space_id) OR public.is_super_admin());

CREATE POLICY "Tenant isolation for clipad_channels delete" ON public.clipad_channels
  FOR DELETE TO authenticated
  USING (public.user_has_space_access(space_id) OR public.is_super_admin());

ALTER TABLE public.clipad_channel_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.clipad_channel_members;

CREATE POLICY "Tenant isolation for clipad_channel_members" ON public.clipad_channel_members
  FOR ALL TO authenticated
  USING (
    channel_id IN (SELECT id FROM public.clipad_channels WHERE public.user_has_space_access(space_id))
    OR public.is_super_admin()
  )
  WITH CHECK (
    channel_id IN (SELECT id FROM public.clipad_channels WHERE public.user_has_space_access(space_id))
    OR public.is_super_admin()
  );

-- 7. Secure public.clipad_messages & reactions
ALTER TABLE public.clipad_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.clipad_messages;

CREATE POLICY "Tenant isolation for clipad_messages select" ON public.clipad_messages
  FOR SELECT TO authenticated
  USING (
    channel_id IN (SELECT id FROM public.clipad_channels WHERE public.user_has_space_access(space_id))
    OR public.is_super_admin()
  );

CREATE POLICY "Tenant isolation for clipad_messages insert" ON public.clipad_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    (user_id = auth.uid() OR user_id IS NULL)
    AND channel_id IN (SELECT id FROM public.clipad_channels WHERE public.user_has_space_access(space_id))
  );

CREATE POLICY "Tenant isolation for clipad_messages update" ON public.clipad_messages
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_super_admin()
  );

CREATE POLICY "Tenant isolation for clipad_messages delete" ON public.clipad_messages
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_super_admin()
  );

ALTER TABLE public.clipad_message_reactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.clipad_message_reactions;

CREATE POLICY "Tenant isolation for clipad_message_reactions" ON public.clipad_message_reactions
  FOR ALL TO authenticated
  USING (
    message_id IN (
      SELECT m.id FROM public.clipad_messages m
      JOIN public.clipad_channels c ON m.channel_id = c.id
      WHERE public.user_has_space_access(c.space_id)
    )
    OR public.is_super_admin()
  )
  WITH CHECK (
    user_id = auth.uid()
  );

-- 8. Secure public.clipad_task_boards & tasks
ALTER TABLE public.clipad_task_boards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.clipad_task_boards;

CREATE POLICY "Tenant isolation for clipad_task_boards" ON public.clipad_task_boards
  FOR ALL TO authenticated
  USING (public.user_has_space_access(space_id) OR public.is_super_admin())
  WITH CHECK (public.user_has_space_access(space_id) OR public.is_super_admin());

ALTER TABLE public.clipad_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.clipad_tasks;

CREATE POLICY "Tenant isolation for clipad_tasks" ON public.clipad_tasks
  FOR ALL TO authenticated
  USING (
    board_id IN (SELECT id FROM public.clipad_task_boards WHERE public.user_has_space_access(space_id))
    OR public.is_super_admin()
  )
  WITH CHECK (
    board_id IN (SELECT id FROM public.clipad_task_boards WHERE public.user_has_space_access(space_id))
    OR public.is_super_admin()
  );

ALTER TABLE public.clipad_task_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.clipad_task_comments;

CREATE POLICY "Tenant isolation for clipad_task_comments" ON public.clipad_task_comments
  FOR ALL TO authenticated
  USING (
    task_id IN (
      SELECT t.id FROM public.clipad_tasks t
      JOIN public.clipad_task_boards b ON t.board_id = b.id
      WHERE public.user_has_space_access(b.space_id)
    )
    OR public.is_super_admin()
  )
  WITH CHECK (
    user_id = auth.uid()
  );

-- 9. Secure public.clipad_docs, versions & links
ALTER TABLE public.clipad_docs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.clipad_docs;

CREATE POLICY "Tenant isolation for clipad_docs" ON public.clipad_docs
  FOR ALL TO authenticated
  USING (public.user_has_space_access(space_id) OR public.is_super_admin())
  WITH CHECK (public.user_has_space_access(space_id) OR public.is_super_admin());

ALTER TABLE public.clipad_doc_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.clipad_doc_versions;

CREATE POLICY "Tenant isolation for clipad_doc_versions" ON public.clipad_doc_versions
  FOR ALL TO authenticated
  USING (
    doc_id IN (SELECT id FROM public.clipad_docs WHERE public.user_has_space_access(space_id))
    OR public.is_super_admin()
  )
  WITH CHECK (
    doc_id IN (SELECT id FROM public.clipad_docs WHERE public.user_has_space_access(space_id))
    OR public.is_super_admin()
  );

ALTER TABLE public.clipad_doc_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.clipad_doc_links;

CREATE POLICY "Tenant isolation for clipad_doc_links" ON public.clipad_doc_links
  FOR ALL TO authenticated
  USING (
    doc_id IN (SELECT id FROM public.clipad_docs WHERE public.user_has_space_access(space_id))
    OR public.is_super_admin()
  )
  WITH CHECK (
    doc_id IN (SELECT id FROM public.clipad_docs WHERE public.user_has_space_access(space_id))
    OR public.is_super_admin()
  );

-- 10. Secure public.clipad_calendar_events & links
ALTER TABLE public.clipad_calendar_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.clipad_calendar_events;

CREATE POLICY "Tenant isolation for clipad_calendar_events" ON public.clipad_calendar_events
  FOR ALL TO authenticated
  USING (public.user_has_space_access(space_id) OR public.is_super_admin())
  WITH CHECK (public.user_has_space_access(space_id) OR public.is_super_admin());

ALTER TABLE public.clipad_scheduling_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.clipad_scheduling_links;

CREATE POLICY "Tenant isolation for clipad_scheduling_links" ON public.clipad_scheduling_links
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_super_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_super_admin());

ALTER TABLE public.clipad_external_calendar_connections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.clipad_external_calendar_connections;

CREATE POLICY "Tenant isolation for clipad_external_calendar_connections" ON public.clipad_external_calendar_connections
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_super_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_super_admin());

-- 11. Secure public.clipad_notifications & preferences
ALTER TABLE public.clipad_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.clipad_notifications;

CREATE POLICY "User isolation for clipad_notifications select" ON public.clipad_notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "User isolation for clipad_notifications insert" ON public.clipad_notifications
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "User isolation for clipad_notifications update" ON public.clipad_notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "User isolation for clipad_notifications delete" ON public.clipad_notifications
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

ALTER TABLE public.clipad_notification_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.clipad_notification_preferences;

CREATE POLICY "User isolation for clipad_notification_preferences" ON public.clipad_notification_preferences
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 12. Secure public.clipad_meeting_records & action items
ALTER TABLE public.clipad_meeting_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.clipad_meeting_records;
DROP POLICY IF EXISTS "Enable all for same company users" ON public.clipad_meeting_records;

CREATE POLICY "Tenant isolation for clipad_meeting_records select" ON public.clipad_meeting_records
  FOR SELECT TO authenticated
  USING (
    (space_id IS NOT NULL AND public.user_has_space_access(space_id))
    OR created_by = auth.uid()
    OR host_id = auth.uid()
    OR public.is_super_admin()
  );

CREATE POLICY "Tenant isolation for clipad_meeting_records insert" ON public.clipad_meeting_records
  FOR INSERT TO authenticated
  WITH CHECK (
    (space_id IS NULL OR public.user_has_space_access(space_id))
    OR public.is_super_admin()
  );

CREATE POLICY "Tenant isolation for clipad_meeting_records update" ON public.clipad_meeting_records
  FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR host_id = auth.uid()
    OR (space_id IS NOT NULL AND public.user_has_space_access(space_id))
    OR public.is_super_admin()
  );

CREATE POLICY "Tenant isolation for clipad_meeting_records delete" ON public.clipad_meeting_records
  FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR host_id = auth.uid()
    OR public.is_super_admin()
  );

ALTER TABLE public.clipad_action_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.clipad_action_items;

CREATE POLICY "Tenant isolation for clipad_action_items" ON public.clipad_action_items
  FOR ALL TO authenticated
  USING (
    meeting_id IN (
      SELECT id FROM public.clipad_meeting_records
      WHERE (space_id IS NOT NULL AND public.user_has_space_access(space_id))
         OR created_by = auth.uid()
         OR host_id = auth.uid()
    )
    OR public.is_super_admin()
  )
  WITH CHECK (
    meeting_id IN (
      SELECT id FROM public.clipad_meeting_records
      WHERE (space_id IS NOT NULL AND public.user_has_space_access(space_id))
         OR created_by = auth.uid()
         OR host_id = auth.uid()
    )
    OR public.is_super_admin()
  );

-- 13. Secure meeting & video comments/reactions
ALTER TABLE public.clipad_meeting_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.clipad_meeting_comments;

CREATE POLICY "Tenant isolation for clipad_meeting_comments select" ON public.clipad_meeting_comments
  FOR SELECT TO authenticated
  USING (
    meeting_id IN (
      SELECT id FROM public.clipad_meeting_records
      WHERE (space_id IS NOT NULL AND public.user_has_space_access(space_id))
         OR created_by = auth.uid()
         OR host_id = auth.uid()
    )
    OR public.is_super_admin()
  );

CREATE POLICY "Tenant isolation for clipad_meeting_comments mutate" ON public.clipad_meeting_comments
  FOR ALL TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_super_admin()
  )
  WITH CHECK (
    user_id = auth.uid()
  );

ALTER TABLE public.clipad_meeting_reactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.clipad_meeting_reactions;

CREATE POLICY "Tenant isolation for clipad_meeting_reactions" ON public.clipad_meeting_reactions
  FOR ALL TO authenticated
  USING (
    meeting_id IN (
      SELECT id FROM public.clipad_meeting_records
      WHERE (space_id IS NOT NULL AND public.user_has_space_access(space_id))
         OR created_by = auth.uid()
         OR host_id = auth.uid()
    )
    OR public.is_super_admin()
  )
  WITH CHECK (
    user_id = auth.uid()
  );

ALTER TABLE public.clipad_video_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.clipad_video_comments;

CREATE POLICY "Tenant isolation for clipad_video_comments select" ON public.clipad_video_comments
  FOR SELECT TO authenticated
  USING (
    video_id IN (
      SELECT id FROM public.clipad_videos
      WHERE space_id IS NULL OR public.user_has_space_access(space_id)
    )
    OR public.is_super_admin()
  );

CREATE POLICY "Tenant isolation for clipad_video_comments mutate" ON public.clipad_video_comments
  FOR ALL TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_super_admin()
  )
  WITH CHECK (
    user_id = auth.uid()
  );

ALTER TABLE public.clipad_video_reactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.clipad_video_reactions;

CREATE POLICY "Tenant isolation for clipad_video_reactions" ON public.clipad_video_reactions
  FOR ALL TO authenticated
  USING (
    video_id IN (
      SELECT id FROM public.clipad_videos
      WHERE space_id IS NULL OR public.user_has_space_access(space_id)
    )
    OR public.is_super_admin()
  )
  WITH CHECK (
    user_id = auth.uid()
  );
