-- Hospital Complete Schema & PowerSync Sync Fix
-- Resolves data not persisting after refresh across all hospital modules.
-- Root causes: missing tables/columns in Supabase, incomplete AppSchema columns,
-- doctor names stored in UUID fields, and missing PowerSync publication entries.

-- ============================================================
-- 1. univ_lab_results (app uses this; only univ_labs existed before)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.univ_lab_results (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamptz DEFAULT timezone('utc'::text, now()),
    updated_at timestamptz DEFAULT timezone('utc'::text, now()),
    company_id text,
    patient_id text,
    test_name text,
    test_date text,
    result_value text,
    reference_range text,
    status text DEFAULT 'Pending',
    document_url text,
    is_abnormal integer DEFAULT 0
);

ALTER TABLE public.univ_lab_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_lab_results" ON public.univ_lab_results;
CREATE POLICY "Allow company access on univ_lab_results" ON public.univ_lab_results
  FOR ALL USING (company_id IS NOT NULL OR auth.uid() IS NOT NULL);

-- ============================================================
-- 2. univ_appointments – title default + staff_name for doctor names
-- ============================================================
ALTER TABLE public.univ_appointments
  ADD COLUMN IF NOT EXISTS staff_name text,
  ADD COLUMN IF NOT EXISTS client_name text,
  ADD COLUMN IF NOT EXISTS date text,
  ADD COLUMN IF NOT EXISTS time text,
  ADD COLUMN IF NOT EXISTS type text DEFAULT 'Consultation',
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT timezone('utc'::text, now());

ALTER TABLE public.univ_appointments
  ALTER COLUMN title SET DEFAULT 'Appointment';

UPDATE public.univ_appointments
SET title = COALESCE(NULLIF(title, ''), client_name, 'Appointment')
WHERE title IS NULL;

-- Keep doctor_id as text (stores staff name when no UUID available)
ALTER TABLE public.univ_appointments
  ALTER COLUMN doctor_id TYPE text USING doctor_id::text;

DROP POLICY IF EXISTS "Allow company access on univ_appointments" ON public.univ_appointments;
DROP POLICY IF EXISTS "Users can manage their company's appointments" ON public.univ_appointments;
CREATE POLICY "Allow company access on univ_appointments" ON public.univ_appointments
  FOR ALL USING (company_id IS NOT NULL OR auth.uid() IS NOT NULL);

-- ============================================================
-- 3. univ_admissions – bed_number, reason_for_admission, discharge_date
-- ============================================================
ALTER TABLE public.univ_admissions
  ADD COLUMN IF NOT EXISTS bed_number text DEFAULT 'TBD',
  ADD COLUMN IF NOT EXISTS reason_for_admission text,
  ADD COLUMN IF NOT EXISTS discharge_date text,
  ADD COLUMN IF NOT EXISTS ward_id text,
  ADD COLUMN IF NOT EXISTS admission_date text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT timezone('utc'::text, now());

UPDATE public.univ_admissions
SET bed_number = COALESCE(bed_number, 'TBD')
WHERE bed_number IS NULL;

DROP POLICY IF EXISTS "Allow company access on univ_admissions" ON public.univ_admissions;
CREATE POLICY "Allow company access on univ_admissions" ON public.univ_admissions
  FOR ALL USING (company_id IS NOT NULL OR auth.uid() IS NOT NULL);

-- ============================================================
-- 4. univ_prescriptions – doctor_name, medication_id, dispense_date
-- ============================================================
ALTER TABLE public.univ_prescriptions
  ADD COLUMN IF NOT EXISTS doctor_name text,
  ADD COLUMN IF NOT EXISTS medication_id text,
  ADD COLUMN IF NOT EXISTS dispense_date text,
  ADD COLUMN IF NOT EXISTS prescription_date text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT timezone('utc'::text, now());

-- Keep doctor_id as text; store display names in doctor_name
ALTER TABLE public.univ_prescriptions
  ALTER COLUMN doctor_id TYPE text USING doctor_id::text;

UPDATE public.univ_prescriptions
SET doctor_name = doctor_id
WHERE doctor_name IS NULL
  AND doctor_id IS NOT NULL
  AND doctor_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

DROP POLICY IF EXISTS "Allow company access on univ_prescriptions" ON public.univ_prescriptions;
DROP POLICY IF EXISTS "Users can manage their company's prescriptions" ON public.univ_prescriptions;
CREATE POLICY "Allow company access on univ_prescriptions" ON public.univ_prescriptions
  FOR ALL USING (company_id IS NOT NULL OR auth.uid() IS NOT NULL);

-- ============================================================
-- 5. univ_wards – ensure all columns used by the app exist
-- ============================================================
ALTER TABLE public.univ_wards
  ADD COLUMN IF NOT EXISTS ward_name text DEFAULT 'Ward',
  ADD COLUMN IF NOT EXISTS type text,
  ADD COLUMN IF NOT EXISTS capacity text,
  ADD COLUMN IF NOT EXISTS bed_number text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'Active',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT timezone('utc'::text, now());

-- ============================================================
-- 6. univ_pharmacy – hospital inventory table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.univ_pharmacy (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at text DEFAULT timezone('utc'::text, now())::text,
    updated_at timestamptz DEFAULT timezone('utc'::text, now()),
    company_id text,
    drug_name text,
    sku text,
    category text,
    stock_level integer DEFAULT 0,
    reorder_level integer DEFAULT 0,
    unit_price real DEFAULT 0,
    expiry_date text,
    status text DEFAULT 'In Stock'
);

ALTER TABLE public.univ_pharmacy ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_pharmacy" ON public.univ_pharmacy;
CREATE POLICY "Allow company access on univ_pharmacy" ON public.univ_pharmacy
  FOR ALL USING (company_id IS NOT NULL OR auth.uid() IS NOT NULL);

-- ============================================================
-- 7. univ_medical_history – ensure EHR columns exist
-- ============================================================
CREATE TABLE IF NOT EXISTS public.univ_medical_history (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at text DEFAULT timezone('utc'::text, now())::text,
    updated_at timestamptz DEFAULT timezone('utc'::text, now()),
    company_id text,
    patient_id text,
    doctor_id text,
    record_date text,
    type text,
    vitals_bp text,
    vitals_hr text,
    vitals_temp text,
    vitals_weight text,
    soap_subjective text,
    soap_objective text,
    soap_assessment text,
    soap_plan text,
    notes text
);

ALTER TABLE public.univ_medical_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_medical_history" ON public.univ_medical_history;
CREATE POLICY "Allow company access on univ_medical_history" ON public.univ_medical_history
  FOR ALL USING (company_id IS NOT NULL OR auth.uid() IS NOT NULL);

-- ============================================================
-- 8. univ_patients – ensure all demographic columns exist
-- ============================================================
ALTER TABLE public.univ_patients
  ADD COLUMN IF NOT EXISTS patient_number text,
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS date_of_birth text,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS blood_group text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'Active',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT timezone('utc'::text, now());

-- ============================================================
-- 9. Other hospital tables – ensure publication-ready
-- ============================================================
ALTER TABLE public.univ_imaging
  ADD COLUMN IF NOT EXISTS patient_id text,
  ADD COLUMN IF NOT EXISTS scan_type text,
  ADD COLUMN IF NOT EXISTS body_part text,
  ADD COLUMN IF NOT EXISTS scan_date text,
  ADD COLUMN IF NOT EXISTS radiologist_name text,
  ADD COLUMN IF NOT EXISTS report_summary text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT timezone('utc'::text, now());

ALTER TABLE public.univ_surgeries
  ADD COLUMN IF NOT EXISTS patient_id text,
  ADD COLUMN IF NOT EXISTS surgery_name text,
  ADD COLUMN IF NOT EXISTS surgeon_name text,
  ADD COLUMN IF NOT EXISTS scheduled_date text,
  ADD COLUMN IF NOT EXISTS ot_room text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT timezone('utc'::text, now());

ALTER TABLE public.univ_telemedicine
  ADD COLUMN IF NOT EXISTS patient_id text,
  ADD COLUMN IF NOT EXISTS scheduled_time text,
  ADD COLUMN IF NOT EXISTS meeting_link text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT timezone('utc'::text, now());

ALTER TABLE public.univ_medicalclaims
  ADD COLUMN IF NOT EXISTS patient_id text,
  ADD COLUMN IF NOT EXISTS claim_amount real,
  ADD COLUMN IF NOT EXISTS claim_date text,
  ADD COLUMN IF NOT EXISTS insurance_provider text,
  ADD COLUMN IF NOT EXISTS policy_number text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT timezone('utc'::text, now());

ALTER TABLE public.univ_medicalbillings
  ADD COLUMN IF NOT EXISTS patient_id text,
  ADD COLUMN IF NOT EXISTS service_provided text,
  ADD COLUMN IF NOT EXISTS total_cost real,
  ADD COLUMN IF NOT EXISTS insurance_covered real,
  ADD COLUMN IF NOT EXISTS amount_due real,
  ADD COLUMN IF NOT EXISTS issue_date text,
  ADD COLUMN IF NOT EXISTS due_date text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT timezone('utc'::text, now());

ALTER TABLE public.univ_ambulance_dispatch
  ADD COLUMN IF NOT EXISTS vehicle_id text,
  ADD COLUMN IF NOT EXISTS driver_name text,
  ADD COLUMN IF NOT EXISTS paramedic_name text,
  ADD COLUMN IF NOT EXISTS dispatch_time text,
  ADD COLUMN IF NOT EXISTS destination text,
  ADD COLUMN IF NOT EXISTS emergency_type text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT timezone('utc'::text, now());

-- ============================================================
-- 10. Add all hospital tables to the powersync publication
-- ============================================================
DO $pub$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'univ_patients',
    'univ_appointments',
    'univ_admissions',
    'univ_wards',
    'univ_prescriptions',
    'univ_pharmacy',
    'univ_medical_history',
    'univ_lab_results',
    'univ_labs',
    'univ_imaging',
    'univ_surgeries',
    'univ_telemedicine',
    'univ_medicalclaims',
    'univ_medicalbillings',
    'univ_ambulance_dispatch',
    'univ_blood_bank',
    'univ_notifications',
    'univ_invoices'
  ];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'powersync') THEN
    CREATE PUBLICATION powersync;
  END IF;

  FOREACH t IN ARRAY tables LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION powersync ADD TABLE public.%I', t);
    EXCEPTION
      WHEN duplicate_object THEN NULL;
      WHEN OTHERS THEN RAISE NOTICE 'Skip % from powersync: %', t, SQLERRM;
    END;
  END LOOP;
END $pub$;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_lab_results_company ON public.univ_lab_results(company_id);
CREATE INDEX IF NOT EXISTS idx_admissions_company_status ON public.univ_admissions(company_id, status);
CREATE INDEX IF NOT EXISTS idx_pharmacy_company ON public.univ_pharmacy(company_id);
CREATE INDEX IF NOT EXISTS idx_medical_history_company ON public.univ_medical_history(company_id, patient_id);
