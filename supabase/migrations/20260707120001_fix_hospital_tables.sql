-- Fix Hospital Persistence and Schema Errors

-- 1. Add missing columns to univ_opd_queues
ALTER TABLE public.univ_opd_queues ADD COLUMN IF NOT EXISTS doctor_id TEXT;

-- 2. Add missing columns to univ_referrals
ALTER TABLE public.univ_referrals ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3. Fix Blood Bank NOT NULL constraint
ALTER TABLE public.univ_blood_bank ALTER COLUMN donor_name DROP NOT NULL;

-- 4. Ensure duty rosters has all columns
ALTER TABLE public.univ_duty_rosters ADD COLUMN IF NOT EXISTS staff_id TEXT;
ALTER TABLE public.univ_duty_rosters ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE public.univ_duty_rosters ADD COLUMN IF NOT EXISTS shift_date TEXT;
ALTER TABLE public.univ_duty_rosters ADD COLUMN IF NOT EXISTS shift_type TEXT;
ALTER TABLE public.univ_duty_rosters ADD COLUMN IF NOT EXISTS start_time TEXT;
ALTER TABLE public.univ_duty_rosters ADD COLUMN IF NOT EXISTS end_time TEXT;
ALTER TABLE public.univ_duty_rosters ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE public.univ_duty_rosters ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.univ_duty_rosters ALTER COLUMN staff_id DROP NOT NULL;
ALTER TABLE public.univ_duty_rosters ALTER COLUMN department DROP NOT NULL;
ALTER TABLE public.univ_duty_rosters ALTER COLUMN shift_date DROP NOT NULL;

-- 5. Ensure infection logs has all columns
ALTER TABLE public.univ_infection_logs ADD COLUMN IF NOT EXISTS patient_id TEXT;
ALTER TABLE public.univ_infection_logs ADD COLUMN IF NOT EXISTS ward_id TEXT;
ALTER TABLE public.univ_infection_logs ADD COLUMN IF NOT EXISTS infection_type TEXT;
ALTER TABLE public.univ_infection_logs ADD COLUMN IF NOT EXISTS organism TEXT;
ALTER TABLE public.univ_infection_logs ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE public.univ_infection_logs ADD COLUMN IF NOT EXISTS detection_date TEXT;
ALTER TABLE public.univ_infection_logs ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE public.univ_infection_logs ADD COLUMN IF NOT EXISTS resolution_date TEXT;
ALTER TABLE public.univ_infection_logs ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.univ_infection_logs ALTER COLUMN patient_id DROP NOT NULL;
ALTER TABLE public.univ_infection_logs ALTER COLUMN infection_type DROP NOT NULL;
