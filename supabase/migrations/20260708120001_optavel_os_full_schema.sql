-- OptaVel OS Full Schema Migration
-- Run this in Supabase SQL Editor

-- optavel_deal_rooms
CREATE TABLE IF NOT EXISTS public.optavel_deal_rooms (id TEXT PRIMARY KEY, company_id TEXT, lead_name TEXT, value NUMERIC, stage TEXT, probability INTEGER, notes TEXT, contact_email TEXT, contact_phone TEXT, assigned_to TEXT, created_at TEXT, updated_at TEXT);
ALTER TABLE public.optavel_deal_rooms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "optavel_deal_rooms_policy" ON public.optavel_deal_rooms;
CREATE POLICY "optavel_deal_rooms_policy" ON public.optavel_deal_rooms FOR ALL USING (auth.role() = 'authenticated');

-- optavel_deal_activities
CREATE TABLE IF NOT EXISTS public.optavel_deal_activities (id TEXT PRIMARY KEY, company_id TEXT, deal_id TEXT, activity_type TEXT, notes TEXT, created_by TEXT, created_at TEXT);
ALTER TABLE public.optavel_deal_activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "optavel_deal_activities_policy" ON public.optavel_deal_activities;
CREATE POLICY "optavel_deal_activities_policy" ON public.optavel_deal_activities FOR ALL USING (auth.role() = 'authenticated');

-- optavel_okrs
CREATE TABLE IF NOT EXISTS public.optavel_okrs (id TEXT PRIMARY KEY, company_id TEXT, objective TEXT, key_result TEXT, progress NUMERIC, status TEXT, owner TEXT, due_date TEXT, created_at TEXT, updated_at TEXT);
ALTER TABLE public.optavel_okrs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "optavel_okrs_policy" ON public.optavel_okrs;
CREATE POLICY "optavel_okrs_policy" ON public.optavel_okrs FOR ALL USING (auth.role() = 'authenticated');

-- optavel_decisions
CREATE TABLE IF NOT EXISTS public.optavel_decisions (id TEXT PRIMARY KEY, company_id TEXT, title TEXT, description TEXT, status TEXT, decided_by TEXT, created_at TEXT, updated_at TEXT);
ALTER TABLE public.optavel_decisions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "optavel_decisions_policy" ON public.optavel_decisions;
CREATE POLICY "optavel_decisions_policy" ON public.optavel_decisions FOR ALL USING (auth.role() = 'authenticated');

-- optavel_tasks
CREATE TABLE IF NOT EXISTS public.optavel_tasks (id TEXT PRIMARY KEY, company_id TEXT, title TEXT, description TEXT, status TEXT, priority TEXT, assignee_id TEXT, sprint_id TEXT, created_at TEXT, updated_at TEXT);
ALTER TABLE public.optavel_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "optavel_tasks_policy" ON public.optavel_tasks;
CREATE POLICY "optavel_tasks_policy" ON public.optavel_tasks FOR ALL USING (auth.role() = 'authenticated');

-- optavel_bugs
CREATE TABLE IF NOT EXISTS public.optavel_bugs (id TEXT PRIMARY KEY, company_id TEXT, title TEXT, description TEXT, severity TEXT, status TEXT, product TEXT, reporter_id TEXT, assignee_id TEXT, created_at TEXT, updated_at TEXT);
ALTER TABLE public.optavel_bugs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "optavel_bugs_policy" ON public.optavel_bugs;
CREATE POLICY "optavel_bugs_policy" ON public.optavel_bugs FOR ALL USING (auth.role() = 'authenticated');

-- optavel_sprints
CREATE TABLE IF NOT EXISTS public.optavel_sprints (id TEXT PRIMARY KEY, company_id TEXT, title TEXT, status TEXT, start_date TEXT, end_date TEXT, goal TEXT, created_at TEXT, updated_at TEXT);
ALTER TABLE public.optavel_sprints ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "optavel_sprints_policy" ON public.optavel_sprints;
CREATE POLICY "optavel_sprints_policy" ON public.optavel_sprints FOR ALL USING (auth.role() = 'authenticated');

-- optavel_campaigns
CREATE TABLE IF NOT EXISTS public.optavel_campaigns (id TEXT PRIMARY KEY, company_id TEXT, title TEXT, channel TEXT, status TEXT, budget NUMERIC, spent NUMERIC, start_date TEXT, end_date TEXT, goal TEXT, created_at TEXT, updated_at TEXT);
ALTER TABLE public.optavel_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "optavel_campaigns_policy" ON public.optavel_campaigns;
CREATE POLICY "optavel_campaigns_policy" ON public.optavel_campaigns FOR ALL USING (auth.role() = 'authenticated');

-- optavel_seo_tracking
CREATE TABLE IF NOT EXISTS public.optavel_seo_tracking (id TEXT PRIMARY KEY, company_id TEXT, keyword TEXT, rank INTEGER, previous_rank INTEGER, search_volume INTEGER, url TEXT, created_at TEXT, updated_at TEXT);
ALTER TABLE public.optavel_seo_tracking ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "optavel_seo_tracking_policy" ON public.optavel_seo_tracking;
CREATE POLICY "optavel_seo_tracking_policy" ON public.optavel_seo_tracking FOR ALL USING (auth.role() = 'authenticated');

-- optavel_transactions
CREATE TABLE IF NOT EXISTS public.optavel_transactions (id TEXT PRIMARY KEY, company_id TEXT, amount NUMERIC, type TEXT, category TEXT, description TEXT, date TEXT, created_at TEXT);
ALTER TABLE public.optavel_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "optavel_transactions_policy" ON public.optavel_transactions;
CREATE POLICY "optavel_transactions_policy" ON public.optavel_transactions FOR ALL USING (auth.role() = 'authenticated');

-- optavel_cap_table
CREATE TABLE IF NOT EXISTS public.optavel_cap_table (id TEXT PRIMARY KEY, company_id TEXT, user_id TEXT, shareholder_name TEXT, equity_percentage NUMERIC, shares INTEGER, vesting_schedule TEXT, share_class TEXT, created_at TEXT, updated_at TEXT);
ALTER TABLE public.optavel_cap_table ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "optavel_cap_table_policy" ON public.optavel_cap_table;
CREATE POLICY "optavel_cap_table_policy" ON public.optavel_cap_table FOR ALL USING (auth.role() = 'authenticated');

-- optavel_employees
CREATE TABLE IF NOT EXISTS public.optavel_employees (id TEXT PRIMARY KEY, company_id TEXT, name TEXT, role TEXT, department TEXT, email TEXT, phone TEXT, onboarding_progress INTEGER, status TEXT, start_date TEXT, created_at TEXT, updated_at TEXT);
ALTER TABLE public.optavel_employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "optavel_employees_policy" ON public.optavel_employees;
CREATE POLICY "optavel_employees_policy" ON public.optavel_employees FOR ALL USING (auth.role() = 'authenticated');

-- optavel_leave_requests
CREATE TABLE IF NOT EXISTS public.optavel_leave_requests (id TEXT PRIMARY KEY, company_id TEXT, employee_id TEXT, employee_name TEXT, type TEXT, status TEXT, start_date TEXT, end_date TEXT, reason TEXT, created_at TEXT, updated_at TEXT);
ALTER TABLE public.optavel_leave_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "optavel_leave_requests_policy" ON public.optavel_leave_requests;
CREATE POLICY "optavel_leave_requests_policy" ON public.optavel_leave_requests FOR ALL USING (auth.role() = 'authenticated');

-- optavel_support_tickets
CREATE TABLE IF NOT EXISTS public.optavel_support_tickets (id TEXT PRIMARY KEY, company_id TEXT, title TEXT, description TEXT, status TEXT, severity TEXT, customer_name TEXT, customer_id TEXT, assigned_to TEXT, reporter_id TEXT, resolved_at TEXT, created_at TEXT, updated_at TEXT);
ALTER TABLE public.optavel_support_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "optavel_support_tickets_policy" ON public.optavel_support_tickets;
CREATE POLICY "optavel_support_tickets_policy" ON public.optavel_support_tickets FOR ALL USING (auth.role() = 'authenticated');

-- optavel_nps_responses
CREATE TABLE IF NOT EXISTS public.optavel_nps_responses (id TEXT PRIMARY KEY, company_id TEXT, customer_id TEXT, customer_name TEXT, score INTEGER, feedback TEXT, created_at TEXT);
ALTER TABLE public.optavel_nps_responses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "optavel_nps_responses_policy" ON public.optavel_nps_responses;
CREATE POLICY "optavel_nps_responses_policy" ON public.optavel_nps_responses FOR ALL USING (auth.role() = 'authenticated');

-- optavel_partners
CREATE TABLE IF NOT EXISTS public.optavel_partners (id TEXT PRIMARY KEY, company_id TEXT, name TEXT, type TEXT, status TEXT, revenue_share NUMERIC, contact_name TEXT, contact_email TEXT, notes TEXT, created_at TEXT, updated_at TEXT);
ALTER TABLE public.optavel_partners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "optavel_partners_policy" ON public.optavel_partners;
CREATE POLICY "optavel_partners_policy" ON public.optavel_partners FOR ALL USING (auth.role() = 'authenticated');

-- optavel_commissions
CREATE TABLE IF NOT EXISTS public.optavel_commissions (id TEXT PRIMARY KEY, company_id TEXT, partner_id TEXT, partner_name TEXT, amount NUMERIC, status TEXT, month TEXT, deal_id TEXT, created_at TEXT, updated_at TEXT);
ALTER TABLE public.optavel_commissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "optavel_commissions_policy" ON public.optavel_commissions;
CREATE POLICY "optavel_commissions_policy" ON public.optavel_commissions FOR ALL USING (auth.role() = 'authenticated');

-- optavel_summit_registrations
CREATE TABLE IF NOT EXISTS public.optavel_summit_registrations (id TEXT PRIMARY KEY, company_id TEXT, name TEXT, email TEXT, company_name TEXT, ticket_type TEXT, event_name TEXT, status TEXT, created_at TEXT, updated_at TEXT);
ALTER TABLE public.optavel_summit_registrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "optavel_summit_registrations_policy" ON public.optavel_summit_registrations;
CREATE POLICY "optavel_summit_registrations_policy" ON public.optavel_summit_registrations FOR ALL USING (auth.role() = 'authenticated');

-- optavel_marketing_reports (add missing columns)
CREATE TABLE IF NOT EXISTS public.optavel_marketing_reports (id TEXT PRIMARY KEY, company_id TEXT, campaign_id TEXT, file_url TEXT, file_name TEXT, uploaded_by TEXT, created_at TEXT, updated_at TEXT);
ALTER TABLE public.optavel_marketing_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "optavel_marketing_reports_policy" ON public.optavel_marketing_reports;
CREATE POLICY "optavel_marketing_reports_policy" ON public.optavel_marketing_reports FOR ALL USING (auth.role() = 'authenticated');
