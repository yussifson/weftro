CREATE TABLE IF NOT EXISTS public.clipad_meeting_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID REFERENCES public.clipad_meeting_records(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  timestamp_seconds FLOAT NOT NULL DEFAULT 0,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.clipad_meeting_comments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.clipad_meeting_comments;
CREATE POLICY "Enable all for authenticated users" ON public.clipad_meeting_comments FOR ALL TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.clipad_meeting_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID REFERENCES public.clipad_meeting_records(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  timestamp_seconds FLOAT NOT NULL DEFAULT 0,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.clipad_meeting_reactions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.clipad_meeting_reactions;
CREATE POLICY "Enable all for authenticated users" ON public.clipad_meeting_reactions FOR ALL TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- PowerSync publication
DO $$ BEGIN
  ALTER PUBLICATION powersync ADD TABLE public.clipad_meeting_comments;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION powersync ADD TABLE public.clipad_meeting_reactions;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
