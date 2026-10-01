-- Create Missing Real Estate Tables
-- This migration adds all the advanced Real Estate tables that are referenced in AppSchema.js
-- but were missing from the Supabase database

-- ===== COUNTER OFFERS TABLE =====
CREATE TABLE IF NOT EXISTS public.univ_re_counter_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  original_offer_id UUID,
  counter_offer_by TEXT,
  counter_offer_price DECIMAL(15, 2),
  closing_date TIMESTAMPTZ,
  contingencies TEXT,
  inspection_period_days INTEGER,
  appraisal_contingency INTEGER DEFAULT 0,
  financing_contingency INTEGER DEFAULT 0,
  earnest_money_change DECIMAL(15, 2),
  additional_terms TEXT,
  counter_offer_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  responded_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ===== COMMISSION RULES TABLE =====
CREATE TABLE IF NOT EXISTS public.univ_re_commission_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  rule_name TEXT NOT NULL,
  rule_type TEXT,
  property_types TEXT,
  price_range_min DECIMAL(15, 2),
  price_range_max DECIMAL(15, 2),
  commission_percentage DECIMAL(5, 2),
  flat_fee DECIMAL(15, 2),
  tier_config TEXT,
  applies_to_buyer_side INTEGER DEFAULT 1,
  applies_to_seller_side INTEGER DEFAULT 1,
  is_active INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ===== COMMISSION DETAILS TABLE =====
CREATE TABLE IF NOT EXISTS public.univ_re_commission_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  transaction_id UUID,
  commission_rule_id UUID,
  buyer_agent_id TEXT,
  seller_agent_id TEXT,
  sale_price DECIMAL(15, 2),
  buyer_commission_percentage DECIMAL(5, 2),
  seller_commission_percentage DECIMAL(5, 2),
  buyer_commission_amount DECIMAL(15, 2),
  seller_commission_amount DECIMAL(15, 2),
  total_commission DECIMAL(15, 2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ===== TRUST ACCOUNTS TABLE =====
CREATE TABLE IF NOT EXISTS public.univ_re_trust_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_number TEXT,
  bank_name TEXT,
  balance DECIMAL(15, 2) DEFAULT 0,
  account_type TEXT DEFAULT 'checking',
  is_active INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ===== TRUST LEDGER TABLE =====
CREATE TABLE IF NOT EXISTS public.univ_re_trust_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  account_id UUID,
  trust_account_id TEXT,
  transaction_type TEXT,
  amount DECIMAL(15, 2),
  balance_after DECIMAL(15, 2),
  description TEXT,
  reference_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ===== ESCROW ACCOUNTS TABLE =====
CREATE TABLE IF NOT EXISTS public.univ_re_escrow_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  transaction_id UUID,
  escrow_agent_name TEXT,
  escrow_agent_license TEXT,
  deposited_amount DECIMAL(15, 2),
  held_conditions TEXT,
  release_conditions TEXT,
  release_date TIMESTAMPTZ,
  status TEXT DEFAULT 'held',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ===== COMPARABLE PROPERTIES TABLE =====
CREATE TABLE IF NOT EXISTS public.univ_re_comparable_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  property_id UUID,
  comparable_property_id UUID,
  comparable_address TEXT,
  comparable_price DECIMAL(15, 2),
  price_per_sqft DECIMAL(10, 2),
  adjustment_amount DECIMAL(15, 2),
  adjustment_percentage DECIMAL(5, 2),
  comparison_date TIMESTAMPTZ,
  days_on_market INTEGER,
  condition TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ===== MARKET DATA TABLE =====
CREATE TABLE IF NOT EXISTS public.univ_re_market_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  average_price DECIMAL(15, 2),
  median_price DECIMAL(15, 2),
  price_trend DECIMAL(5, 2),
  inventory_count INTEGER,
  days_on_market_average INTEGER,
  market_status TEXT,
  last_updated TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ===== CONTRACTORS TABLE =====
CREATE TABLE IF NOT EXISTS public.univ_re_contractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  contractor_name TEXT NOT NULL,
  specialty TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  license_number TEXT,
  insurance_provider TEXT,
  insurance_expiration DATE,
  rating DECIMAL(3, 2),
  is_active INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ===== CONTRACTOR REVIEWS TABLE =====
CREATE TABLE IF NOT EXISTS public.univ_re_contractor_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  contractor_id UUID,
  property_id UUID,
  transaction_id UUID,
  review_rating INTEGER,
  review_text TEXT,
  review_date TIMESTAMPTZ,
  reviewed_by TEXT,
  quality_score DECIMAL(3, 2),
  timeliness_score DECIMAL(3, 2),
  cost_score DECIMAL(3, 2),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ===== CLIENT SCORING TABLE =====
CREATE TABLE IF NOT EXISTS public.univ_re_client_scoring (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  client_id UUID,
  lead_quality_score DECIMAL(5, 2),
  conversion_probability DECIMAL(5, 2),
  estimated_deal_value DECIMAL(15, 2),
  engagement_level TEXT,
  preferred_properties TEXT,
  last_scored TIMESTAMPTZ,
  scoring_factors JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ===== AGENT METRICS TABLE =====
CREATE TABLE IF NOT EXISTS public.univ_re_agent_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  agent_name TEXT,
  total_sales DECIMAL(15, 2),
  sales_count INTEGER,
  average_sale_price DECIMAL(15, 2),
  commission_earned DECIMAL(15, 2),
  closed_deals INTEGER,
  pending_deals INTEGER,
  client_satisfaction_rating DECIMAL(3, 2),
  response_time_hours DECIMAL(5, 2),
  metric_period TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ===== AGENT RECOMMENDATIONS TABLE =====
CREATE TABLE IF NOT EXISTS public.univ_re_agent_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  client_id UUID,
  recommended_agent_id TEXT,
  recommended_agent_name TEXT,
  recommendation_reason TEXT,
  match_score DECIMAL(5, 2),
  specialization_match TEXT,
  availability_match TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ===== LEASE RENEWALS TABLE =====
CREATE TABLE IF NOT EXISTS public.univ_re_lease_renewals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  original_lease_id UUID,
  renewal_lease_id UUID,
  tenant_id UUID,
  new_start_date DATE,
  new_end_date DATE,
  new_monthly_rent DECIMAL(15, 2),
  rent_increase_amount DECIMAL(15, 2),
  rent_increase_percentage DECIMAL(5, 2),
  status TEXT DEFAULT 'pending',
  renewal_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ===== RENT PAYMENT SCHEDULES TABLE =====
CREATE TABLE IF NOT EXISTS public.univ_re_rent_payment_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  lease_id UUID,
  tenant_id UUID,
  property_id UUID,
  monthly_rent DECIMAL(15, 2),
  due_date_of_month INTEGER,
  schedule_start_date DATE,
  schedule_end_date DATE,
  payment_method TEXT,
  late_fee_amount DECIMAL(15, 2),
  late_fee_percentage DECIMAL(5, 2),
  is_active INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ===== RENT PAYMENT HISTORY TABLE =====
CREATE TABLE IF NOT EXISTS public.univ_re_rent_payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  rental_payment_id UUID,
  payment_date TIMESTAMPTZ,
  amount_paid DECIMAL(15, 2),
  payment_method TEXT,
  receipt_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ===== DOCUMENT TEMPLATES TABLE =====
CREATE TABLE IF NOT EXISTS public.univ_re_document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  template_name TEXT NOT NULL,
  document_type TEXT,
  template_content TEXT,
  placeholder_fields JSONB DEFAULT '[]'::jsonb,
  is_active INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ===== E-SIGNATURES TABLE =====
CREATE TABLE IF NOT EXISTS public.univ_re_e_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  document_id UUID,
  signatory_name TEXT,
  signatory_email TEXT,
  signature_status TEXT DEFAULT 'pending',
  signed_date TIMESTAMPTZ,
  signature_image_url TEXT,
  signing_timestamp TIMESTAMPTZ,
  expiration_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ===== AUDIT LOG TABLE =====
CREATE TABLE IF NOT EXISTS public.univ_re_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  action TEXT,
  entity_type TEXT,
  entity_id UUID,
  user_id TEXT,
  old_value TEXT,
  new_value TEXT,
  timestamp TIMESTAMPTZ DEFAULT now()
);

-- ===== CREATE INDEXES =====
CREATE INDEX IF NOT EXISTS idx_re_counter_offers_company_id ON public.univ_re_counter_offers(company_id);
CREATE INDEX IF NOT EXISTS idx_re_counter_offers_status ON public.univ_re_counter_offers(counter_offer_status);
CREATE INDEX IF NOT EXISTS idx_re_commission_rules_company_id ON public.univ_re_commission_rules(company_id);
CREATE INDEX IF NOT EXISTS idx_re_commission_details_company_id ON public.univ_re_commission_details(company_id);
CREATE INDEX IF NOT EXISTS idx_re_trust_accounts_company_id ON public.univ_re_trust_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_re_trust_ledger_company_id ON public.univ_re_trust_ledger(company_id);
CREATE INDEX IF NOT EXISTS idx_re_trust_ledger_account_id ON public.univ_re_trust_ledger(account_id);
CREATE INDEX IF NOT EXISTS idx_re_escrow_accounts_company_id ON public.univ_re_escrow_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_re_comparable_properties_company_id ON public.univ_re_comparable_properties(company_id);
CREATE INDEX IF NOT EXISTS idx_re_market_data_company_id ON public.univ_re_market_data(company_id);
CREATE INDEX IF NOT EXISTS idx_re_contractors_company_id ON public.univ_re_contractors(company_id);
CREATE INDEX IF NOT EXISTS idx_re_contractor_reviews_company_id ON public.univ_re_contractor_reviews(company_id);
CREATE INDEX IF NOT EXISTS idx_re_client_scoring_company_id ON public.univ_re_client_scoring(company_id);
CREATE INDEX IF NOT EXISTS idx_re_agent_metrics_company_id ON public.univ_re_agent_metrics(company_id);
CREATE INDEX IF NOT EXISTS idx_re_lease_renewals_company_id ON public.univ_re_lease_renewals(company_id);
CREATE INDEX IF NOT EXISTS idx_re_rent_payment_schedules_company_id ON public.univ_re_rent_payment_schedules(company_id);
CREATE INDEX IF NOT EXISTS idx_re_rent_payment_history_company_id ON public.univ_re_rent_payment_history(company_id);
CREATE INDEX IF NOT EXISTS idx_re_document_templates_company_id ON public.univ_re_document_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_re_e_signatures_company_id ON public.univ_re_e_signatures(company_id);
CREATE INDEX IF NOT EXISTS idx_re_audit_log_company_id ON public.univ_re_audit_log(company_id);

-- ===== ENABLE RLS FOR ALL TABLES =====
ALTER TABLE public.univ_re_counter_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.univ_re_commission_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.univ_re_commission_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.univ_re_trust_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.univ_re_trust_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.univ_re_escrow_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.univ_re_comparable_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.univ_re_market_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.univ_re_contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.univ_re_contractor_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.univ_re_client_scoring ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.univ_re_agent_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.univ_re_agent_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.univ_re_lease_renewals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.univ_re_rent_payment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.univ_re_rent_payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.univ_re_document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.univ_re_e_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.univ_re_audit_log ENABLE ROW LEVEL SECURITY;

-- ===== CREATE RLS POLICIES =====
CREATE POLICY "re_counter_offers_company_access" ON public.univ_re_counter_offers
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "re_commission_rules_company_access" ON public.univ_re_commission_rules
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "re_commission_details_company_access" ON public.univ_re_commission_details
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "re_trust_accounts_company_access" ON public.univ_re_trust_accounts
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "re_trust_ledger_company_access" ON public.univ_re_trust_ledger
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "re_escrow_accounts_company_access" ON public.univ_re_escrow_accounts
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "re_comparable_properties_company_access" ON public.univ_re_comparable_properties
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "re_market_data_company_access" ON public.univ_re_market_data
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "re_contractors_company_access" ON public.univ_re_contractors
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "re_contractor_reviews_company_access" ON public.univ_re_contractor_reviews
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "re_client_scoring_company_access" ON public.univ_re_client_scoring
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "re_agent_metrics_company_access" ON public.univ_re_agent_metrics
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "re_agent_recommendations_company_access" ON public.univ_re_agent_recommendations
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "re_lease_renewals_company_access" ON public.univ_re_lease_renewals
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "re_rent_payment_schedules_company_access" ON public.univ_re_rent_payment_schedules
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "re_rent_payment_history_company_access" ON public.univ_re_rent_payment_history
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "re_document_templates_company_access" ON public.univ_re_document_templates
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "re_e_signatures_company_access" ON public.univ_re_e_signatures
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "re_audit_log_company_access" ON public.univ_re_audit_log
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
