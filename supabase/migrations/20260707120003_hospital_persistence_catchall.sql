-- univ_infection_logs
ALTER TABLE public.univ_infection_logs ADD COLUMN IF NOT EXISTS patient_id TEXT;
ALTER TABLE public.univ_infection_logs ADD COLUMN IF NOT EXISTS ward_id TEXT;
ALTER TABLE public.univ_infection_logs ADD COLUMN IF NOT EXISTS infection_type TEXT;
ALTER TABLE public.univ_infection_logs ADD COLUMN IF NOT EXISTS organism TEXT;
ALTER TABLE public.univ_infection_logs ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE public.univ_infection_logs ADD COLUMN IF NOT EXISTS detection_date TEXT;
ALTER TABLE public.univ_infection_logs ADD COLUMN IF NOT EXISTS control_measures TEXT;
ALTER TABLE public.univ_infection_logs ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE public.univ_infection_logs ADD COLUMN IF NOT EXISTS reported_by TEXT;

-- univ_staff_shifts
ALTER TABLE public.univ_staff_shifts ADD COLUMN IF NOT EXISTS staff_id TEXT;
ALTER TABLE public.univ_staff_shifts ADD COLUMN IF NOT EXISTS shift_date TEXT;
ALTER TABLE public.univ_staff_shifts ADD COLUMN IF NOT EXISTS shift_type TEXT;
ALTER TABLE public.univ_staff_shifts ADD COLUMN IF NOT EXISTS ward_or_department TEXT;
ALTER TABLE public.univ_staff_shifts ADD COLUMN IF NOT EXISTS on_call TEXT;
ALTER TABLE public.univ_staff_shifts ADD COLUMN IF NOT EXISTS updated_at TEXT;

-- univ_opd_queues
ALTER TABLE public.univ_opd_queues ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE public.univ_opd_queues ADD COLUMN IF NOT EXISTS token_number TEXT;
ALTER TABLE public.univ_opd_queues ADD COLUMN IF NOT EXISTS doctor_id TEXT;
ALTER TABLE public.univ_opd_queues ADD COLUMN IF NOT EXISTS room_number TEXT;
ALTER TABLE public.univ_opd_queues ADD COLUMN IF NOT EXISTS patient_id TEXT;
ALTER TABLE public.univ_opd_queues ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE public.univ_opd_queues ADD COLUMN IF NOT EXISTS updated_at TEXT;

-- univ_blood_bank
ALTER TABLE public.univ_blood_bank ADD COLUMN IF NOT EXISTS blood_group TEXT;
ALTER TABLE public.univ_blood_bank ADD COLUMN IF NOT EXISTS unit_number TEXT;
ALTER TABLE public.univ_blood_bank ADD COLUMN IF NOT EXISTS component_type TEXT;
ALTER TABLE public.univ_blood_bank ADD COLUMN IF NOT EXISTS donor_name TEXT;
ALTER TABLE public.univ_blood_bank ADD COLUMN IF NOT EXISTS collection_date TEXT;
ALTER TABLE public.univ_blood_bank ADD COLUMN IF NOT EXISTS expiry_date TEXT;
ALTER TABLE public.univ_blood_bank ADD COLUMN IF NOT EXISTS units_available TEXT;
ALTER TABLE public.univ_blood_bank ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE public.univ_blood_bank ADD COLUMN IF NOT EXISTS updated_at TEXT;
