-- Remove remaining case_type constraints
ALTER TABLE public.legal_cases DROP CONSTRAINT IF EXISTS legal_cases_case_type_check;