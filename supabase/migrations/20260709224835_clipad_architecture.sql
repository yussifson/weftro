-- Migration: CliPad Architecture (Spaces, Videos, Meeting Records)

-- 1. clipad_spaces
CREATE TABLE IF NOT EXISTS public.clipad_spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  is_persistent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.clipad_spaces ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.clipad_spaces;
CREATE POLICY "Enable read for authenticated users" ON public.clipad_spaces FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.clipad_spaces;
CREATE POLICY "Enable insert for authenticated users" ON public.clipad_spaces FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.clipad_spaces;
CREATE POLICY "Enable update for authenticated users" ON public.clipad_spaces FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.clipad_spaces;
CREATE POLICY "Enable delete for authenticated users" ON public.clipad_spaces FOR DELETE TO authenticated USING (true);

-- 2. clipad_videos (Async Video Layer)
CREATE TABLE IF NOT EXISTS public.clipad_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID REFERENCES public.clipad_spaces(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  transcript TEXT,
  ai_summary TEXT,
  table_of_contents JSONB DEFAULT '[]'::jsonb,
  expires_at TIMESTAMPTZ,
  cta_config JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.clipad_videos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.clipad_videos;
CREATE POLICY "Enable read for authenticated users" ON public.clipad_videos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.clipad_videos;
CREATE POLICY "Enable insert for authenticated users" ON public.clipad_videos FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.clipad_videos;
CREATE POLICY "Enable update for authenticated users" ON public.clipad_videos FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.clipad_videos;
CREATE POLICY "Enable delete for authenticated users" ON public.clipad_videos FOR DELETE TO authenticated USING (true);

-- 3. clipad_video_comments
CREATE TABLE IF NOT EXISTS public.clipad_video_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES public.clipad_videos(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  timestamp_seconds FLOAT NOT NULL DEFAULT 0,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.clipad_video_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.clipad_video_comments;
CREATE POLICY "Enable all for authenticated users" ON public.clipad_video_comments FOR ALL TO authenticated USING (true);

-- 4. clipad_video_reactions
CREATE TABLE IF NOT EXISTS public.clipad_video_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES public.clipad_videos(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  timestamp_seconds FLOAT NOT NULL DEFAULT 0,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.clipad_video_reactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.clipad_video_reactions;
CREATE POLICY "Enable all for authenticated users" ON public.clipad_video_reactions FOR ALL TO authenticated USING (true);

-- 5. clipad_meeting_records (AI Intelligence Layer)
CREATE TABLE IF NOT EXISTS public.clipad_meeting_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID, -- Usually corresponds to video_rooms.id
  space_id UUID REFERENCES public.clipad_spaces(id) ON DELETE SET NULL,
  title TEXT,
  transcript TEXT,
  ai_summary TEXT,
  action_items JSONB DEFAULT '[]'::jsonb,
  open_questions JSONB DEFAULT '[]'::jsonb,
  sentiment TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.clipad_meeting_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.clipad_meeting_records;
CREATE POLICY "Enable all for authenticated users" ON public.clipad_meeting_records FOR ALL TO authenticated USING (true);

-- Add to powersync publication to support offline sync
ALTER PUBLICATION powersync ADD TABLE public.clipad_spaces;
ALTER PUBLICATION powersync ADD TABLE public.clipad_videos;
ALTER PUBLICATION powersync ADD TABLE public.clipad_video_comments;
ALTER PUBLICATION powersync ADD TABLE public.clipad_video_reactions;
ALTER PUBLICATION powersync ADD TABLE public.clipad_meeting_records;
