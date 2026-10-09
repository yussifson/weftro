-- PHASE 1: Persistent Messaging (Chat)
CREATE TABLE IF NOT EXISTS public.clipad_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID REFERENCES public.clipad_spaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.clipad_channel_members (
  channel_id UUID REFERENCES public.clipad_channels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (channel_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.clipad_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID REFERENCES public.clipad_spaces(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES public.clipad_channels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES public.clipad_messages(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.clipad_message_reactions (
  message_id UUID REFERENCES public.clipad_messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (message_id, user_id, emoji)
);

-- PHASE 1: Task & Project Management
CREATE TABLE IF NOT EXISTS public.clipad_task_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID REFERENCES public.clipad_spaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.clipad_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES public.clipad_task_boards(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_date TIMESTAMPTZ,
  status TEXT DEFAULT 'todo',
  priority TEXT DEFAULT 'medium',
  source TEXT DEFAULT 'manual',
  meeting_id UUID REFERENCES public.clipad_meeting_records(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.clipad_task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.clipad_tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- PHASE 1: Notifications & Digest System
CREATE TABLE IF NOT EXISTS public.clipad_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  source_id UUID,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.clipad_notification_preferences (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  delivery_method TEXT DEFAULT 'realtime',
  PRIMARY KEY (user_id, type)
);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE public.clipad_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clipad_channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clipad_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clipad_message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clipad_task_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clipad_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clipad_task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clipad_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clipad_notification_preferences ENABLE ROW LEVEL SECURITY;

-- POLICIES (All authenticated users)
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.clipad_channels;
CREATE POLICY "Enable all for authenticated users" ON public.clipad_channels FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.clipad_channel_members;
CREATE POLICY "Enable all for authenticated users" ON public.clipad_channel_members FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.clipad_messages;
CREATE POLICY "Enable all for authenticated users" ON public.clipad_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.clipad_message_reactions;
CREATE POLICY "Enable all for authenticated users" ON public.clipad_message_reactions FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.clipad_task_boards;
CREATE POLICY "Enable all for authenticated users" ON public.clipad_task_boards FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.clipad_tasks;
CREATE POLICY "Enable all for authenticated users" ON public.clipad_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.clipad_task_comments;
CREATE POLICY "Enable all for authenticated users" ON public.clipad_task_comments FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.clipad_notifications;
CREATE POLICY "Enable all for authenticated users" ON public.clipad_notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.clipad_notification_preferences;
CREATE POLICY "Enable all for authenticated users" ON public.clipad_notification_preferences FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- POWERSYNC PUBLICATION
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'powersync' AND tablename = 'clipad_channels') THEN
    ALTER PUBLICATION powersync ADD TABLE public.clipad_channels;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'powersync' AND tablename = 'clipad_channel_members') THEN
    ALTER PUBLICATION powersync ADD TABLE public.clipad_channel_members;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'powersync' AND tablename = 'clipad_messages') THEN
    ALTER PUBLICATION powersync ADD TABLE public.clipad_messages;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'powersync' AND tablename = 'clipad_message_reactions') THEN
    ALTER PUBLICATION powersync ADD TABLE public.clipad_message_reactions;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'powersync' AND tablename = 'clipad_task_boards') THEN
    ALTER PUBLICATION powersync ADD TABLE public.clipad_task_boards;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'powersync' AND tablename = 'clipad_tasks') THEN
    ALTER PUBLICATION powersync ADD TABLE public.clipad_tasks;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'powersync' AND tablename = 'clipad_task_comments') THEN
    ALTER PUBLICATION powersync ADD TABLE public.clipad_task_comments;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'powersync' AND tablename = 'clipad_notifications') THEN
    ALTER PUBLICATION powersync ADD TABLE public.clipad_notifications;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'powersync' AND tablename = 'clipad_notification_preferences') THEN
    ALTER PUBLICATION powersync ADD TABLE public.clipad_notification_preferences;
  END IF;
END $$;
