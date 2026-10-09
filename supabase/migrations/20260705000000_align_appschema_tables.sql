-- Migration for missing DB tables

CREATE TABLE IF NOT EXISTS public.automation_dlq (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.automation_dlq ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "automation_dlq_all_access" ON public.automation_dlq;

DROP POLICY IF EXISTS "automation_dlq_all_access" ON public.automation_dlq;
CREATE POLICY "automation_dlq_all_access" ON public.automation_dlq
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.automation_dlq TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.automation_rule_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.automation_rule_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "automation_rule_versions_all_access" ON public.automation_rule_versions;

DROP POLICY IF EXISTS "automation_rule_versions_all_access" ON public.automation_rule_versions;
CREATE POLICY "automation_rule_versions_all_access" ON public.automation_rule_versions
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.automation_rule_versions TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.univ_opd_queues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.univ_opd_queues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "univ_opd_queues_all_access" ON public.univ_opd_queues;

DROP POLICY IF EXISTS "univ_opd_queues_all_access" ON public.univ_opd_queues;
CREATE POLICY "univ_opd_queues_all_access" ON public.univ_opd_queues
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.univ_opd_queues TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.insurance_underwriting (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.insurance_underwriting ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "insurance_underwriting_all_access" ON public.insurance_underwriting;

DROP POLICY IF EXISTS "insurance_underwriting_all_access" ON public.insurance_underwriting;
CREATE POLICY "insurance_underwriting_all_access" ON public.insurance_underwriting
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.insurance_underwriting TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.insurance_reinsurance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.insurance_reinsurance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "insurance_reinsurance_all_access" ON public.insurance_reinsurance;

DROP POLICY IF EXISTS "insurance_reinsurance_all_access" ON public.insurance_reinsurance;
CREATE POLICY "insurance_reinsurance_all_access" ON public.insurance_reinsurance
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.insurance_reinsurance TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.insurance_agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.insurance_agents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "insurance_agents_all_access" ON public.insurance_agents;

DROP POLICY IF EXISTS "insurance_agents_all_access" ON public.insurance_agents;
CREATE POLICY "insurance_agents_all_access" ON public.insurance_agents
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.insurance_agents TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.insurance_premiums (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.insurance_premiums ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "insurance_premiums_all_access" ON public.insurance_premiums;

DROP POLICY IF EXISTS "insurance_premiums_all_access" ON public.insurance_premiums;
CREATE POLICY "insurance_premiums_all_access" ON public.insurance_premiums
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.insurance_premiums TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.retail_cash_drawers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.retail_cash_drawers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "retail_cash_drawers_all_access" ON public.retail_cash_drawers;

DROP POLICY IF EXISTS "retail_cash_drawers_all_access" ON public.retail_cash_drawers;
CREATE POLICY "retail_cash_drawers_all_access" ON public.retail_cash_drawers
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.retail_cash_drawers TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.univ_imaging (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.univ_imaging ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "univ_imaging_all_access" ON public.univ_imaging;

DROP POLICY IF EXISTS "univ_imaging_all_access" ON public.univ_imaging;
CREATE POLICY "univ_imaging_all_access" ON public.univ_imaging
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.univ_imaging TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.logistics_warehouse_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.logistics_warehouse_inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "logistics_warehouse_inventory_all_access" ON public.logistics_warehouse_inventory;

DROP POLICY IF EXISTS "logistics_warehouse_inventory_all_access" ON public.logistics_warehouse_inventory;
CREATE POLICY "logistics_warehouse_inventory_all_access" ON public.logistics_warehouse_inventory
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.logistics_warehouse_inventory TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.logistics_warehouse_scans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.logistics_warehouse_scans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "logistics_warehouse_scans_all_access" ON public.logistics_warehouse_scans;

DROP POLICY IF EXISTS "logistics_warehouse_scans_all_access" ON public.logistics_warehouse_scans;
CREATE POLICY "logistics_warehouse_scans_all_access" ON public.logistics_warehouse_scans
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.logistics_warehouse_scans TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.logistics_loads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.logistics_loads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "logistics_loads_all_access" ON public.logistics_loads;

DROP POLICY IF EXISTS "logistics_loads_all_access" ON public.logistics_loads;
CREATE POLICY "logistics_loads_all_access" ON public.logistics_loads
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.logistics_loads TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.logistics_load_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.logistics_load_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "logistics_load_matches_all_access" ON public.logistics_load_matches;

DROP POLICY IF EXISTS "logistics_load_matches_all_access" ON public.logistics_load_matches;
CREATE POLICY "logistics_load_matches_all_access" ON public.logistics_load_matches
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.logistics_load_matches TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.logistics_routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.logistics_routes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "logistics_routes_all_access" ON public.logistics_routes;

DROP POLICY IF EXISTS "logistics_routes_all_access" ON public.logistics_routes;
CREATE POLICY "logistics_routes_all_access" ON public.logistics_routes
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.logistics_routes TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.logistics_route_stops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.logistics_route_stops ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "logistics_route_stops_all_access" ON public.logistics_route_stops;

DROP POLICY IF EXISTS "logistics_route_stops_all_access" ON public.logistics_route_stops;
CREATE POLICY "logistics_route_stops_all_access" ON public.logistics_route_stops
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.logistics_route_stops TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.logistics_smart_docs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.logistics_smart_docs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "logistics_smart_docs_all_access" ON public.logistics_smart_docs;

DROP POLICY IF EXISTS "logistics_smart_docs_all_access" ON public.logistics_smart_docs;
CREATE POLICY "logistics_smart_docs_all_access" ON public.logistics_smart_docs
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.logistics_smart_docs TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.logistics_geofences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.logistics_geofences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "logistics_geofences_all_access" ON public.logistics_geofences;

DROP POLICY IF EXISTS "logistics_geofences_all_access" ON public.logistics_geofences;
CREATE POLICY "logistics_geofences_all_access" ON public.logistics_geofences
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.logistics_geofences TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.logistics_geofence_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.logistics_geofence_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "logistics_geofence_logs_all_access" ON public.logistics_geofence_logs;

DROP POLICY IF EXISTS "logistics_geofence_logs_all_access" ON public.logistics_geofence_logs;
CREATE POLICY "logistics_geofence_logs_all_access" ON public.logistics_geofence_logs
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.logistics_geofence_logs TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.online_assessment_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.online_assessment_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "online_assessment_results_all_access" ON public.online_assessment_results;

DROP POLICY IF EXISTS "online_assessment_results_all_access" ON public.online_assessment_results;
CREATE POLICY "online_assessment_results_all_access" ON public.online_assessment_results
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.online_assessment_results TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.online_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.online_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "online_notes_all_access" ON public.online_notes;

DROP POLICY IF EXISTS "online_notes_all_access" ON public.online_notes;
CREATE POLICY "online_notes_all_access" ON public.online_notes
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.online_notes TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.platform_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.platform_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_roles_all_access" ON public.platform_roles;

DROP POLICY IF EXISTS "platform_roles_all_access" ON public.platform_roles;
CREATE POLICY "platform_roles_all_access" ON public.platform_roles
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.platform_roles TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.platform_role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.platform_role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_role_permissions_all_access" ON public.platform_role_permissions;

DROP POLICY IF EXISTS "platform_role_permissions_all_access" ON public.platform_role_permissions;
CREATE POLICY "platform_role_permissions_all_access" ON public.platform_role_permissions
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.platform_role_permissions TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.platform_departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.platform_departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_departments_all_access" ON public.platform_departments;

DROP POLICY IF EXISTS "platform_departments_all_access" ON public.platform_departments;
CREATE POLICY "platform_departments_all_access" ON public.platform_departments
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.platform_departments TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.univ_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.univ_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "univ_roles_all_access" ON public.univ_roles;

DROP POLICY IF EXISTS "univ_roles_all_access" ON public.univ_roles;
CREATE POLICY "univ_roles_all_access" ON public.univ_roles
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.univ_roles TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.univ_case_deadlines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.univ_case_deadlines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "univ_case_deadlines_all_access" ON public.univ_case_deadlines;

DROP POLICY IF EXISTS "univ_case_deadlines_all_access" ON public.univ_case_deadlines;
CREATE POLICY "univ_case_deadlines_all_access" ON public.univ_case_deadlines
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.univ_case_deadlines TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.univ_trust_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.univ_trust_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "univ_trust_transactions_all_access" ON public.univ_trust_transactions;

DROP POLICY IF EXISTS "univ_trust_transactions_all_access" ON public.univ_trust_transactions;
CREATE POLICY "univ_trust_transactions_all_access" ON public.univ_trust_transactions
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.univ_trust_transactions TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.univ_hr_departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.univ_hr_departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "univ_hr_departments_all_access" ON public.univ_hr_departments;

DROP POLICY IF EXISTS "univ_hr_departments_all_access" ON public.univ_hr_departments;
CREATE POLICY "univ_hr_departments_all_access" ON public.univ_hr_departments
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.univ_hr_departments TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.univ_hr_payroll (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.univ_hr_payroll ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "univ_hr_payroll_all_access" ON public.univ_hr_payroll;

DROP POLICY IF EXISTS "univ_hr_payroll_all_access" ON public.univ_hr_payroll;
CREATE POLICY "univ_hr_payroll_all_access" ON public.univ_hr_payroll
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.univ_hr_payroll TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.univ_hr_leave (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.univ_hr_leave ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "univ_hr_leave_all_access" ON public.univ_hr_leave;

DROP POLICY IF EXISTS "univ_hr_leave_all_access" ON public.univ_hr_leave;
CREATE POLICY "univ_hr_leave_all_access" ON public.univ_hr_leave
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.univ_hr_leave TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.univ_hr_recruitment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.univ_hr_recruitment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "univ_hr_recruitment_all_access" ON public.univ_hr_recruitment;

DROP POLICY IF EXISTS "univ_hr_recruitment_all_access" ON public.univ_hr_recruitment;
CREATE POLICY "univ_hr_recruitment_all_access" ON public.univ_hr_recruitment
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.univ_hr_recruitment TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.univ_hr_candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.univ_hr_candidates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "univ_hr_candidates_all_access" ON public.univ_hr_candidates;

DROP POLICY IF EXISTS "univ_hr_candidates_all_access" ON public.univ_hr_candidates;
CREATE POLICY "univ_hr_candidates_all_access" ON public.univ_hr_candidates
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.univ_hr_candidates TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.univ_hr_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.univ_hr_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "univ_hr_attendance_all_access" ON public.univ_hr_attendance;

DROP POLICY IF EXISTS "univ_hr_attendance_all_access" ON public.univ_hr_attendance;
CREATE POLICY "univ_hr_attendance_all_access" ON public.univ_hr_attendance
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.univ_hr_attendance TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.univ_reinsurance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.univ_reinsurance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "univ_reinsurance_all_access" ON public.univ_reinsurance;

DROP POLICY IF EXISTS "univ_reinsurance_all_access" ON public.univ_reinsurance;
CREATE POLICY "univ_reinsurance_all_access" ON public.univ_reinsurance
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.univ_reinsurance TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.univ_medicalclaims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.univ_medicalclaims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "univ_medicalclaims_all_access" ON public.univ_medicalclaims;

DROP POLICY IF EXISTS "univ_medicalclaims_all_access" ON public.univ_medicalclaims;
CREATE POLICY "univ_medicalclaims_all_access" ON public.univ_medicalclaims
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.univ_medicalclaims TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.univ_surgeries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.univ_surgeries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "univ_surgeries_all_access" ON public.univ_surgeries;

DROP POLICY IF EXISTS "univ_surgeries_all_access" ON public.univ_surgeries;
CREATE POLICY "univ_surgeries_all_access" ON public.univ_surgeries
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.univ_surgeries TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.univ_ambulance_dispatch (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.univ_ambulance_dispatch ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "univ_ambulance_dispatch_all_access" ON public.univ_ambulance_dispatch;

DROP POLICY IF EXISTS "univ_ambulance_dispatch_all_access" ON public.univ_ambulance_dispatch;
CREATE POLICY "univ_ambulance_dispatch_all_access" ON public.univ_ambulance_dispatch
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.univ_ambulance_dispatch TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.vehicle_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.vehicle_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vehicle_registrations_all_access" ON public.vehicle_registrations;

DROP POLICY IF EXISTS "vehicle_registrations_all_access" ON public.vehicle_registrations;
CREATE POLICY "vehicle_registrations_all_access" ON public.vehicle_registrations
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.vehicle_registrations TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.vehicle_insurance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.vehicle_insurance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vehicle_insurance_all_access" ON public.vehicle_insurance;

DROP POLICY IF EXISTS "vehicle_insurance_all_access" ON public.vehicle_insurance;
CREATE POLICY "vehicle_insurance_all_access" ON public.vehicle_insurance
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.vehicle_insurance TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.vehicle_licenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.vehicle_licenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vehicle_licenses_all_access" ON public.vehicle_licenses;

DROP POLICY IF EXISTS "vehicle_licenses_all_access" ON public.vehicle_licenses;
CREATE POLICY "vehicle_licenses_all_access" ON public.vehicle_licenses
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.vehicle_licenses TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.vehicle_service_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.vehicle_service_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vehicle_service_records_all_access" ON public.vehicle_service_records;

DROP POLICY IF EXISTS "vehicle_service_records_all_access" ON public.vehicle_service_records;
CREATE POLICY "vehicle_service_records_all_access" ON public.vehicle_service_records
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.vehicle_service_records TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.maintenance_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.maintenance_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "maintenance_schedules_all_access" ON public.maintenance_schedules;

DROP POLICY IF EXISTS "maintenance_schedules_all_access" ON public.maintenance_schedules;
CREATE POLICY "maintenance_schedules_all_access" ON public.maintenance_schedules
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.maintenance_schedules TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.preventive_maintenance_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.preventive_maintenance_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "preventive_maintenance_plans_all_access" ON public.preventive_maintenance_plans;

DROP POLICY IF EXISTS "preventive_maintenance_plans_all_access" ON public.preventive_maintenance_plans;
CREATE POLICY "preventive_maintenance_plans_all_access" ON public.preventive_maintenance_plans
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.preventive_maintenance_plans TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.vehicle_breakdowns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.vehicle_breakdowns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vehicle_breakdowns_all_access" ON public.vehicle_breakdowns;

DROP POLICY IF EXISTS "vehicle_breakdowns_all_access" ON public.vehicle_breakdowns;
CREATE POLICY "vehicle_breakdowns_all_access" ON public.vehicle_breakdowns
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.vehicle_breakdowns TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.tire_management (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.tire_management ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tire_management_all_access" ON public.tire_management;

DROP POLICY IF EXISTS "tire_management_all_access" ON public.tire_management;
CREATE POLICY "tire_management_all_access" ON public.tire_management
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.tire_management TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.fuel_management (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.fuel_management ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fuel_management_all_access" ON public.fuel_management;

DROP POLICY IF EXISTS "fuel_management_all_access" ON public.fuel_management;
CREATE POLICY "fuel_management_all_access" ON public.fuel_management
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.fuel_management TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.spare_parts_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.spare_parts_inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "spare_parts_inventory_all_access" ON public.spare_parts_inventory;

DROP POLICY IF EXISTS "spare_parts_inventory_all_access" ON public.spare_parts_inventory;
CREATE POLICY "spare_parts_inventory_all_access" ON public.spare_parts_inventory
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.spare_parts_inventory TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.asset_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.asset_tracking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "asset_tracking_all_access" ON public.asset_tracking;

DROP POLICY IF EXISTS "asset_tracking_all_access" ON public.asset_tracking;
CREATE POLICY "asset_tracking_all_access" ON public.asset_tracking
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.asset_tracking TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.vehicle_utilization (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.vehicle_utilization ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vehicle_utilization_all_access" ON public.vehicle_utilization;

DROP POLICY IF EXISTS "vehicle_utilization_all_access" ON public.vehicle_utilization;
CREATE POLICY "vehicle_utilization_all_access" ON public.vehicle_utilization
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.vehicle_utilization TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.vehicle_downtime (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.vehicle_downtime ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vehicle_downtime_all_access" ON public.vehicle_downtime;

DROP POLICY IF EXISTS "vehicle_downtime_all_access" ON public.vehicle_downtime;
CREATE POLICY "vehicle_downtime_all_access" ON public.vehicle_downtime
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.vehicle_downtime TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.vehicle_inspections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.vehicle_inspections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vehicle_inspections_all_access" ON public.vehicle_inspections;

DROP POLICY IF EXISTS "vehicle_inspections_all_access" ON public.vehicle_inspections;
CREATE POLICY "vehicle_inspections_all_access" ON public.vehicle_inspections
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.vehicle_inspections TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.univ_medical_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.univ_medical_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "univ_medical_history_all_access" ON public.univ_medical_history;

DROP POLICY IF EXISTS "univ_medical_history_all_access" ON public.univ_medical_history;
CREATE POLICY "univ_medical_history_all_access" ON public.univ_medical_history
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.univ_medical_history TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.workspace_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.workspace_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workspace_insights_all_access" ON public.workspace_insights;

DROP POLICY IF EXISTS "workspace_insights_all_access" ON public.workspace_insights;
CREATE POLICY "workspace_insights_all_access" ON public.workspace_insights
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.workspace_insights TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.intelligence_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.intelligence_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "intelligence_runs_all_access" ON public.intelligence_runs;

DROP POLICY IF EXISTS "intelligence_runs_all_access" ON public.intelligence_runs;
CREATE POLICY "intelligence_runs_all_access" ON public.intelligence_runs
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.intelligence_runs TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.entity_intelligence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.entity_intelligence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "entity_intelligence_all_access" ON public.entity_intelligence;

DROP POLICY IF EXISTS "entity_intelligence_all_access" ON public.entity_intelligence;
CREATE POLICY "entity_intelligence_all_access" ON public.entity_intelligence
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.entity_intelligence TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.insight_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.insight_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "insight_feedback_all_access" ON public.insight_feedback;

DROP POLICY IF EXISTS "insight_feedback_all_access" ON public.insight_feedback;
CREATE POLICY "insight_feedback_all_access" ON public.insight_feedback
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.insight_feedback TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.engine_accuracy (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.engine_accuracy ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "engine_accuracy_all_access" ON public.engine_accuracy;

DROP POLICY IF EXISTS "engine_accuracy_all_access" ON public.engine_accuracy;
CREATE POLICY "engine_accuracy_all_access" ON public.engine_accuracy
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.engine_accuracy TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.component_registry (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.component_registry ENABLE ROW LEVEL SECURITY;

-- DROP POLICY IF EXISTS "component_registry_all_access" ON public.component_registry;
-- CREATE POLICY "component_registry_all_access" ON public.component_registry
--   FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
--   WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.component_registry TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.industry_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.industry_templates ENABLE ROW LEVEL SECURITY;

-- DROP POLICY IF EXISTS "industry_templates_all_access" ON public.industry_templates;
-- CREATE POLICY "industry_templates_all_access" ON public.industry_templates
--   FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
--   WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.industry_templates TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.workspace_modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.workspace_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workspace_modules_all_access" ON public.workspace_modules;

DROP POLICY IF EXISTS "workspace_modules_all_access" ON public.workspace_modules;
CREATE POLICY "workspace_modules_all_access" ON public.workspace_modules
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.workspace_modules TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.marketplace_review_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.marketplace_review_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "marketplace_review_requests_all_access" ON public.marketplace_review_requests;

DROP POLICY IF EXISTS "marketplace_review_requests_all_access" ON public.marketplace_review_requests;
CREATE POLICY "marketplace_review_requests_all_access" ON public.marketplace_review_requests
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.marketplace_review_requests TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.uni_departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.uni_departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "uni_departments_all_access" ON public.uni_departments;

DROP POLICY IF EXISTS "uni_departments_all_access" ON public.uni_departments;
CREATE POLICY "uni_departments_all_access" ON public.uni_departments
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.uni_departments TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.uni_programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.uni_programs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "uni_programs_all_access" ON public.uni_programs;

DROP POLICY IF EXISTS "uni_programs_all_access" ON public.uni_programs;
CREATE POLICY "uni_programs_all_access" ON public.uni_programs
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.uni_programs TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.uni_staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.uni_staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "uni_staff_all_access" ON public.uni_staff;

DROP POLICY IF EXISTS "uni_staff_all_access" ON public.uni_staff;
CREATE POLICY "uni_staff_all_access" ON public.uni_staff
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.uni_staff TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.uni_students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.uni_students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "uni_students_all_access" ON public.uni_students;

DROP POLICY IF EXISTS "uni_students_all_access" ON public.uni_students;
CREATE POLICY "uni_students_all_access" ON public.uni_students
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.uni_students TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.uni_courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.uni_courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "uni_courses_all_access" ON public.uni_courses;

DROP POLICY IF EXISTS "uni_courses_all_access" ON public.uni_courses;
CREATE POLICY "uni_courses_all_access" ON public.uni_courses
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.uni_courses TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.uni_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.uni_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "uni_enrollments_all_access" ON public.uni_enrollments;

DROP POLICY IF EXISTS "uni_enrollments_all_access" ON public.uni_enrollments;
CREATE POLICY "uni_enrollments_all_access" ON public.uni_enrollments
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.uni_enrollments TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.uni_lms_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.uni_lms_materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "uni_lms_materials_all_access" ON public.uni_lms_materials;

DROP POLICY IF EXISTS "uni_lms_materials_all_access" ON public.uni_lms_materials;
CREATE POLICY "uni_lms_materials_all_access" ON public.uni_lms_materials
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.uni_lms_materials TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.uni_lms_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.uni_lms_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "uni_lms_assignments_all_access" ON public.uni_lms_assignments;

DROP POLICY IF EXISTS "uni_lms_assignments_all_access" ON public.uni_lms_assignments;
CREATE POLICY "uni_lms_assignments_all_access" ON public.uni_lms_assignments
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.uni_lms_assignments TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.uni_lms_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.uni_lms_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "uni_lms_submissions_all_access" ON public.uni_lms_submissions;

DROP POLICY IF EXISTS "uni_lms_submissions_all_access" ON public.uni_lms_submissions;
CREATE POLICY "uni_lms_submissions_all_access" ON public.uni_lms_submissions
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.uni_lms_submissions TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.uni_exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.uni_exams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "uni_exams_all_access" ON public.uni_exams;

DROP POLICY IF EXISTS "uni_exams_all_access" ON public.uni_exams;
CREATE POLICY "uni_exams_all_access" ON public.uni_exams
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.uni_exams TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.uni_grades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.uni_grades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "uni_grades_all_access" ON public.uni_grades;

DROP POLICY IF EXISTS "uni_grades_all_access" ON public.uni_grades;
CREATE POLICY "uni_grades_all_access" ON public.uni_grades
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.uni_grades TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.uni_applicants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.uni_applicants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "uni_applicants_all_access" ON public.uni_applicants;

DROP POLICY IF EXISTS "uni_applicants_all_access" ON public.uni_applicants;
CREATE POLICY "uni_applicants_all_access" ON public.uni_applicants
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.uni_applicants TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.uni_fees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.uni_fees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "uni_fees_all_access" ON public.uni_fees;

DROP POLICY IF EXISTS "uni_fees_all_access" ON public.uni_fees;
CREATE POLICY "uni_fees_all_access" ON public.uni_fees
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.uni_fees TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.uni_hostel_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.uni_hostel_rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "uni_hostel_rooms_all_access" ON public.uni_hostel_rooms;

DROP POLICY IF EXISTS "uni_hostel_rooms_all_access" ON public.uni_hostel_rooms;
CREATE POLICY "uni_hostel_rooms_all_access" ON public.uni_hostel_rooms
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.uni_hostel_rooms TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.uni_library_books (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.uni_library_books ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "uni_library_books_all_access" ON public.uni_library_books;

DROP POLICY IF EXISTS "uni_library_books_all_access" ON public.uni_library_books;
CREATE POLICY "uni_library_books_all_access" ON public.uni_library_books
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.uni_library_books TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.uni_research_grants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.uni_research_grants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "uni_research_grants_all_access" ON public.uni_research_grants;

DROP POLICY IF EXISTS "uni_research_grants_all_access" ON public.uni_research_grants;
CREATE POLICY "uni_research_grants_all_access" ON public.uni_research_grants
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.uni_research_grants TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.uni_alumni (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.uni_alumni ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "uni_alumni_all_access" ON public.uni_alumni;

DROP POLICY IF EXISTS "uni_alumni_all_access" ON public.uni_alumni;
CREATE POLICY "uni_alumni_all_access" ON public.uni_alumni
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.uni_alumni TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.revenue_forecasts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.revenue_forecasts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "revenue_forecasts_all_access" ON public.revenue_forecasts;

DROP POLICY IF EXISTS "revenue_forecasts_all_access" ON public.revenue_forecasts;
CREATE POLICY "revenue_forecasts_all_access" ON public.revenue_forecasts
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.revenue_forecasts TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.univ_feature_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.univ_feature_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "univ_feature_requests_all_access" ON public.univ_feature_requests;

DROP POLICY IF EXISTS "univ_feature_requests_all_access" ON public.univ_feature_requests;
CREATE POLICY "univ_feature_requests_all_access" ON public.univ_feature_requests
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.univ_feature_requests TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.univ_feature_announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.univ_feature_announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "univ_feature_announcements_all_access" ON public.univ_feature_announcements;

DROP POLICY IF EXISTS "univ_feature_announcements_all_access" ON public.univ_feature_announcements;
CREATE POLICY "univ_feature_announcements_all_access" ON public.univ_feature_announcements
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.univ_feature_announcements TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.univ_company_feature_decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.univ_company_feature_decisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "univ_company_feature_decisions_all_access" ON public.univ_company_feature_decisions;

DROP POLICY IF EXISTS "univ_company_feature_decisions_all_access" ON public.univ_company_feature_decisions;
CREATE POLICY "univ_company_feature_decisions_all_access" ON public.univ_company_feature_decisions
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.univ_company_feature_decisions TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.optavel_deal_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.optavel_deal_rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "optavel_deal_rooms_all_access" ON public.optavel_deal_rooms;

DROP POLICY IF EXISTS "optavel_deal_rooms_all_access" ON public.optavel_deal_rooms;
CREATE POLICY "optavel_deal_rooms_all_access" ON public.optavel_deal_rooms
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.optavel_deal_rooms TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.optavel_okrs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.optavel_okrs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "optavel_okrs_all_access" ON public.optavel_okrs;

DROP POLICY IF EXISTS "optavel_okrs_all_access" ON public.optavel_okrs;
CREATE POLICY "optavel_okrs_all_access" ON public.optavel_okrs
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.optavel_okrs TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.optavel_decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.optavel_decisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "optavel_decisions_all_access" ON public.optavel_decisions;

DROP POLICY IF EXISTS "optavel_decisions_all_access" ON public.optavel_decisions;
CREATE POLICY "optavel_decisions_all_access" ON public.optavel_decisions
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.optavel_decisions TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.optavel_commissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.optavel_commissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "optavel_commissions_all_access" ON public.optavel_commissions;

DROP POLICY IF EXISTS "optavel_commissions_all_access" ON public.optavel_commissions;
CREATE POLICY "optavel_commissions_all_access" ON public.optavel_commissions
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.optavel_commissions TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.optavel_cap_table (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.optavel_cap_table ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "optavel_cap_table_all_access" ON public.optavel_cap_table;

DROP POLICY IF EXISTS "optavel_cap_table_all_access" ON public.optavel_cap_table;
CREATE POLICY "optavel_cap_table_all_access" ON public.optavel_cap_table
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.optavel_cap_table TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.optavel_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.optavel_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "optavel_campaigns_all_access" ON public.optavel_campaigns;

DROP POLICY IF EXISTS "optavel_campaigns_all_access" ON public.optavel_campaigns;
CREATE POLICY "optavel_campaigns_all_access" ON public.optavel_campaigns
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.optavel_campaigns TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.optavel_marketing_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.optavel_marketing_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "optavel_marketing_reports_all_access" ON public.optavel_marketing_reports;

DROP POLICY IF EXISTS "optavel_marketing_reports_all_access" ON public.optavel_marketing_reports;
CREATE POLICY "optavel_marketing_reports_all_access" ON public.optavel_marketing_reports
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.optavel_marketing_reports TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.optavel_seo_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.optavel_seo_tracking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "optavel_seo_tracking_all_access" ON public.optavel_seo_tracking;

DROP POLICY IF EXISTS "optavel_seo_tracking_all_access" ON public.optavel_seo_tracking;
CREATE POLICY "optavel_seo_tracking_all_access" ON public.optavel_seo_tracking
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.optavel_seo_tracking TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.optavel_summit_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.optavel_summit_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "optavel_summit_registrations_all_access" ON public.optavel_summit_registrations;

DROP POLICY IF EXISTS "optavel_summit_registrations_all_access" ON public.optavel_summit_registrations;
CREATE POLICY "optavel_summit_registrations_all_access" ON public.optavel_summit_registrations
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.optavel_summit_registrations TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.optavel_bugs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.optavel_bugs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "optavel_bugs_all_access" ON public.optavel_bugs;

DROP POLICY IF EXISTS "optavel_bugs_all_access" ON public.optavel_bugs;
CREATE POLICY "optavel_bugs_all_access" ON public.optavel_bugs
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.optavel_bugs TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.optavel_sprints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.optavel_sprints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "optavel_sprints_all_access" ON public.optavel_sprints;

DROP POLICY IF EXISTS "optavel_sprints_all_access" ON public.optavel_sprints;
CREATE POLICY "optavel_sprints_all_access" ON public.optavel_sprints
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.optavel_sprints TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.optavel_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.optavel_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "optavel_tasks_all_access" ON public.optavel_tasks;

DROP POLICY IF EXISTS "optavel_tasks_all_access" ON public.optavel_tasks;
CREATE POLICY "optavel_tasks_all_access" ON public.optavel_tasks
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.optavel_tasks TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.optavel_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.optavel_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "optavel_transactions_all_access" ON public.optavel_transactions;

DROP POLICY IF EXISTS "optavel_transactions_all_access" ON public.optavel_transactions;
CREATE POLICY "optavel_transactions_all_access" ON public.optavel_transactions
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.optavel_transactions TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.optavel_deal_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.optavel_deal_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "optavel_deal_activities_all_access" ON public.optavel_deal_activities;

DROP POLICY IF EXISTS "optavel_deal_activities_all_access" ON public.optavel_deal_activities;
CREATE POLICY "optavel_deal_activities_all_access" ON public.optavel_deal_activities
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.optavel_deal_activities TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.email_sequences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.email_sequences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "email_sequences_all_access" ON public.email_sequences;

DROP POLICY IF EXISTS "email_sequences_all_access" ON public.email_sequences;
CREATE POLICY "email_sequences_all_access" ON public.email_sequences
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.email_sequences TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "accounts_all_access" ON public.accounts;

DROP POLICY IF EXISTS "accounts_all_access" ON public.accounts;
CREATE POLICY "accounts_all_access" ON public.accounts
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.accounts TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.journal_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "journal_entries_all_access" ON public.journal_entries;

DROP POLICY IF EXISTS "journal_entries_all_access" ON public.journal_entries;
CREATE POLICY "journal_entries_all_access" ON public.journal_entries
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.journal_entries TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.payroll_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payroll_runs_all_access" ON public.payroll_runs;

DROP POLICY IF EXISTS "payroll_runs_all_access" ON public.payroll_runs;
CREATE POLICY "payroll_runs_all_access" ON public.payroll_runs
  FOR ALL USING (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id::text = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid()));

GRANT ALL ON public.payroll_runs TO authenticated, service_role;

