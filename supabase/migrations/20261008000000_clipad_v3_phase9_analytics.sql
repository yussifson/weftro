-- Migration: Clipad V3 Phase 9 - Analytics, Insights, and Automation
-- Creates tables for Organizational Insights and Automation Rules with strict RLS.

-- 1. Organizational Insights Table
CREATE TABLE IF NOT EXISTS public.clipad_v3_organizational_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    insight_type TEXT NOT NULL, -- RECURRING_PROBLEM, BLOCKER, KNOWLEDGE_GAP, STALE_KNOWLEDGE, EMERGING_TOPIC, RECOMMENDATION
    title TEXT NOT NULL,
    summary TEXT,
    confidence FLOAT DEFAULT 0.0,
    status TEXT DEFAULT 'active', -- active, reviewed, dismissed, resolved
    first_detected_at TIMESTAMPTZ DEFAULT now(),
    last_observed_at TIMESTAMPTZ DEFAULT now(),
    evidence_count INT DEFAULT 1,
    source_ids JSONB DEFAULT '[]'::jsonb, -- array of UUIDs pointing to memories/moments/meetings
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_clipad_v3_insights_company ON public.clipad_v3_organizational_insights(company_id, insight_type, status);

-- 2. Automation Rules Table
CREATE TABLE IF NOT EXISTS public.clipad_v3_automation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    trigger_event TEXT NOT NULL, -- e.g., 'smart_moment.created', 'knowledge.stale'
    conditions JSONB DEFAULT '{}'::jsonb,
    action_type TEXT NOT NULL, -- 'create_recommendation', 'notify_manager'
    action_payload JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_clipad_v3_automation_company ON public.clipad_v3_automation_rules(company_id, is_active, trigger_event);

-- Enable RLS
ALTER TABLE public.clipad_v3_organizational_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clipad_v3_automation_rules ENABLE ROW LEVEL SECURITY;

-- Insights RLS
CREATE POLICY "Users can view company insights"
    ON public.clipad_v3_organizational_insights FOR SELECT
    USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update company insights"
    ON public.clipad_v3_organizational_insights FOR UPDATE
    USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert company insights"
    ON public.clipad_v3_organizational_insights FOR INSERT
    WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- Automation Rules RLS
CREATE POLICY "Users can view company automation rules"
    ON public.clipad_v3_automation_rules FOR SELECT
    USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage company automation rules"
    ON public.clipad_v3_automation_rules FOR ALL
    USING (
        company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()) 
        AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('super_admin', 'admin', 'owner')
    );
