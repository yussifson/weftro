-- Add missing columns to existing OptaVel OS tables

ALTER TABLE public.optavel_okrs 
ADD COLUMN IF NOT EXISTS owner TEXT, 
ADD COLUMN IF NOT EXISTS due_date TEXT;

ALTER TABLE public.optavel_decisions 
ADD COLUMN IF NOT EXISTS description TEXT, 
ADD COLUMN IF NOT EXISTS decided_by TEXT;

ALTER TABLE public.optavel_cap_table 
ADD COLUMN IF NOT EXISTS shareholder_name TEXT, 
ADD COLUMN IF NOT EXISTS share_class TEXT;

ALTER TABLE public.optavel_campaigns 
ADD COLUMN IF NOT EXISTS channel TEXT, 
ADD COLUMN IF NOT EXISTS goal TEXT, 
ADD COLUMN IF NOT EXISTS start_date TEXT, 
ADD COLUMN IF NOT EXISTS end_date TEXT;

ALTER TABLE public.optavel_seo_tracking 
ADD COLUMN IF NOT EXISTS previous_rank INTEGER, 
ADD COLUMN IF NOT EXISTS url TEXT;

ALTER TABLE public.optavel_deal_rooms 
ADD COLUMN IF NOT EXISTS contact_phone TEXT;

ALTER TABLE public.optavel_tasks 
ADD COLUMN IF NOT EXISTS sprint_id TEXT;

ALTER TABLE public.optavel_bugs 
ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE public.optavel_sprints 
ADD COLUMN IF NOT EXISTS goal TEXT;

ALTER TABLE public.optavel_transactions 
ADD COLUMN IF NOT EXISTS type TEXT, 
ADD COLUMN IF NOT EXISTS category TEXT, 
ADD COLUMN IF NOT EXISTS date TEXT, 
ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE public.optavel_support_tickets 
ADD COLUMN IF NOT EXISTS customer_name TEXT, 
ADD COLUMN IF NOT EXISTS resolution_time_hrs INTEGER, 
ADD COLUMN IF NOT EXISTS assignee_id TEXT;

ALTER TABLE public.optavel_nps_responses 
ADD COLUMN IF NOT EXISTS customer_name TEXT, 
ADD COLUMN IF NOT EXISTS user_id TEXT;

ALTER TABLE public.optavel_deal_activities 
ADD COLUMN IF NOT EXISTS activity_type TEXT, 
ADD COLUMN IF NOT EXISTS notes TEXT, 
ADD COLUMN IF NOT EXISTS created_by TEXT;

ALTER TABLE public.optavel_partners 
ADD COLUMN IF NOT EXISTS contact_name TEXT, 
ADD COLUMN IF NOT EXISTS contact_email TEXT, 
ADD COLUMN IF NOT EXISTS revenue_share NUMERIC;

ALTER TABLE public.optavel_employees 
ADD COLUMN IF NOT EXISTS phone TEXT, 
ADD COLUMN IF NOT EXISTS department TEXT;
