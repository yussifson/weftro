-- ============================================================
-- Migration: Sync all missing columns from AppSchema to Supabase
-- Generated: 2026-06-15
-- Safe: All statements use IF NOT EXISTS guards — zero data loss
-- ============================================================

-- ============================================================
-- SECTION 1: CRITICAL FIX — profiles table missing key columns
-- ============================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS industry_type TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ============================================================
-- SECTION 2: CRITICAL FIX — companies table missing key columns
-- ============================================================
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS subdomain TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS logo_light_url TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS favicon_url TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS tagline TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS primary_color TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ============================================================
-- SECTION 3: Tables missing created_at / updated_at timestamps
-- ============================================================
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.case_emails ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.case_emails ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.case_messages ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.case_messages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.case_outcomes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.case_outcomes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.case_pipelines ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.case_pipelines ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.case_pipeline_states ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.case_pipeline_states ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.client_checklists ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.client_checklists ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.client_messages ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.client_messages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.firm_settings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.firm_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.hearings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.hearings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.h_r_complaints ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.h_r_complaints ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.legal_cases ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.legal_cases ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.linked_emails ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.linked_emails ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.payroll_slips ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.payroll_slips ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.retainers ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.retainers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.signature_requests ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.signature_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.staff_permissions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.staff_permissions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.staff_records ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.staff_records ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.module_definitions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.module_definitions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.module_definitions ADD COLUMN IF NOT EXISTS shared_with TEXT;
ALTER TABLE public.field_definitions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.dynamic_records ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.dynamic_records ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.subscription_invoices ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.subscription_invoices ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.time_entries ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.time_entries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.school_students ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.school_students ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.school_classes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.school_classes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.school_sessions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.school_sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.hospital_patients ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.hospital_patients ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.hospital_admissions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.hospital_admissions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.hospital_appointments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.hospital_appointments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.hotel_guests ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.hotel_guests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.hotel_bookings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.hotel_bookings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.hotel_reservations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.hotel_reservations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.insurance_policyholders ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.insurance_policyholders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.insurance_claims ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.insurance_claims ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.insurance_meetings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.insurance_meetings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.retail_customers ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.retail_customers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.retail_orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.retail_orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.retail_shifts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.retail_shifts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.logistics_shippers ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.logistics_shippers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.logistics_shipments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.logistics_shipments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.logistics_dispatches ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.logistics_dispatches ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.hr_projects ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.hr_projects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.hr_interviews ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.hr_interviews ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.online_courses ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.online_courses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.online_lessons ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.online_lessons ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.online_enrollments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.online_enrollments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.online_assessments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.online_assessments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.online_certificates ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.online_certificates ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.connected_apps ADD COLUMN IF NOT EXISTS updated_date TEXT;
ALTER TABLE public.connected_apps ADD COLUMN IF NOT EXISTS created_date TEXT;
ALTER TABLE public.chat_rooms ADD COLUMN IF NOT EXISTS updated_date TEXT;
ALTER TABLE public.chat_rooms ADD COLUMN IF NOT EXISTS created_date TEXT;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS updated_date TEXT;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS created_date TEXT;
ALTER TABLE public.video_rooms ADD COLUMN IF NOT EXISTS created_date TEXT;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS market_tier TEXT;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS updated_date TEXT;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS created_date TEXT;
ALTER TABLE public.company_subscriptions ADD COLUMN IF NOT EXISTS updated_date TEXT;
ALTER TABLE public.company_subscriptions ADD COLUMN IF NOT EXISTS created_date TEXT;
ALTER TABLE public.usage_metrics ADD COLUMN IF NOT EXISTS updated_date TEXT;
ALTER TABLE public.usage_metrics ADD COLUMN IF NOT EXISTS created_date TEXT;
ALTER TABLE public.billing_transactions ADD COLUMN IF NOT EXISTS created_date TEXT;

-- ============================================================
-- SECTION 4: Create missing tables (with RLS)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.sync_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(), table_name TEXT, operation TEXT,
  record_id TEXT, error_code TEXT, error_message TEXT, failed_at TEXT, raw_payload TEXT, acknowledged TEXT
);
ALTER TABLE public.sync_errors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.sync_errors;
CREATE POLICY "Enable all for authenticated users" ON public.sync_errors FOR ALL USING (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS public.automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), created_at TIMESTAMPTZ DEFAULT now(),
  created_date TEXT, updated_date TEXT, created_by TEXT, company_id TEXT,
  table_name TEXT, is_active TEXT, conditions TEXT, action_type TEXT, action_payload TEXT
);
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.automation_rules;
CREATE POLICY "Enable all for authenticated users" ON public.automation_rules FOR ALL USING (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS public.religion_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(), created_date TEXT, updated_date TEXT, created_by TEXT,
  company_id TEXT, name TEXT, email TEXT, phone TEXT, address TEXT, city TEXT, country TEXT,
  id_number TEXT, type TEXT, status TEXT, notes TEXT, total_cases TEXT, total_billed TEXT
);
ALTER TABLE public.religion_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.religion_members;
CREATE POLICY "Enable all for authenticated users" ON public.religion_members FOR ALL USING (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS public.religion_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(), created_date TEXT, updated_date TEXT, created_by TEXT,
  company_id TEXT, title TEXT, description TEXT, case_number TEXT, case_type TEXT,
  client_id TEXT, client_name TEXT, assigned_staff TEXT, assigned_staff_name TEXT,
  start_date TEXT, end_date TEXT, status TEXT, priority TEXT, tags TEXT, notes TEXT
);
ALTER TABLE public.religion_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.religion_groups;
CREATE POLICY "Enable all for authenticated users" ON public.religion_groups FOR ALL USING (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS public.religion_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(), created_date TEXT, updated_date TEXT, created_by TEXT,
  company_id TEXT, title TEXT, date TEXT, time TEXT, venue_name TEXT, case_id TEXT,
  case_title TEXT, staff_name TEXT, staff_email TEXT, outcome TEXT, notes TEXT, status TEXT
);
ALTER TABLE public.religion_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.religion_events;
CREATE POLICY "Enable all for authenticated users" ON public.religion_events FOR ALL USING (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS public.univ_alumnis (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), created_at TIMESTAMPTZ DEFAULT now(), company_id TEXT);
ALTER TABLE public.univ_alumnis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.univ_alumnis;
CREATE POLICY "Enable all for authenticated users" ON public.univ_alumnis FOR ALL USING (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS public.univ_bankreconciliations (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), created_at TIMESTAMPTZ DEFAULT now(), company_id TEXT);
ALTER TABLE public.univ_bankreconciliations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.univ_bankreconciliations;
CREATE POLICY "Enable all for authenticated users" ON public.univ_bankreconciliations FOR ALL USING (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS public.univ_budgetplans (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), created_at TIMESTAMPTZ DEFAULT now(), company_id TEXT);
ALTER TABLE public.univ_budgetplans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.univ_budgetplans;
CREATE POLICY "Enable all for authenticated users" ON public.univ_budgetplans FOR ALL USING (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS public.univ_cashflows (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), created_at TIMESTAMPTZ DEFAULT now(), company_id TEXT);
ALTER TABLE public.univ_cashflows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.univ_cashflows;
CREATE POLICY "Enable all for authenticated users" ON public.univ_cashflows FOR ALL USING (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS public.univ_doctorschedules (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), created_at TIMESTAMPTZ DEFAULT now(), company_id TEXT);
ALTER TABLE public.univ_doctorschedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.univ_doctorschedules;
CREATE POLICY "Enable all for authenticated users" ON public.univ_doctorschedules FOR ALL USING (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS public.univ_enrollments (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), created_at TIMESTAMPTZ DEFAULT now(), company_id TEXT);
ALTER TABLE public.univ_enrollments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.univ_enrollments;
CREATE POLICY "Enable all for authenticated users" ON public.univ_enrollments FOR ALL USING (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS public.univ_examschedules (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), created_at TIMESTAMPTZ DEFAULT now(), company_id TEXT);
ALTER TABLE public.univ_examschedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.univ_examschedules;
CREATE POLICY "Enable all for authenticated users" ON public.univ_examschedules FOR ALL USING (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS public.univ_extracurriculars (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), created_at TIMESTAMPTZ DEFAULT now(), company_id TEXT);
ALTER TABLE public.univ_extracurriculars ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.univ_extracurriculars;
CREATE POLICY "Enable all for authenticated users" ON public.univ_extracurriculars FOR ALL USING (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS public.univ_fixedassets (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), created_at TIMESTAMPTZ DEFAULT now(), company_id TEXT);
ALTER TABLE public.univ_fixedassets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.univ_fixedassets;
CREATE POLICY "Enable all for authenticated users" ON public.univ_fixedassets FOR ALL USING (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS public.univ_librarybooks (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), created_at TIMESTAMPTZ DEFAULT now(), company_id TEXT);
ALTER TABLE public.univ_librarybooks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.univ_librarybooks;
CREATE POLICY "Enable all for authenticated users" ON public.univ_librarybooks FOR ALL USING (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS public.univ_medicalbillings (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), created_at TIMESTAMPTZ DEFAULT now(), company_id TEXT);
ALTER TABLE public.univ_medicalbillings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.univ_medicalbillings;
CREATE POLICY "Enable all for authenticated users" ON public.univ_medicalbillings FOR ALL USING (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS public.univ_purchaseorders (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), created_at TIMESTAMPTZ DEFAULT now(), company_id TEXT);
ALTER TABLE public.univ_purchaseorders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.univ_purchaseorders;
CREATE POLICY "Enable all for authenticated users" ON public.univ_purchaseorders FOR ALL USING (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS public.univ_referrals (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), created_at TIMESTAMPTZ DEFAULT now(), company_id TEXT);
ALTER TABLE public.univ_referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.univ_referrals;
CREATE POLICY "Enable all for authenticated users" ON public.univ_referrals FOR ALL USING (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS public.univ_scholarships (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), created_at TIMESTAMPTZ DEFAULT now(), company_id TEXT);
ALTER TABLE public.univ_scholarships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.univ_scholarships;
CREATE POLICY "Enable all for authenticated users" ON public.univ_scholarships FOR ALL USING (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS public.univ_stockoptions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), created_at TIMESTAMPTZ DEFAULT now(), company_id TEXT);
ALTER TABLE public.univ_stockoptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.univ_stockoptions;
CREATE POLICY "Enable all for authenticated users" ON public.univ_stockoptions FOR ALL USING (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS public.univ_tuitions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), created_at TIMESTAMPTZ DEFAULT now(), company_id TEXT);
ALTER TABLE public.univ_tuitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.univ_tuitions;
CREATE POLICY "Enable all for authenticated users" ON public.univ_tuitions FOR ALL USING (auth.role() = 'authenticated');
