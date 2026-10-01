CREATE TABLE IF NOT EXISTS public.clipad_video_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES public.clipad_videos(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  watch_percent INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.clipad_video_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for authenticated users" ON public.clipad_video_views FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Add to PowerSync publication (safe if already published, but powersync might complain so we use a safe block if needed, but standard is just ADD TABLE)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'powersync' AND tablename = 'clipad_video_views'
  ) THEN
    ALTER PUBLICATION powersync ADD TABLE public.clipad_video_views;
  END IF;
END $$;
