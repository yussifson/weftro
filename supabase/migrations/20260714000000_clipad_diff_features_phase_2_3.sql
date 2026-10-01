-- Phase 2 & 3 Clipad Differentiated Features

-- 1. clipad_meeting_metrics (Meeting Necessity Score)
CREATE TABLE IF NOT EXISTS public.clipad_meeting_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  meeting_id UUID REFERENCES public.clipad_meeting_records(id) ON DELETE CASCADE,
  necessity_score INTEGER CHECK (necessity_score >= 0 AND necessity_score <= 100),
  engagement_metrics JSONB DEFAULT '{}'::jsonb,
  recommendation TEXT, -- e.g., 'Shift to async', 'Optimal'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. clipad_stakeholder_alerts (Silent Stakeholder Detection)
CREATE TABLE IF NOT EXISTS public.clipad_stakeholder_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  team_space_id UUID REFERENCES public.clipad_spaces(id) ON DELETE CASCADE,
  decision_id UUID REFERENCES public.clipad_decisions(id) ON DELETE CASCADE,
  missing_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'acknowledged', 'disputed'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. clipad_work_topics (Cross-Space Semantic Index & Redundant Work)
CREATE TABLE IF NOT EXISTS public.clipad_work_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  team_space_id UUID REFERENCES public.clipad_spaces(id) ON DELETE CASCADE,
  topic_name TEXT NOT NULL,
  source_meeting_id UUID REFERENCES public.clipad_meeting_records(id) ON DELETE SET NULL,
  context_snippet TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. clipad_commitments (Commitment Tracking)
CREATE TABLE IF NOT EXISTS public.clipad_commitments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  team_space_id UUID REFERENCES public.clipad_spaces(id) ON DELETE CASCADE,
  assignee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  commitment_text TEXT NOT NULL,
  source_meeting_id UUID REFERENCES public.clipad_meeting_records(id) ON DELETE SET NULL,
  due_date TIMESTAMPTZ,
  status TEXT DEFAULT 'pending', -- 'pending', 'met', 'missed'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. clipad_timezone_fairness (Timezone Fairness Engine)
CREATE TABLE IF NOT EXISTS public.clipad_timezone_fairness (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  team_space_id UUID REFERENCES public.clipad_spaces(id) ON DELETE CASCADE,
  meeting_id UUID REFERENCES public.clipad_meeting_records(id) ON DELETE CASCADE,
  out_of_hours_participants UUID[] DEFAULT '{}',
  fairness_penalty_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.clipad_meeting_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clipad_stakeholder_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clipad_work_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clipad_commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clipad_timezone_fairness ENABLE ROW LEVEL SECURITY;

-- Policies (Mirroring Phase 1 approach)
CREATE POLICY "Enable all for authenticated users" ON public.clipad_meeting_metrics FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated users" ON public.clipad_stakeholder_alerts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated users" ON public.clipad_work_topics FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated users" ON public.clipad_commitments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated users" ON public.clipad_timezone_fairness FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Add to PowerSync Publication
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'powersync' AND tablename = 'clipad_meeting_metrics') THEN
    ALTER PUBLICATION powersync ADD TABLE public.clipad_meeting_metrics;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'powersync' AND tablename = 'clipad_stakeholder_alerts') THEN
    ALTER PUBLICATION powersync ADD TABLE public.clipad_stakeholder_alerts;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'powersync' AND tablename = 'clipad_work_topics') THEN
    ALTER PUBLICATION powersync ADD TABLE public.clipad_work_topics;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'powersync' AND tablename = 'clipad_commitments') THEN
    ALTER PUBLICATION powersync ADD TABLE public.clipad_commitments;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'powersync' AND tablename = 'clipad_timezone_fairness') THEN
    ALTER PUBLICATION powersync ADD TABLE public.clipad_timezone_fairness;
  END IF;
END
$$;
