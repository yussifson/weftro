-- ============================================================
-- FIX: Missing RE tables and document_template columns
-- Migration: 20260627000002_fix_missing_re_tables_and_columns.sql
-- ============================================================
-- These tables are used by RealEstateAPI.js but were never
-- created in Supabase (AppSchema had them; DB did not).
-- ============================================================

-- ============================================================
-- 1. univ_re_document_templates: add missing columns
--    Code inserts: content, description (AppSchema had template_content only)
-- ============================================================
ALTER TABLE public.univ_re_document_templates ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE public.univ_re_document_templates ADD COLUMN IF NOT EXISTS description TEXT;

-- ============================================================
-- 2. univ_re_team_members (Team Management feature)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.univ_re_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  user_id TEXT,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT DEFAULT 'agent',
  status TEXT DEFAULT 'active',
  avatar_url TEXT,
  bio TEXT,
  license_number TEXT,
  license_expiry DATE,
  commission_rate DECIMAL(5,2) DEFAULT 0,
  join_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_re_team_members_company ON public.univ_re_team_members(company_id);
ALTER TABLE public.univ_re_team_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "re_team_members_all_access" ON public.univ_re_team_members;
CREATE POLICY "re_team_members_all_access" ON public.univ_re_team_members
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));
GRANT ALL ON public.univ_re_team_members TO authenticated, service_role;

-- ============================================================
-- 3. univ_re_mls_listings (Market Intelligence / MLS feature)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.univ_re_mls_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  mls_id TEXT,
  property_address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  price DECIMAL(15,2),
  list_date DATE,
  sold_date DATE,
  days_on_market INTEGER DEFAULT 0,
  bedrooms INTEGER,
  bathrooms DECIMAL(4,1),
  square_feet DECIMAL(10,2),
  lot_size DECIMAL(10,2),
  property_type TEXT,
  status TEXT DEFAULT 'active',
  agent_name TEXT,
  brokerage TEXT,
  description TEXT,
  source TEXT DEFAULT 'mls',
  last_updated TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_re_mls_listings_company ON public.univ_re_mls_listings(company_id);
ALTER TABLE public.univ_re_mls_listings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "re_mls_listings_all_access" ON public.univ_re_mls_listings;
CREATE POLICY "re_mls_listings_all_access" ON public.univ_re_mls_listings
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));
GRANT ALL ON public.univ_re_mls_listings TO authenticated, service_role;

-- ============================================================
-- 4. univ_re_comparable_analysis (CMA feature)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.univ_re_comparable_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  property_id UUID,
  analysis_date DATE,
  subject_address TEXT,
  subject_price DECIMAL(15,2),
  comparable_1_address TEXT,
  comparable_1_price DECIMAL(15,2),
  comparable_1_adjustment DECIMAL(15,2),
  comparable_2_address TEXT,
  comparable_2_price DECIMAL(15,2),
  comparable_2_adjustment DECIMAL(15,2),
  comparable_3_address TEXT,
  comparable_3_price DECIMAL(15,2),
  comparable_3_adjustment DECIMAL(15,2),
  estimated_value DECIMAL(15,2),
  confidence_level INTEGER DEFAULT 80,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_re_comparable_analysis_company ON public.univ_re_comparable_analysis(company_id);
ALTER TABLE public.univ_re_comparable_analysis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "re_comparable_analysis_all_access" ON public.univ_re_comparable_analysis;
CREATE POLICY "re_comparable_analysis_all_access" ON public.univ_re_comparable_analysis
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));
GRANT ALL ON public.univ_re_comparable_analysis TO authenticated, service_role;

-- ============================================================
-- 5. univ_re_market_trends (Market Intelligence feature)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.univ_re_market_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  city TEXT,
  state TEXT,
  metric_date DATE,
  avg_price DECIMAL(15,2),
  median_price DECIMAL(15,2),
  avg_days_on_market INTEGER,
  total_listings INTEGER,
  sold_listings INTEGER,
  absorption_rate DECIMAL(5,2),
  price_per_sqft DECIMAL(10,2),
  yoy_price_change DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_re_market_trends_company ON public.univ_re_market_trends(company_id);
ALTER TABLE public.univ_re_market_trends ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "re_market_trends_all_access" ON public.univ_re_market_trends;
CREATE POLICY "re_market_trends_all_access" ON public.univ_re_market_trends
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));
GRANT ALL ON public.univ_re_market_trends TO authenticated, service_role;

-- ============================================================
-- 6. univ_re_leads (CRM Lead Management)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.univ_re_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  source TEXT DEFAULT 'website',
  property_interest TEXT,
  budget_min DECIMAL(15,2),
  budget_max DECIMAL(15,2),
  lead_type TEXT DEFAULT 'buyer',
  status TEXT DEFAULT 'new',
  stage TEXT DEFAULT 'awareness',
  assigned_agent_id TEXT,
  lead_score INTEGER DEFAULT 0,
  next_followup TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_re_leads_company ON public.univ_re_leads(company_id);
ALTER TABLE public.univ_re_leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "re_leads_all_access" ON public.univ_re_leads;
CREATE POLICY "re_leads_all_access" ON public.univ_re_leads
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));
GRANT ALL ON public.univ_re_leads TO authenticated, service_role;

-- ============================================================
-- 7. univ_re_lead_activities (CRM Lead Activity Tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.univ_re_lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  lead_id UUID,
  activity_type TEXT,
  subject TEXT,
  description TEXT,
  outcome TEXT,
  next_action TEXT,
  next_action_date TIMESTAMPTZ,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.univ_re_lead_activities ADD COLUMN IF NOT EXISTS lead_id UUID;

CREATE INDEX IF NOT EXISTS idx_re_lead_activities_company ON public.univ_re_lead_activities(company_id);
CREATE INDEX IF NOT EXISTS idx_re_lead_activities_lead ON public.univ_re_lead_activities(lead_id);
ALTER TABLE public.univ_re_lead_activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "re_lead_activities_all_access" ON public.univ_re_lead_activities;
CREATE POLICY "re_lead_activities_all_access" ON public.univ_re_lead_activities
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));
GRANT ALL ON public.univ_re_lead_activities TO authenticated, service_role;

-- ============================================================
-- 8. Add all new tables to PowerSync publication
-- ============================================================
DO $pub$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'univ_re_team_members','univ_re_mls_listings','univ_re_comparable_analysis',
    'univ_re_market_trends','univ_re_leads','univ_re_lead_activities'
  ];
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'powersync') THEN
    FOREACH t IN ARRAY tables LOOP
      BEGIN
        EXECUTE format('ALTER PUBLICATION powersync ADD TABLE public.%I', t);
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
    END LOOP;
  END IF;
END $pub$;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
