-- Auto-generated migrations for all Univ components

CREATE TABLE IF NOT EXISTS public.univ_accesscontrols (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , message text
);

ALTER TABLE public.univ_accesscontrols ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_accesscontrols" ON public.univ_accesscontrols;
CREATE POLICY "Allow company access on univ_accesscontrols" ON public.univ_accesscontrols FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_adspend (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , platform text
    , amount_spent text
    , clicks text
    , conversions text
    , roas text
);

ALTER TABLE public.univ_adspend ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_adspend" ON public.univ_adspend;
CREATE POLICY "Allow company access on univ_adspend" ON public.univ_adspend FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_advocacy (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , campaign_name text
    , issue text
    , target_audience text
    , actions_taken text
    , impact text
);

ALTER TABLE public.univ_advocacy ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_advocacy" ON public.univ_advocacy;
CREATE POLICY "Allow company access on univ_advocacy" ON public.univ_advocacy FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_affiliateprogram (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , affiliate_name text
    , tracking_link text
    , click_count text
    , conversion_count text
    , payout_amount text
);

ALTER TABLE public.univ_affiliateprogram ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_affiliateprogram" ON public.univ_affiliateprogram;
CREATE POLICY "Allow company access on univ_affiliateprogram" ON public.univ_affiliateprogram FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_agentcommissions (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , agent_name text
    , sale_amount text
    , commission_rate text
    , commission_amount text
    , sale_date text
    , status text
    , notes text
);

ALTER TABLE public.univ_agentcommissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_agentcommissions" ON public.univ_agentcommissions;
CREATE POLICY "Allow company access on univ_agentcommissions" ON public.univ_agentcommissions FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_allergylist (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
);

ALTER TABLE public.univ_allergylist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_allergylist" ON public.univ_allergylist;
CREATE POLICY "Allow company access on univ_allergylist" ON public.univ_allergylist FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_apiintegrations (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , message text
    , integration_name text
    , provider text
    , auth_type text
    , environment text
    , last_tested text
    , status text
);

ALTER TABLE public.univ_apiintegrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_apiintegrations" ON public.univ_apiintegrations;
CREATE POLICY "Allow company access on univ_apiintegrations" ON public.univ_apiintegrations FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_appointments (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , code text
    , message text
    , title text
    , client_name text
    , status text
    , date text
    , time text
    , duration_minutes text
    , client_email text
);

ALTER TABLE public.univ_appointments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_appointments" ON public.univ_appointments;
CREATE POLICY "Allow company access on univ_appointments" ON public.univ_appointments FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_arbitration (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , code text
    , message text
);

ALTER TABLE public.univ_arbitration ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_arbitration" ON public.univ_arbitration;
CREATE POLICY "Allow company access on univ_arbitration" ON public.univ_arbitration FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_assemblylines (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , line_name text
    , current_product text
    , output_rate text
    , status text
);

ALTER TABLE public.univ_assemblylines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_assemblylines" ON public.univ_assemblylines;
CREATE POLICY "Allow company access on univ_assemblylines" ON public.univ_assemblylines FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_assets (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , code text
    , message text
    , name text
    , category text
    , status text
    , purchase_date text
    , purchase_value text
);

ALTER TABLE public.univ_assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_assets" ON public.univ_assets;
CREATE POLICY "Allow company access on univ_assets" ON public.univ_assets FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_attendance (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , code text
    , message text
    , notes text
    , date text
    , check_in text
    , check_out text
    , status text
);

ALTER TABLE public.univ_attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_attendance" ON public.univ_attendance;
CREATE POLICY "Allow company access on univ_attendance" ON public.univ_attendance FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_audittrails (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , message text
);

ALTER TABLE public.univ_audittrails ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_audittrails" ON public.univ_audittrails;
CREATE POLICY "Allow company access on univ_audittrails" ON public.univ_audittrails FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_beneficiarylist (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , beneficiary_name text
    , contact_info text
    , needs text
    , status text
    , assigned_to text
);

ALTER TABLE public.univ_beneficiarylist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_beneficiarylist" ON public.univ_beneficiarylist;
CREATE POLICY "Allow company access on univ_beneficiarylist" ON public.univ_beneficiarylist FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_benefitelection (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , employee_name text
    , benefit_type text
    , coverage_level text
    , start_date text
    , cost text
);

ALTER TABLE public.univ_benefitelection ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_benefitelection" ON public.univ_benefitelection;
CREATE POLICY "Allow company access on univ_benefitelection" ON public.univ_benefitelection FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_billofladings (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , bol_number text
    , shipper text
    , consignee text
    , freight_charge text
);

ALTER TABLE public.univ_billofladings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_billofladings" ON public.univ_billofladings;
CREATE POLICY "Allow company access on univ_billofladings" ON public.univ_billofladings FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_blueprints (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , project_name text
    , version text
    , architect text
    , status text
);

ALTER TABLE public.univ_blueprints ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_blueprints" ON public.univ_blueprints;
CREATE POLICY "Allow company access on univ_blueprints" ON public.univ_blueprints FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_boms (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , code text
    , message text
);

ALTER TABLE public.univ_boms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_boms" ON public.univ_boms;
CREATE POLICY "Allow company access on univ_boms" ON public.univ_boms FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_bookings (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , code text
    , message text
);

ALTER TABLE public.univ_bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_bookings" ON public.univ_bookings;
CREATE POLICY "Allow company access on univ_bookings" ON public.univ_bookings FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_boqs (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , code text
    , message text
);

ALTER TABLE public.univ_boqs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_boqs" ON public.univ_boqs;
CREATE POLICY "Allow company access on univ_boqs" ON public.univ_boqs FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_brandasset (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , asset_name text
    , asset_type text
    , file_url text
    , uploaded_by text
);

ALTER TABLE public.univ_brandasset ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_brandasset" ON public.univ_brandasset;
CREATE POLICY "Allow company access on univ_brandasset" ON public.univ_brandasset FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_briefs (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , code text
    , message text
);

ALTER TABLE public.univ_briefs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_briefs" ON public.univ_briefs;
CREATE POLICY "Allow company access on univ_briefs" ON public.univ_briefs FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_budgetforecasts (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , message text
    , department text
    , category text
    , period text
    , budgeted_amount text
    , actual_amount text
    , variance text
    , status text
);

ALTER TABLE public.univ_budgetforecasts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_budgetforecasts" ON public.univ_budgetforecasts;
CREATE POLICY "Allow company access on univ_budgetforecasts" ON public.univ_budgetforecasts FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_calllogs (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , message text
);

ALTER TABLE public.univ_calllogs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_calllogs" ON public.univ_calllogs;
CREATE POLICY "Allow company access on univ_calllogs" ON public.univ_calllogs FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_campaignmetric (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , campaign_name text
    , target_amount text
    , raised_amount text
    , start_date text
    , end_date text
);

ALTER TABLE public.univ_campaignmetric ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_campaignmetric" ON public.univ_campaignmetric;
CREATE POLICY "Allow company access on univ_campaignmetric" ON public.univ_campaignmetric FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_campaignschedule (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , campaign_name text
    , start_date text
    , end_date text
    , budget text
    , status text
);

ALTER TABLE public.univ_campaignschedule ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_campaignschedule" ON public.univ_campaignschedule;
CREATE POLICY "Allow company access on univ_campaignschedule" ON public.univ_campaignschedule FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_carrental (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
);

ALTER TABLE public.univ_carrental ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_carrental" ON public.univ_carrental;
CREATE POLICY "Allow company access on univ_carrental" ON public.univ_carrental FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_carriercontracts (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , carrier_name text
    , valid_until text
    , rate_per_mile text
    , status text
);

ALTER TABLE public.univ_carriercontracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_carriercontracts" ON public.univ_carriercontracts;
CREATE POLICY "Allow company access on univ_carriercontracts" ON public.univ_carriercontracts FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_cases (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , code text
    , message text
);

ALTER TABLE public.univ_cases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_cases" ON public.univ_cases;
CREATE POLICY "Allow company access on univ_cases" ON public.univ_cases FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_changerequests (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , message text
    , request_title text
    , requested_by text
    , change_type text
    , impact_level text
    , request_date text
    , status text
);

ALTER TABLE public.univ_changerequests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_changerequests" ON public.univ_changerequests;
CREATE POLICY "Allow company access on univ_changerequests" ON public.univ_changerequests FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_chattranscripts (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , message text
);

ALTER TABLE public.univ_chattranscripts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_chattranscripts" ON public.univ_chattranscripts;
CREATE POLICY "Allow company access on univ_chattranscripts" ON public.univ_chattranscripts FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_churnrisks (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , message text
);

ALTER TABLE public.univ_churnrisks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_churnrisks" ON public.univ_churnrisks;
CREATE POLICY "Allow company access on univ_churnrisks" ON public.univ_churnrisks FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_class_attendance (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , code text
    , message text
);

ALTER TABLE public.univ_class_attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_class_attendance" ON public.univ_class_attendance;
CREATE POLICY "Allow company access on univ_class_attendance" ON public.univ_class_attendance FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_clientledger (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , code text
    , message text
);

ALTER TABLE public.univ_clientledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_clientledger" ON public.univ_clientledger;
CREATE POLICY "Allow company access on univ_clientledger" ON public.univ_clientledger FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_client_portal (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , code text
    , message text
);

ALTER TABLE public.univ_client_portal ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_client_portal" ON public.univ_client_portal;
CREATE POLICY "Allow company access on univ_client_portal" ON public.univ_client_portal FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_coldchains (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , sensor_id text
    , temperature text
    , location text
    , status text
);

ALTER TABLE public.univ_coldchains ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_coldchains" ON public.univ_coldchains;
CREATE POLICY "Allow company access on univ_coldchains" ON public.univ_coldchains FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_commissionstructure (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , role_name text
    , base_rate text
    , quota_amount text
    , bonus_percentage text
);

ALTER TABLE public.univ_commissionstructure ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_commissionstructure" ON public.univ_commissionstructure;
CREATE POLICY "Allow company access on univ_commissionstructure" ON public.univ_commissionstructure FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_competitorprices (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , message text
);

ALTER TABLE public.univ_competitorprices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_competitorprices" ON public.univ_competitorprices;
CREATE POLICY "Allow company access on univ_competitorprices" ON public.univ_competitorprices FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_concretetests (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , batch_id text
    , slump_result text
    , strength text
    , test_date text
);

ALTER TABLE public.univ_concretetests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_concretetests" ON public.univ_concretetests;
CREATE POLICY "Allow company access on univ_concretetests" ON public.univ_concretetests FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_conflictcheck (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , code text
    , message text
);

ALTER TABLE public.univ_conflictcheck ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_conflictcheck" ON public.univ_conflictcheck;
CREATE POLICY "Allow company access on univ_conflictcheck" ON public.univ_conflictcheck FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_consultation (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , code text
    , message text
);

ALTER TABLE public.univ_consultation ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_consultation" ON public.univ_consultation;
CREATE POLICY "Allow company access on univ_consultation" ON public.univ_consultation FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_contacts (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , code text
    , first_name text
    , last_name text
    , organization text
    , message text
    , name text
    , email text
    , company text
    , type text
    , phone text
);

ALTER TABLE public.univ_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_contacts" ON public.univ_contacts;
CREATE POLICY "Allow company access on univ_contacts" ON public.univ_contacts FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_contractmanagements (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , message text
    , contract_title text
    , counterparty text
    , contract_type text
    , start_date text
    , end_date text
    , contract_value text
    , status text
);

ALTER TABLE public.univ_contractmanagements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_contractmanagements" ON public.univ_contractmanagements;
CREATE POLICY "Allow company access on univ_contractmanagements" ON public.univ_contractmanagements FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_contractors (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , code text
    , message text
    , com text
);

ALTER TABLE public.univ_contractors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_contractors" ON public.univ_contractors;
CREATE POLICY "Allow company access on univ_contractors" ON public.univ_contractors FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_courses (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , code text
    , message text
);

ALTER TABLE public.univ_courses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_courses" ON public.univ_courses;
CREATE POLICY "Allow company access on univ_courses" ON public.univ_courses FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_court_calendar (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , code text
    , message text
);

ALTER TABLE public.univ_court_calendar ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_court_calendar" ON public.univ_court_calendar;
CREATE POLICY "Allow company access on univ_court_calendar" ON public.univ_court_calendar FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_crm_leads (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , first_name text
    , last_name text
    , email text
    , phone text
    , source text
    , value text
    , status text
    , notes text
    , code text
);

ALTER TABLE public.univ_crm_leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_crm_leads" ON public.univ_crm_leads;
CREATE POLICY "Allow company access on univ_crm_leads" ON public.univ_crm_leads FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_crossdockings (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , inbound_truck text
    , outbound_truck text
    , dock_number text
    , status text
);

ALTER TABLE public.univ_crossdockings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_crossdockings" ON public.univ_crossdockings;
CREATE POLICY "Allow company access on univ_crossdockings" ON public.univ_crossdockings FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_customerjourneys (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , message text
);

ALTER TABLE public.univ_customerjourneys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_customerjourneys" ON public.univ_customerjourneys;
CREATE POLICY "Allow company access on univ_customerjourneys" ON public.univ_customerjourneys FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_customerreviews (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , message text
);

ALTER TABLE public.univ_customerreviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_customerreviews" ON public.univ_customerreviews;
CREATE POLICY "Allow company access on univ_customerreviews" ON public.univ_customerreviews FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_customersegments (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , message text
    , segment_name text
    , customer_count text
    , avg_order_value text
    , channel text
    , created_date text
    , status text
);

ALTER TABLE public.univ_customersegments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_customersegments" ON public.univ_customersegments;
CREATE POLICY "Allow company access on univ_customersegments" ON public.univ_customersegments FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_customsdocs (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , document_number text
    , origin_country text
    , destination_country text
    , status text
);

ALTER TABLE public.univ_customsdocs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_customsdocs" ON public.univ_customsdocs;
CREATE POLICY "Allow company access on univ_customsdocs" ON public.univ_customsdocs FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_damagedgoodss (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , item_id text
    , damage_desc text
    , quantity text
    , claim_status text
);

ALTER TABLE public.univ_damagedgoodss ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_damagedgoodss" ON public.univ_damagedgoodss;
CREATE POLICY "Allow company access on univ_damagedgoodss" ON public.univ_damagedgoodss FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_databackups (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , message text
);

ALTER TABLE public.univ_databackups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_databackups" ON public.univ_databackups;
CREATE POLICY "Allow company access on univ_databackups" ON public.univ_databackups FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_deliveries (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , code text
    , message text
);

ALTER TABLE public.univ_deliveries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_deliveries" ON public.univ_deliveries;
CREATE POLICY "Allow company access on univ_deliveries" ON public.univ_deliveries FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_digitalassets (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , message text
    , asset_name text
    , asset_type text
    , file_size_mb text
    , uploaded_by text
    , upload_date text
    , status text
);

ALTER TABLE public.univ_digitalassets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_digitalassets" ON public.univ_digitalassets;
CREATE POLICY "Allow company access on univ_digitalassets" ON public.univ_digitalassets FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_dining_orders (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , code text
    , message text
);

ALTER TABLE public.univ_dining_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_dining_orders" ON public.univ_dining_orders;
CREATE POLICY "Allow company access on univ_dining_orders" ON public.univ_dining_orders FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_dischargesummary (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
);

ALTER TABLE public.univ_dischargesummary ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_dischargesummary" ON public.univ_dischargesummary;
CREATE POLICY "Allow company access on univ_dischargesummary" ON public.univ_dischargesummary FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_disciplinary (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , employee_name text
    , incident_date text
    , issue_type text
    , action_taken text
    , status text
);

ALTER TABLE public.univ_disciplinary ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_disciplinary" ON public.univ_disciplinary;
CREATE POLICY "Allow company access on univ_disciplinary" ON public.univ_disciplinary FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_discounts (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , message text
);

ALTER TABLE public.univ_discounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_discounts" ON public.univ_discounts;
CREATE POLICY "Allow company access on univ_discounts" ON public.univ_discounts FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_dispatch (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , code text
    , message text
);

ALTER TABLE public.univ_dispatch ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_dispatch" ON public.univ_dispatch;
CREATE POLICY "Allow company access on univ_dispatch" ON public.univ_dispatch FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_documents (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , code text
    , name text
    , description text
    , tags text
    , type text
    , status text
    , file_url text
);

ALTER TABLE public.univ_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_documents" ON public.univ_documents;
CREATE POLICY "Allow company access on univ_documents" ON public.univ_documents FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_donationlog (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , donor_name text
    , amount text
    , date text
    , campaign text
    , payment_method text
);

ALTER TABLE public.univ_donationlog ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_donationlog" ON public.univ_donationlog;
CREATE POLICY "Allow company access on univ_donationlog" ON public.univ_donationlog FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_donorprofile (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , name text
    , email text
    , phone text
    , total_donated text
    , donor_status text
);

ALTER TABLE public.univ_donorprofile ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_donorprofile" ON public.univ_donorprofile;
CREATE POLICY "Allow company access on univ_donorprofile" ON public.univ_donorprofile FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_employeeperformances (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , message text
    , employee_name text
    , reviewer_name text
    , review_period text
    , overall_rating text
    , review_date text
    , status text
);

ALTER TABLE public.univ_employeeperformances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_employeeperformances" ON public.univ_employeeperformances;
CREATE POLICY "Allow company access on univ_employeeperformances" ON public.univ_employeeperformances FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_emr (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , code text
    , message text
    , patient_name text
    , diagnosis text
    , doctor_name text
    , visit_date text
    , symptoms text
    , treatment_plan text
);

ALTER TABLE public.univ_emr ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_emr" ON public.univ_emr;
CREATE POLICY "Allow company access on univ_emr" ON public.univ_emr FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_equipmentrentals (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , equipment_name text
    , vendor text
    , start_date text
    , end_date text
);

ALTER TABLE public.univ_equipmentrentals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_equipmentrentals" ON public.univ_equipmentrentals;
CREATE POLICY "Allow company access on univ_equipmentrentals" ON public.univ_equipmentrentals FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_escrow (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , code text
    , message text
);

ALTER TABLE public.univ_escrow ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_escrow" ON public.univ_escrow;
CREATE POLICY "Allow company access on univ_escrow" ON public.univ_escrow FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_eventplanner (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
);

ALTER TABLE public.univ_eventplanner ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_eventplanner" ON public.univ_eventplanner;
CREATE POLICY "Allow company access on univ_eventplanner" ON public.univ_eventplanner FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_exitinterview (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , employee_name text
    , departure_date text
    , reason text
    , feedback text
    , interviewer text
);

ALTER TABLE public.univ_exitinterview ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_exitinterview" ON public.univ_exitinterview;
CREATE POLICY "Allow company access on univ_exitinterview" ON public.univ_exitinterview FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_expenseclaim (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , employee_name text
    , amount text
    , category text
    , date text
    , status text
);

ALTER TABLE public.univ_expenseclaim ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_expenseclaim" ON public.univ_expenseclaim;
CREATE POLICY "Allow company access on univ_expenseclaim" ON public.univ_expenseclaim FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_expensereports (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , message text
);

ALTER TABLE public.univ_expensereports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_expensereports" ON public.univ_expensereports;
CREATE POLICY "Allow company access on univ_expensereports" ON public.univ_expensereports FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_expertwitness (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , code text
    , message text
);

ALTER TABLE public.univ_expertwitness ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_expertwitness" ON public.univ_expertwitness;
CREATE POLICY "Allow company access on univ_expertwitness" ON public.univ_expertwitness FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_faculty (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , code text
    , message text
);

ALTER TABLE public.univ_faculty ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_faculty" ON public.univ_faculty;
CREATE POLICY "Allow company access on univ_faculty" ON public.univ_faculty FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_featurerequests (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , message text
);

ALTER TABLE public.univ_featurerequests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_featurerequests" ON public.univ_featurerequests;
CREATE POLICY "Allow company access on univ_featurerequests" ON public.univ_featurerequests FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_feedbacksurvey (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
);

ALTER TABLE public.univ_feedbacksurvey ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_feedbacksurvey" ON public.univ_feedbacksurvey;
CREATE POLICY "Allow company access on univ_feedbacksurvey" ON public.univ_feedbacksurvey FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_fleet (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , code text
    , message text
);

ALTER TABLE public.univ_fleet ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_fleet" ON public.univ_fleet;
CREATE POLICY "Allow company access on univ_fleet" ON public.univ_fleet FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_forkliftmaintenances (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , forklift_id text
    , last_service text
    , next_service text
    , condition text
);

ALTER TABLE public.univ_forkliftmaintenances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_forkliftmaintenances" ON public.univ_forkliftmaintenances;
CREATE POLICY "Allow company access on univ_forkliftmaintenances" ON public.univ_forkliftmaintenances FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_gdprrequests (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , message text
);

ALTER TABLE public.univ_gdprrequests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_gdprrequests" ON public.univ_gdprrequests;
CREATE POLICY "Allow company access on univ_gdprrequests" ON public.univ_gdprrequests FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_generalledgers (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , message text
);

ALTER TABLE public.univ_generalledgers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_generalledgers" ON public.univ_generalledgers;
CREATE POLICY "Allow company access on univ_generalledgers" ON public.univ_generalledgers FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_giftcards (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , message text
);

ALTER TABLE public.univ_giftcards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_giftcards" ON public.univ_giftcards;
CREATE POLICY "Allow company access on univ_giftcards" ON public.univ_giftcards FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_gradebook (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , code text
);

ALTER TABLE public.univ_gradebook ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_gradebook" ON public.univ_gradebook;
CREATE POLICY "Allow company access on univ_gradebook" ON public.univ_gradebook FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_healthsafetys (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , message text
    , inspection_title text
    , inspector_name text
    , location text
    , inspection_date text
    , next_inspection text
    , status text
);

ALTER TABLE public.univ_healthsafetys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_healthsafetys" ON public.univ_healthsafetys;
CREATE POLICY "Allow company access on univ_healthsafetys" ON public.univ_healthsafetys FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_hoas (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , community_name text
    , unit_number text
    , owner_name text
    , dues_amount text
    , due_date text
    , status text
    , violation_notes text
);

ALTER TABLE public.univ_hoas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_hoas" ON public.univ_hoas;
CREATE POLICY "Allow company access on univ_hoas" ON public.univ_hoas FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_hotelreview (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
);

ALTER TABLE public.univ_hotelreview ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_hotelreview" ON public.univ_hotelreview;
CREATE POLICY "Allow company access on univ_hotelreview" ON public.univ_hotelreview FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_housekeeping (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , code text
);

ALTER TABLE public.univ_housekeeping ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_housekeeping" ON public.univ_housekeeping;
CREATE POLICY "Allow company access on univ_housekeeping" ON public.univ_housekeeping FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_hr_employees (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , code text
    , message text
);

ALTER TABLE public.univ_hr_employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_hr_employees" ON public.univ_hr_employees;
CREATE POLICY "Allow company access on univ_hr_employees" ON public.univ_hr_employees FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_immunization (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
);

ALTER TABLE public.univ_immunization ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_immunization" ON public.univ_immunization;
CREATE POLICY "Allow company access on univ_immunization" ON public.univ_immunization FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_incidentreports (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , message text
);

ALTER TABLE public.univ_incidentreports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_incidentreports" ON public.univ_incidentreports;
CREATE POLICY "Allow company access on univ_incidentreports" ON public.univ_incidentreports FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_inkinddonation (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , donor_name text
    , item_description text
    , estimated_value text
    , date_received text
    , condition text
);

ALTER TABLE public.univ_inkinddonation ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_inkinddonation" ON public.univ_inkinddonation;
CREATE POLICY "Allow company access on univ_inkinddonation" ON public.univ_inkinddonation FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_insurancepolicy (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
);

ALTER TABLE public.univ_insurancepolicy ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_insurancepolicy" ON public.univ_insurancepolicy;
CREATE POLICY "Allow company access on univ_insurancepolicy" ON public.univ_insurancepolicy FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_inventory (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , code text
    , message text
);

ALTER TABLE public.univ_inventory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_inventory" ON public.univ_inventory;
CREATE POLICY "Allow company access on univ_inventory" ON public.univ_inventory FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_invoices (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , code text
);

ALTER TABLE public.univ_invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_invoices" ON public.univ_invoices;
CREATE POLICY "Allow company access on univ_invoices" ON public.univ_invoices FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_ipaddresses (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , message text
);

ALTER TABLE public.univ_ipaddresses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_ipaddresses" ON public.univ_ipaddresses;
CREATE POLICY "Allow company access on univ_ipaddresses" ON public.univ_ipaddresses FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_kbarticles (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , message text
);

ALTER TABLE public.univ_kbarticles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_kbarticles" ON public.univ_kbarticles;
CREATE POLICY "Allow company access on univ_kbarticles" ON public.univ_kbarticles FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_kpitrackers (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , message text
    , kpi_name text
    , category text
    , target_value text
    , actual_value text
    , unit text
    , period text
    , status text
);

ALTER TABLE public.univ_kpitrackers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_kpitrackers" ON public.univ_kpitrackers;
CREATE POLICY "Allow company access on univ_kpitrackers" ON public.univ_kpitrackers FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_labs (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , code text
);

ALTER TABLE public.univ_labs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_labs" ON public.univ_labs;
CREATE POLICY "Allow company access on univ_labs" ON public.univ_labs FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_leadmagnets (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , message text
);

ALTER TABLE public.univ_leadmagnets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_leadmagnets" ON public.univ_leadmagnets;
CREATE POLICY "Allow company access on univ_leadmagnets" ON public.univ_leadmagnets FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_lease (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , code text
    , message text
);

ALTER TABLE public.univ_lease ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_lease" ON public.univ_lease;
CREATE POLICY "Allow company access on univ_lease" ON public.univ_lease FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_leave_management (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , code text
    , message text
    , reason text
    , leave_type text
    , start_date text
    , end_date text
    , status text
);

ALTER TABLE public.univ_leave_management ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_leave_management" ON public.univ_leave_management;
CREATE POLICY "Allow company access on univ_leave_management" ON public.univ_leave_management FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_legal_documents (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , code text
);

ALTER TABLE public.univ_legal_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_legal_documents" ON public.univ_legal_documents;
CREATE POLICY "Allow company access on univ_legal_documents" ON public.univ_legal_documents FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_listing (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , code text
    , message text
);

ALTER TABLE public.univ_listing ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_listing" ON public.univ_listing;
CREATE POLICY "Allow company access on univ_listing" ON public.univ_listing FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_lms_lessons (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , code text
);

ALTER TABLE public.univ_lms_lessons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_lms_lessons" ON public.univ_lms_lessons;
CREATE POLICY "Allow company access on univ_lms_lessons" ON public.univ_lms_lessons FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_loyaltypoints (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , message text
);

ALTER TABLE public.univ_loyaltypoints ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_loyaltypoints" ON public.univ_loyaltypoints;
CREATE POLICY "Allow company access on univ_loyaltypoints" ON public.univ_loyaltypoints FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_luggageclaim (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
);

ALTER TABLE public.univ_luggageclaim ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_luggageclaim" ON public.univ_luggageclaim;
CREATE POLICY "Allow company access on univ_luggageclaim" ON public.univ_luggageclaim FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_machines (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , code text
    , message text
);

ALTER TABLE public.univ_machines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_machines" ON public.univ_machines;
CREATE POLICY "Allow company access on univ_machines" ON public.univ_machines FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_maintenancerequest (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , code text
    , message text
);

ALTER TABLE public.univ_maintenancerequest ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_maintenancerequest" ON public.univ_maintenancerequest;
CREATE POLICY "Allow company access on univ_maintenancerequest" ON public.univ_maintenancerequest FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_meetingminutess (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , message text
    , meeting_title text
    , meeting_date text
    , location text
    , next_meeting text
    , status text
);

ALTER TABLE public.univ_meetingminutess ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_meetingminutess" ON public.univ_meetingminutess;
CREATE POLICY "Allow company access on univ_meetingminutess" ON public.univ_meetingminutess FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_menus (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , code text
    , message text
);

ALTER TABLE public.univ_menus ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_menus" ON public.univ_menus;
CREATE POLICY "Allow company access on univ_menus" ON public.univ_menus FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_newsletter (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , subject_line text
    , send_date text
    , recipient_count text
    , open_rate text
    , click_rate text
);

ALTER TABLE public.univ_newsletter ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_newsletter" ON public.univ_newsletter;
CREATE POLICY "Allow company access on univ_newsletter" ON public.univ_newsletter FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_onboardingtask (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , employee_name text
    , task_name text
    , due_date text
    , status text
    , assigned_to text
);

ALTER TABLE public.univ_onboardingtask ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_onboardingtask" ON public.univ_onboardingtask;
CREATE POLICY "Allow company access on univ_onboardingtask" ON public.univ_onboardingtask FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_operationtheater (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
);

ALTER TABLE public.univ_operationtheater ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_operationtheater" ON public.univ_operationtheater;
CREATE POLICY "Allow company access on univ_operationtheater" ON public.univ_operationtheater FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_orderregistrys (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , message text
);

ALTER TABLE public.univ_orderregistrys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_orderregistrys" ON public.univ_orderregistrys;
CREATE POLICY "Allow company access on univ_orderregistrys" ON public.univ_orderregistrys FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_orgchart (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , employee_name text
    , role text
    , department text
    , reports_to text
    , level text
);

ALTER TABLE public.univ_orgchart ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_orgchart" ON public.univ_orgchart;
CREATE POLICY "Allow company access on univ_orgchart" ON public.univ_orgchart FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_pallettracker (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
);

ALTER TABLE public.univ_pallettracker ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_pallettracker" ON public.univ_pallettracker;
CREATE POLICY "Allow company access on univ_pallettracker" ON public.univ_pallettracker FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_parent_portal_access (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , code text
    , message text
    , clipboard text
);

ALTER TABLE public.univ_parent_portal_access ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_parent_portal_access" ON public.univ_parent_portal_access;
CREATE POLICY "Allow company access on univ_parent_portal_access" ON public.univ_parent_portal_access FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_patients (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , code text
    , message text
);

ALTER TABLE public.univ_patients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_patients" ON public.univ_patients;
CREATE POLICY "Allow company access on univ_patients" ON public.univ_patients FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_payments (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , code text
    , message text
    , reference_id text
    , amount text
    , method text
    , status text
);

ALTER TABLE public.univ_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_payments" ON public.univ_payments;
CREATE POLICY "Allow company access on univ_payments" ON public.univ_payments FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_payroll (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , code text
    , message text
);

ALTER TABLE public.univ_payroll ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_payroll" ON public.univ_payroll;
CREATE POLICY "Allow company access on univ_payroll" ON public.univ_payroll FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_permittrackers (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , permit_type text
    , issued_date text
    , expiry_date text
    , authority text
);

ALTER TABLE public.univ_permittrackers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_permittrackers" ON public.univ_permittrackers;
CREATE POLICY "Allow company access on univ_permittrackers" ON public.univ_permittrackers FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_pledge (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , donor_name text
    , amount text
    , expected_date text
    , status text
    , campaign text
);

ALTER TABLE public.univ_pledge ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_pledge" ON public.univ_pledge;
CREATE POLICY "Allow company access on univ_pledge" ON public.univ_pledge FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_pos (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , message text
);

ALTER TABLE public.univ_pos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_pos" ON public.univ_pos;
CREATE POLICY "Allow company access on univ_pos" ON public.univ_pos FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_pressrelease (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , title text
    , publish_date text
    , distributor text
    , status text
    , views text
);

ALTER TABLE public.univ_pressrelease ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_pressrelease" ON public.univ_pressrelease;
CREATE POLICY "Allow company access on univ_pressrelease" ON public.univ_pressrelease FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_procurement (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , code text
    , message text
    , po_number text
    , supplier text
    , total_amount text
    , status text
    , order_date text
    , expected_date text
);

ALTER TABLE public.univ_procurement ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_procurement" ON public.univ_procurement;
CREATE POLICY "Allow company access on univ_procurement" ON public.univ_procurement FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_productcatalogs (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , message text
);

ALTER TABLE public.univ_productcatalogs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_productcatalogs" ON public.univ_productcatalogs;
CREATE POLICY "Allow company access on univ_productcatalogs" ON public.univ_productcatalogs FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_productionschedules (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , message text
    , job_name text
    , product_name text
    , machine_line text
    , planned_start text
    , quantity_ordered text
    , status text
);

ALTER TABLE public.univ_productionschedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_productionschedules" ON public.univ_productionschedules;
CREATE POLICY "Allow company access on univ_productionschedules" ON public.univ_productionschedules FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_projects (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , code text
    , name text
    , client_name text
    , description text
    , status text
    , due_date text
    , assigned_to text
    , priority text
);

ALTER TABLE public.univ_projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_projects" ON public.univ_projects;
CREATE POLICY "Allow company access on univ_projects" ON public.univ_projects FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_projectmilestones (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , message text
    , milestone_name text
    , project_name text
    , due_date text
    , progress_percent text
    , owner text
    , status text
);

ALTER TABLE public.univ_projectmilestones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_projectmilestones" ON public.univ_projectmilestones;
CREATE POLICY "Allow company access on univ_projectmilestones" ON public.univ_projectmilestones FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_property (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , code text
    , message text
);

ALTER TABLE public.univ_property ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_property" ON public.univ_property;
CREATE POLICY "Allow company access on univ_property" ON public.univ_property FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_propertyinspection (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , code text
    , message text
);

ALTER TABLE public.univ_propertyinspection ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_propertyinspection" ON public.univ_propertyinspection;
CREATE POLICY "Allow company access on univ_propertyinspection" ON public.univ_propertyinspection FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_rawmaterials (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , material_name text
    , supplier text
    , stock_level text
    , reorder_point text
);

ALTER TABLE public.univ_rawmaterials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_rawmaterials" ON public.univ_rawmaterials;
CREATE POLICY "Allow company access on univ_rawmaterials" ON public.univ_rawmaterials FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_recruitment (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , code text
);

ALTER TABLE public.univ_recruitment ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_recruitment" ON public.univ_recruitment;
CREATE POLICY "Allow company access on univ_recruitment" ON public.univ_recruitment FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_retainer (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , code text
    , message text
);

ALTER TABLE public.univ_retainer ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_retainer" ON public.univ_retainer;
CREATE POLICY "Allow company access on univ_retainer" ON public.univ_retainer FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_returnrefunds (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , message text
);

ALTER TABLE public.univ_returnrefunds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_returnrefunds" ON public.univ_returnrefunds;
CREATE POLICY "Allow company access on univ_returnrefunds" ON public.univ_returnrefunds FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_riskregisters (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , message text
    , risk_title text
    , category text
    , likelihood text
    , impact text
    , risk_score text
    , owner text
    , status text
);

ALTER TABLE public.univ_riskregisters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_riskregisters" ON public.univ_riskregisters;
CREATE POLICY "Allow company access on univ_riskregisters" ON public.univ_riskregisters FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_routes (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , code text
    , message text
    , route_name text
    , start_location text
    , end_location text
    , status text
    , estimated_distance text
    , estimated_duration text
);

ALTER TABLE public.univ_routes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_routes" ON public.univ_routes;
CREATE POLICY "Allow company access on univ_routes" ON public.univ_routes FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_safety (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , code text
    , message text
);

ALTER TABLE public.univ_safety ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_safety" ON public.univ_safety;
CREATE POLICY "Allow company access on univ_safety" ON public.univ_safety FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_salestargets (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , message text
    , sales_rep text
    , team text
    , period text
    , target_amount text
    , achieved_amount text
    , deals_closed text
    , status text
);

ALTER TABLE public.univ_salestargets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_salestargets" ON public.univ_salestargets;
CREATE POLICY "Allow company access on univ_salestargets" ON public.univ_salestargets FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_scraprates (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , batch_number text
    , defect_count text
    , total_produced text
    , scrap_pct text
);

ALTER TABLE public.univ_scraprates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_scraprates" ON public.univ_scraprates;
CREATE POLICY "Allow company access on univ_scraprates" ON public.univ_scraprates FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_seokeyword (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , keyword text
    , search_volume text
    , difficulty text
    , current_rank text
    , target_url text
);

ALTER TABLE public.univ_seokeyword ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_seokeyword" ON public.univ_seokeyword;
CREATE POLICY "Allow company access on univ_seokeyword" ON public.univ_seokeyword FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_servermetrics (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , message text
);

ALTER TABLE public.univ_servermetrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_servermetrics" ON public.univ_servermetrics;
CREATE POLICY "Allow company access on univ_servermetrics" ON public.univ_servermetrics FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_site_inspections (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , code text
    , message text
);

ALTER TABLE public.univ_site_inspections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_site_inspections" ON public.univ_site_inspections;
CREATE POLICY "Allow company access on univ_site_inspections" ON public.univ_site_inspections FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_slaagreements (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , message text
);

ALTER TABLE public.univ_slaagreements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_slaagreements" ON public.univ_slaagreements;
CREATE POLICY "Allow company access on univ_slaagreements" ON public.univ_slaagreements FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_snaglists (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , issue_desc text
    , location text
    , priority text
    , status text
);

ALTER TABLE public.univ_snaglists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_snaglists" ON public.univ_snaglists;
CREATE POLICY "Allow company access on univ_snaglists" ON public.univ_snaglists FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_softwarelicenses (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , message text
);

ALTER TABLE public.univ_softwarelicenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_softwarelicenses" ON public.univ_softwarelicenses;
CREATE POLICY "Allow company access on univ_softwarelicenses" ON public.univ_softwarelicenses FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_sponsorship (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , sponsor_name text
    , tier text
    , amount text
    , benefits text
    , start_date text
);

ALTER TABLE public.univ_sponsorship ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_sponsorship" ON public.univ_sponsorship;
CREATE POLICY "Allow company access on univ_sponsorship" ON public.univ_sponsorship FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_sslcertificates (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , message text
);

ALTER TABLE public.univ_sslcertificates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_sslcertificates" ON public.univ_sslcertificates;
CREATE POLICY "Allow company access on univ_sslcertificates" ON public.univ_sslcertificates FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_students (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , code text
    , message text
);

ALTER TABLE public.univ_students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_students" ON public.univ_students;
CREATE POLICY "Allow company access on univ_students" ON public.univ_students FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_supplierdirectorys (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , message text
);

ALTER TABLE public.univ_supplierdirectorys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_supplierdirectorys" ON public.univ_supplierdirectorys;
CREATE POLICY "Allow company access on univ_supplierdirectorys" ON public.univ_supplierdirectorys FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_supporttickets (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , message text
);

ALTER TABLE public.univ_supporttickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_supporttickets" ON public.univ_supporttickets;
CREATE POLICY "Allow company access on univ_supporttickets" ON public.univ_supporttickets FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_tablereservation (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
);

ALTER TABLE public.univ_tablereservation ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_tablereservation" ON public.univ_tablereservation;
CREATE POLICY "Allow company access on univ_tablereservation" ON public.univ_tablereservation FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_taxfilings (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , message text
);

ALTER TABLE public.univ_taxfilings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_taxfilings" ON public.univ_taxfilings;
CREATE POLICY "Allow company access on univ_taxfilings" ON public.univ_taxfilings FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_tenant (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , code text
    , message text
);

ALTER TABLE public.univ_tenant ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_tenant" ON public.univ_tenant;
CREATE POLICY "Allow company access on univ_tenant" ON public.univ_tenant FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_ticketsales (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
);

ALTER TABLE public.univ_ticketsales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_ticketsales" ON public.univ_ticketsales;
CREATE POLICY "Allow company access on univ_ticketsales" ON public.univ_ticketsales FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_timebilling (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , code text
    , message text
);

ALTER TABLE public.univ_timebilling ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_timebilling" ON public.univ_timebilling;
CREATE POLICY "Allow company access on univ_timebilling" ON public.univ_timebilling FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_projects (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , title text
    , description text
    , date text
    , status text
    , code text
    , message text
);

ALTER TABLE public.univ_projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_projects" ON public.univ_projects;
CREATE POLICY "Allow company access on univ_projects" ON public.univ_projects FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_timesheet (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , employee_name text
    , date text
    , hours_worked text
    , project text
    , approved text
);

ALTER TABLE public.univ_timesheet ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_timesheet" ON public.univ_timesheet;
CREATE POLICY "Allow company access on univ_timesheet" ON public.univ_timesheet FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_tourpackage (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
);

ALTER TABLE public.univ_tourpackage ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_tourpackage" ON public.univ_tourpackage;
CREATE POLICY "Allow company access on univ_tourpackage" ON public.univ_tourpackage FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_trademark (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , code text
    , message text
);

ALTER TABLE public.univ_trademark ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_trademark" ON public.univ_trademark;
CREATE POLICY "Allow company access on univ_trademark" ON public.univ_trademark FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_trainingrecords (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , message text
    , employee_name text
    , training_name text
    , provider text
    , training_type text
    , completion_date text
    , status text
);

ALTER TABLE public.univ_trainingrecords ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_trainingrecords" ON public.univ_trainingrecords;
CREATE POLICY "Allow company access on univ_trainingrecords" ON public.univ_trainingrecords FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_triage (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
);

ALTER TABLE public.univ_triage ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_triage" ON public.univ_triage;
CREATE POLICY "Allow company access on univ_triage" ON public.univ_triage FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_utilitybills (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , unit_address text
    , tenant_name text
    , utility_type text
    , amount text
    , bill_date text
    , due_date text
    , status text
    , meter_reading text
);

ALTER TABLE public.univ_utilitybills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_utilitybills" ON public.univ_utilitybills;
CREATE POLICY "Allow company access on univ_utilitybills" ON public.univ_utilitybills FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_vitalsigns (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
);

ALTER TABLE public.univ_vitalsigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_vitalsigns" ON public.univ_vitalsigns;
CREATE POLICY "Allow company access on univ_vitalsigns" ON public.univ_vitalsigns FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_volunteerroster (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , volunteer_name text
    , email text
    , role text
    , availability text
    , hours_logged text
);

ALTER TABLE public.univ_volunteerroster ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_volunteerroster" ON public.univ_volunteerroster;
CREATE POLICY "Allow company access on univ_volunteerroster" ON public.univ_volunteerroster FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_vulnerabilities (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , message text
);

ALTER TABLE public.univ_vulnerabilities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_vulnerabilities" ON public.univ_vulnerabilities;
CREATE POLICY "Allow company access on univ_vulnerabilities" ON public.univ_vulnerabilities FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_wishlists (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , message text
);

ALTER TABLE public.univ_wishlists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_wishlists" ON public.univ_wishlists;
CREATE POLICY "Allow company access on univ_wishlists" ON public.univ_wishlists FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_workorders (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null
    , order_id text
    , task_desc text
    , assigned_to text
    , completion_pct text
);

ALTER TABLE public.univ_workorders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_workorders" ON public.univ_workorders;
CREATE POLICY "Allow company access on univ_workorders" ON public.univ_workorders FOR ALL USING (auth.uid() IS NOT NULL);

