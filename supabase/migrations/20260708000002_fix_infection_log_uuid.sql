-- Change reported_by from UUID to TEXT to allow 'System Admin' and other string inputs
ALTER TABLE public.univ_infection_logs ALTER COLUMN reported_by TYPE text USING reported_by::text;
