CREATE TABLE IF NOT EXISTS public.clipad_meeting_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID REFERENCES public.clipad_meeting_records(id) ON DELETE CASCADE,
    viewer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(meeting_id, viewer_id)
);

ALTER TABLE public.clipad_meeting_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.clipad_meeting_views;
CREATE POLICY "Enable all for authenticated users" ON public.clipad_meeting_views FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Enable all for public" ON public.clipad_meeting_views;
CREATE POLICY "Enable all for public" ON public.clipad_meeting_views FOR ALL USING (true) WITH CHECK (true);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'powersync' AND tablename = 'clipad_meeting_views'
    ) THEN
        ALTER PUBLICATION powersync ADD TABLE public.clipad_meeting_views;
    END IF;
END
$$;
