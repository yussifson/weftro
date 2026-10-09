-- PHASE 2: Docs & Wikis
CREATE TABLE IF NOT EXISTS public.clipad_docs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID REFERENCES public.clipad_spaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.clipad_doc_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_id UUID REFERENCES public.clipad_docs(id) ON DELETE CASCADE,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.clipad_doc_links (
  doc_id UUID REFERENCES public.clipad_docs(id) ON DELETE CASCADE,
  target_id UUID NOT NULL,
  target_type TEXT NOT NULL,
  PRIMARY KEY (doc_id, target_id, target_type)
);

-- PHASE 2: Calendar & Scheduling
CREATE TABLE IF NOT EXISTS public.clipad_calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID REFERENCES public.clipad_spaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  meeting_id UUID REFERENCES public.clipad_meeting_records(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.clipad_scheduling_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID REFERENCES public.clipad_spaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.clipad_external_calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE public.clipad_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clipad_doc_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clipad_doc_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clipad_calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clipad_scheduling_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clipad_external_calendar_connections ENABLE ROW LEVEL SECURITY;

-- POLICIES (All authenticated users for spaces layer)
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.clipad_docs;
CREATE POLICY "Enable all for authenticated users" ON public.clipad_docs FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.clipad_doc_versions;
CREATE POLICY "Enable all for authenticated users" ON public.clipad_doc_versions FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.clipad_doc_links;
CREATE POLICY "Enable all for authenticated users" ON public.clipad_doc_links FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.clipad_calendar_events;
CREATE POLICY "Enable all for authenticated users" ON public.clipad_calendar_events FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.clipad_scheduling_links;
CREATE POLICY "Enable all for authenticated users" ON public.clipad_scheduling_links FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.clipad_external_calendar_connections;
CREATE POLICY "Enable all for authenticated users" ON public.clipad_external_calendar_connections FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- POWERSYNC PUBLICATION
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'powersync' AND tablename = 'clipad_docs') THEN
    ALTER PUBLICATION powersync ADD TABLE public.clipad_docs;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'powersync' AND tablename = 'clipad_doc_versions') THEN
    ALTER PUBLICATION powersync ADD TABLE public.clipad_doc_versions;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'powersync' AND tablename = 'clipad_doc_links') THEN
    ALTER PUBLICATION powersync ADD TABLE public.clipad_doc_links;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'powersync' AND tablename = 'clipad_calendar_events') THEN
    ALTER PUBLICATION powersync ADD TABLE public.clipad_calendar_events;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'powersync' AND tablename = 'clipad_scheduling_links') THEN
    ALTER PUBLICATION powersync ADD TABLE public.clipad_scheduling_links;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'powersync' AND tablename = 'clipad_external_calendar_connections') THEN
    ALTER PUBLICATION powersync ADD TABLE public.clipad_external_calendar_connections;
  END IF;
END $$;
