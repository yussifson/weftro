-- Drop NOT NULL constraints on legacy columns to allow saving with the new basic_salary schema
ALTER TABLE public.univ_payroll ALTER COLUMN base_salary DROP NOT NULL;
ALTER TABLE public.univ_payroll ALTER COLUMN employee_id DROP NOT NULL;
