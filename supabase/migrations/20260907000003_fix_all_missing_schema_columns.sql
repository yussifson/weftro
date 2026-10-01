-- ============================================================================
-- Migration: Ensure All Columns & Relations for Real Estate, Leads & Land Management
-- Resolves PGRST204 (Schema cache missing column errors like budget_max, budget_min)
-- ============================================================================

-- 1. Ensure univ_re_leads has all expected columns
CREATE TABLE IF NOT EXISTS public.univ_re_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    phone TEXT,
    source TEXT DEFAULT 'website',
    property_interest TEXT,
    budget_min NUMERIC DEFAULT 0,
    budget_max NUMERIC DEFAULT 0,
    lead_type TEXT DEFAULT 'buyer',
    status TEXT DEFAULT 'new',
    stage TEXT DEFAULT 'awareness',
    assigned_agent_id TEXT,
    lead_score INTEGER DEFAULT 0,
    next_followup TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add any missing columns individually to ensure existing table is fully upgraded
ALTER TABLE public.univ_re_leads ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.univ_re_leads ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE public.univ_re_leads ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.univ_re_leads ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.univ_re_leads ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'website';
ALTER TABLE public.univ_re_leads ADD COLUMN IF NOT EXISTS property_interest TEXT;
ALTER TABLE public.univ_re_leads ADD COLUMN IF NOT EXISTS budget_min NUMERIC DEFAULT 0;
ALTER TABLE public.univ_re_leads ADD COLUMN IF NOT EXISTS budget_max NUMERIC DEFAULT 0;
ALTER TABLE public.univ_re_leads ADD COLUMN IF NOT EXISTS lead_type TEXT DEFAULT 'buyer';
ALTER TABLE public.univ_re_leads ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new';
ALTER TABLE public.univ_re_leads ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT 'awareness';
ALTER TABLE public.univ_re_leads ADD COLUMN IF NOT EXISTS assigned_agent_id TEXT;
ALTER TABLE public.univ_re_leads ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0;
ALTER TABLE public.univ_re_leads ADD COLUMN IF NOT EXISTS next_followup TIMESTAMPTZ;
ALTER TABLE public.univ_re_leads ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.univ_re_leads ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());
ALTER TABLE public.univ_re_leads ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());

-- 2. Ensure univ_re_lead_activities has all expected columns
CREATE TABLE IF NOT EXISTS public.univ_re_lead_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    lead_id UUID,
    activity_type TEXT DEFAULT 'call',
    subject TEXT,
    description TEXT,
    notes TEXT,
    duration_minutes INTEGER DEFAULT 0,
    outcome TEXT,
    next_action TEXT,
    agent_id TEXT,
    logged_by TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.univ_re_lead_activities ADD COLUMN IF NOT EXISTS lead_id UUID;
ALTER TABLE public.univ_re_lead_activities ADD COLUMN IF NOT EXISTS activity_type TEXT DEFAULT 'call';
ALTER TABLE public.univ_re_lead_activities ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE public.univ_re_lead_activities ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.univ_re_lead_activities ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.univ_re_lead_activities ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 0;
ALTER TABLE public.univ_re_lead_activities ADD COLUMN IF NOT EXISTS outcome TEXT;
ALTER TABLE public.univ_re_lead_activities ADD COLUMN IF NOT EXISTS next_action TEXT;
ALTER TABLE public.univ_re_lead_activities ADD COLUMN IF NOT EXISTS agent_id TEXT;
ALTER TABLE public.univ_re_lead_activities ADD COLUMN IF NOT EXISTS logged_by TEXT;
ALTER TABLE public.univ_re_lead_activities ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());
ALTER TABLE public.univ_re_lead_activities ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());

-- 3. Ensure univ_re_clients has all expected columns
ALTER TABLE public.univ_re_clients ADD COLUMN IF NOT EXISTS budget_min NUMERIC DEFAULT 0;
ALTER TABLE public.univ_re_clients ADD COLUMN IF NOT EXISTS budget_max NUMERIC DEFAULT 0;
ALTER TABLE public.univ_re_clients ADD COLUMN IF NOT EXISTS preferred_location TEXT;
ALTER TABLE public.univ_re_clients ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.univ_re_clients ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'direct';

-- 4. Enable RLS and Grant Permissions
ALTER TABLE public.univ_re_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.univ_re_lead_activities ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Company isolation for univ_re_leads" ON public.univ_re_leads;
    CREATE POLICY "Company isolation for univ_re_leads" ON public.univ_re_leads
        FOR ALL USING (company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        ));

    DROP POLICY IF EXISTS "Company isolation for univ_re_lead_activities" ON public.univ_re_lead_activities;
    CREATE POLICY "Company isolation for univ_re_lead_activities" ON public.univ_re_lead_activities
        FOR ALL USING (company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        ));
END $$;

GRANT ALL ON public.univ_re_leads TO authenticated, service_role, anon;
GRANT ALL ON public.univ_re_lead_activities TO authenticated, service_role, anon;

-- Force reload of Supabase PostgREST schema cache
NOTIFY pgrst, 'reload schema';
