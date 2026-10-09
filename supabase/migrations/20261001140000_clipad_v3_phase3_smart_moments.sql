-- ──────────────────────────────────────────────────────────────────
-- CLIPAD V3 — PHASE 3 SMART MOMENTS & MEETING/VIDEO INTELLIGENCE MIGRATION
-- Non-Destructive Database Schema Extension for Smart Moments
-- ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.clipad_v3_smart_moments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  team_space_id UUID REFERENCES public.clipad_spaces(id) ON DELETE SET NULL,
  meeting_id UUID REFERENCES public.clipad_meeting_records(id) ON DELETE CASCADE,
  video_id UUID REFERENCES public.clipad_videos(id) ON DELETE CASCADE,
  moment_type TEXT NOT NULL CHECK (
    moment_type IN ('DECISION', 'ACTION', 'COMMITMENT', 'QUESTION', 'RISK', 'BLOCKER', 'INSIGHT', 'FOLLOW_UP', 'IMPORTANT_TOPIC', 'AGREEMENT', 'DISAGREEMENT', 'CHANGE')
  ),
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  confidence NUMERIC(3,2) DEFAULT 0.90,
  importance NUMERIC(3,2) DEFAULT 0.50,
  timestamp_start TEXT,
  timestamp_end TEXT,
  speaker_id TEXT,
  speaker_name TEXT,
  status TEXT DEFAULT 'detected' CHECK (
    status IN ('detected', 'confirmed', 'edited', 'dismissed', 'converted')
  ),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  CONSTRAINT clipad_v3_moment_meeting_video_check CHECK (
    meeting_id IS NOT NULL OR video_id IS NOT NULL
  )
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_clipad_v3_moments_meeting ON public.clipad_v3_smart_moments(meeting_id, created_at);
CREATE INDEX IF NOT EXISTS idx_clipad_v3_moments_video ON public.clipad_v3_smart_moments(video_id, created_at);
CREATE INDEX IF NOT EXISTS idx_clipad_v3_moments_comp_type ON public.clipad_v3_smart_moments(company_id, moment_type, status);

-- Enable RLS
ALTER TABLE public.clipad_v3_smart_moments ENABLE ROW LEVEL SECURITY;

-- Multi-Tenant & Permission-Aware RLS Policies
DROP POLICY IF EXISTS clipad_v3_moments_select ON public.clipad_v3_smart_moments;
DROP POLICY IF EXISTS clipad_v3_moments_insert ON public.clipad_v3_smart_moments;
DROP POLICY IF EXISTS clipad_v3_moments_update ON public.clipad_v3_smart_moments;
DROP POLICY IF EXISTS clipad_v3_moments_delete ON public.clipad_v3_smart_moments;

-- SELECT Policy: Inherits tenant, personal, and team space boundaries
DROP POLICY IF EXISTS clipad_v3_moments_select ON public.clipad_v3_smart_moments;
CREATE POLICY clipad_v3_moments_select ON public.clipad_v3_smart_moments
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND (
      team_space_id IS NULL
      OR team_space_id IN (SELECT space_id FROM public.clipad_space_members WHERE user_id = auth.uid())
      OR team_space_id IN (SELECT id FROM public.clipad_spaces WHERE is_private = false OR is_private IS NULL)
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
    )
  );

-- INSERT Policy
DROP POLICY IF EXISTS clipad_v3_moments_insert ON public.clipad_v3_smart_moments;
CREATE POLICY clipad_v3_moments_insert ON public.clipad_v3_smart_moments
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND (
      team_space_id IS NULL
      OR team_space_id IN (SELECT space_id FROM public.clipad_space_members WHERE user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
    )
  );

-- UPDATE Policy: Allows creator, space members, or admins to confirm/edit/dismiss
DROP POLICY IF EXISTS clipad_v3_moments_update ON public.clipad_v3_smart_moments;
CREATE POLICY clipad_v3_moments_update ON public.clipad_v3_smart_moments
  FOR UPDATE USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND (
      created_by = auth.uid()
      OR team_space_id IN (SELECT space_id FROM public.clipad_space_members WHERE user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
    )
  );

-- DELETE Policy
DROP POLICY IF EXISTS clipad_v3_moments_delete ON public.clipad_v3_smart_moments;
CREATE POLICY clipad_v3_moments_delete ON public.clipad_v3_smart_moments
  FOR DELETE USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND (
      created_by = auth.uid()
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
    )
  );
