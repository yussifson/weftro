-- Relax constraints and add text columns to support UI components
ALTER TABLE public.univ_attendance ADD COLUMN IF NOT EXISTS employee_name TEXT;
ALTER TABLE public.univ_attendance ALTER COLUMN employee_id DROP NOT NULL;

ALTER TABLE public.univ_leave_management ADD COLUMN IF NOT EXISTS employee_name TEXT;
ALTER TABLE public.univ_leave_management ALTER COLUMN employee_id DROP NOT NULL;

ALTER TABLE public.univ_payments ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE public.univ_payments ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE public.univ_assets ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE public.univ_procurement ADD COLUMN IF NOT EXISTS item_name TEXT;
