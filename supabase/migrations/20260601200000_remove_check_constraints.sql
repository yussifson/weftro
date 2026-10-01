-- Remove strict type and status constraints to allow polymorphic industry data
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_type_check;
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_status_check;

ALTER TABLE public.legal_cases DROP CONSTRAINT IF EXISTS legal_cases_type_check;
ALTER TABLE public.legal_cases DROP CONSTRAINT IF EXISTS legal_cases_status_check;

ALTER TABLE public.hearings DROP CONSTRAINT IF EXISTS hearings_type_check;
ALTER TABLE public.hearings DROP CONSTRAINT IF EXISTS hearings_status_check;