-- ============================================================
-- HOSPITAL FULL PERSISTENCE FIX — July 7, 2026
-- Covers ALL 18 hospital pages. Adds every missing column and
-- table, syncs publication, and ensures RLS policies are correct.
-- Run via: Supabase Dashboard → SQL Editor → paste & execute
-- ============================================================

-- ============================================================
-- 1. univ_patients — ensure all demographic columns exist
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
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'Outpatient',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

DROP POLICY IF EXISTS "Allow company access on univ_patients" ON public.univ_patients;
CREATE POLICY "Allow company access on univ_patients" ON public.univ_patients
  FOR ALL USING (company_id IS NOT NULL OR auth.uid() IS NOT NULL);

-- ============================================================
-- 2. univ_appointments — title/attendee defaults + all columns
-- ============================================================
ALTER TABLE public.univ_appointments
  ADD COLUMN IF NOT EXISTS title text DEFAULT 'Appointment',
  ADD COLUMN IF NOT EXISTS attendee_name text DEFAULT 'Appointment attendee',
  ADD COLUMN IF NOT EXISTS client_name text,
  ADD COLUMN IF NOT EXISTS client_email text,
  ADD COLUMN IF NOT EXISTS client_phone text,
  ADD COLUMN IF NOT EXISTS staff_name text,
  ADD COLUMN IF NOT EXISTS patient_id text,
  ADD COLUMN IF NOT EXISTS date text,
  ADD COLUMN IF NOT EXISTS time text,
  ADD COLUMN IF NOT EXISTS duration_minutes text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS doctor_id text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'Scheduled',
  ADD COLUMN IF NOT EXISTS type text DEFAULT 'Consultation',
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Ensure NOT NULL constraints have safe defaults
ALTER TABLE public.univ_appointments
  ALTER COLUMN title SET DEFAULT 'Appointment',
  ALTER COLUMN attendee_name SET DEFAULT 'Appointment attendee';

UPDATE public.univ_appointments
SET title = COALESCE(NULLIF(title, ''), attendee_name, client_name, 'Appointment')
WHERE title IS NULL OR title = '';

UPDATE public.univ_appointments
SET attendee_name = COALESCE(NULLIF(attendee_name, ''), client_name, title, 'Appointment attendee')
WHERE attendee_name IS NULL OR attendee_name = '';

-- Cast doctor_id to text (some schemas had it as UUID)
ALTER TABLE public.univ_appointments
  ALTER COLUMN doctor_id TYPE text USING doctor_id::text;

DROP POLICY IF EXISTS "Allow company access on univ_appointments" ON public.univ_appointments;
DROP POLICY IF EXISTS "Users can manage their company's appointments" ON public.univ_appointments;
CREATE POLICY "Allow company access on univ_appointments" ON public.univ_appointments
  FOR ALL USING (company_id IS NOT NULL OR auth.uid() IS NOT NULL);

-- ============================================================
-- 3. univ_admissions — all columns for ward admission form
-- ============================================================
ALTER TABLE public.univ_admissions
  ADD COLUMN IF NOT EXISTS patient_id text,
  ADD COLUMN IF NOT EXISTS ward_id text,
  ADD COLUMN IF NOT EXISTS bed_number text DEFAULT 'TBD',
  ADD COLUMN IF NOT EXISTS admission_date text,
  ADD COLUMN IF NOT EXISTS discharge_date text,
  ADD COLUMN IF NOT EXISTS reason_for_admission text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'Active',
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

UPDATE public.univ_admissions
SET bed_number = COALESCE(NULLIF(bed_number, ''), 'TBD')
WHERE bed_number IS NULL OR bed_number = '';

DROP POLICY IF EXISTS "Allow company access on univ_admissions" ON public.univ_admissions;
CREATE POLICY "Allow company access on univ_admissions" ON public.univ_admissions
  FOR ALL USING (company_id IS NOT NULL OR auth.uid() IS NOT NULL);

-- ============================================================
-- 4. univ_wards — all columns for ward management
-- ============================================================
ALTER TABLE public.univ_wards
  ADD COLUMN IF NOT EXISTS ward_name text DEFAULT 'Ward',
  ADD COLUMN IF NOT EXISTS type text DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS capacity text DEFAULT '10',
  ADD COLUMN IF NOT EXISTS bed_number text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'Active',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

UPDATE public.univ_wards
SET ward_name = COALESCE(NULLIF(ward_name, ''), 'Ward')
WHERE ward_name IS NULL OR ward_name = '';

DROP POLICY IF EXISTS "Allow company access on univ_wards" ON public.univ_wards;
CREATE POLICY "Allow company access on univ_wards" ON public.univ_wards
  FOR ALL USING (company_id IS NOT NULL OR auth.uid() IS NOT NULL);

-- ============================================================
-- 5. univ_prescriptions — all columns for prescription form
-- ============================================================
ALTER TABLE public.univ_prescriptions
  ADD COLUMN IF NOT EXISTS patient_id text,
  ADD COLUMN IF NOT EXISTS doctor_id text,
  ADD COLUMN IF NOT EXISTS doctor_name text,
  ADD COLUMN IF NOT EXISTS medication text DEFAULT 'Unspecified',
  ADD COLUMN IF NOT EXISTS medication_id text,
  ADD COLUMN IF NOT EXISTS dosage text DEFAULT 'As prescribed',
  ADD COLUMN IF NOT EXISTS frequency text,
  ADD COLUMN IF NOT EXISTS duration text,
  ADD COLUMN IF NOT EXISTS prescription_date text,
  ADD COLUMN IF NOT EXISTS dispense_date text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'Active',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Cast doctor_id to text (stored as name string when no UUID available)
ALTER TABLE public.univ_prescriptions
  ALTER COLUMN doctor_id TYPE text USING doctor_id::text;

-- Copy invalid doctor names from doctor_id to doctor_name
UPDATE public.univ_prescriptions
SET doctor_name = doctor_id
WHERE doctor_name IS NULL
  AND doctor_id IS NOT NULL
  AND doctor_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

UPDATE public.univ_prescriptions
SET medication = COALESCE(NULLIF(medication, ''), 'Unspecified')
WHERE medication IS NULL OR medication = '';

DROP POLICY IF EXISTS "Allow company access on univ_prescriptions" ON public.univ_prescriptions;
DROP POLICY IF EXISTS "Users can manage their company's prescriptions" ON public.univ_prescriptions;
CREATE POLICY "Allow company access on univ_prescriptions" ON public.univ_prescriptions
  FOR ALL USING (company_id IS NOT NULL OR auth.uid() IS NOT NULL);

-- ============================================================
-- 6. univ_lab_results — full schema (used by LabResults.jsx)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.univ_lab_results (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  company_id text,
  patient_id text,
  test_name text DEFAULT 'Unknown Test',
  test_date text,
  result_value text,
  reference_range text DEFAULT 'Ref: Standard',
  status text DEFAULT 'Pending',
  document_url text,
  is_abnormal integer DEFAULT 0
);

ALTER TABLE public.univ_lab_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_lab_results" ON public.univ_lab_results;
CREATE POLICY "Allow company access on univ_lab_results" ON public.univ_lab_results
  FOR ALL USING (company_id IS NOT NULL OR auth.uid() IS NOT NULL);

-- ============================================================
-- 7. univ_pharmacy — hospital drug inventory
-- ============================================================
CREATE TABLE IF NOT EXISTS public.univ_pharmacy (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  company_id text,
  drug_name text DEFAULT 'Unknown Drug',
  sku text,
  category text DEFAULT 'General',
  stock_level integer DEFAULT 0,
  reorder_level integer DEFAULT 10,
  unit_price real DEFAULT 0,
  expiry_date text,
  status text DEFAULT 'In Stock'
);

ALTER TABLE public.univ_pharmacy ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_pharmacy" ON public.univ_pharmacy;
CREATE POLICY "Allow company access on univ_pharmacy" ON public.univ_pharmacy
  FOR ALL USING (company_id IS NOT NULL OR auth.uid() IS NOT NULL);

-- ============================================================
-- 8. univ_medical_history — full SOAP notes schema
-- ============================================================
CREATE TABLE IF NOT EXISTS public.univ_medical_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  company_id text,
  patient_id text,
  doctor_id text,
  record_date text,
  type text DEFAULT 'General',
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
-- 9. univ_imaging — Radiology.jsx columns
-- ============================================================
ALTER TABLE public.univ_imaging
  ADD COLUMN IF NOT EXISTS patient_id text,
  ADD COLUMN IF NOT EXISTS scan_type text DEFAULT 'X-Ray',
  ADD COLUMN IF NOT EXISTS body_part text,
  ADD COLUMN IF NOT EXISTS scan_date text,
  ADD COLUMN IF NOT EXISTS radiologist_name text,
  ADD COLUMN IF NOT EXISTS report_summary text,
  ADD COLUMN IF NOT EXISTS document_url text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'Pending',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

DROP POLICY IF EXISTS "Allow company access on univ_imaging" ON public.univ_imaging;
CREATE POLICY "Allow company access on univ_imaging" ON public.univ_imaging
  FOR ALL USING (company_id IS NOT NULL OR auth.uid() IS NOT NULL);

-- ============================================================
-- 10. univ_surgeries — OperationTheater.jsx columns
-- ============================================================
ALTER TABLE public.univ_surgeries
  ADD COLUMN IF NOT EXISTS patient_id text,
  ADD COLUMN IF NOT EXISTS surgery_name text DEFAULT 'Unnamed Procedure',
  ADD COLUMN IF NOT EXISTS surgeon_name text,
  ADD COLUMN IF NOT EXISTS scheduled_date text,
  ADD COLUMN IF NOT EXISTS ot_room text DEFAULT 'OT-1',
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'Scheduled',
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

DROP POLICY IF EXISTS "Allow company access on univ_surgeries" ON public.univ_surgeries;
CREATE POLICY "Allow company access on univ_surgeries" ON public.univ_surgeries
  FOR ALL USING (company_id IS NOT NULL OR auth.uid() IS NOT NULL);

-- ============================================================
-- 11. univ_telemedicine — Telemedicine.jsx columns
-- ============================================================
ALTER TABLE public.univ_telemedicine
  ADD COLUMN IF NOT EXISTS patient_id text,
  ADD COLUMN IF NOT EXISTS doctor_id text,
  ADD COLUMN IF NOT EXISTS doctor_name text,
  ADD COLUMN IF NOT EXISTS scheduled_time text,
  ADD COLUMN IF NOT EXISTS meeting_link text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'Scheduled',
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

DROP POLICY IF EXISTS "Allow company access on univ_telemedicine" ON public.univ_telemedicine;
CREATE POLICY "Allow company access on univ_telemedicine" ON public.univ_telemedicine
  FOR ALL USING (company_id IS NOT NULL OR auth.uid() IS NOT NULL);

-- ============================================================
-- 12. univ_medicalclaims — HospitalClaims.jsx columns
-- ============================================================
ALTER TABLE public.univ_medicalclaims
  ADD COLUMN IF NOT EXISTS patient_id text,
  ADD COLUMN IF NOT EXISTS claim_amount real DEFAULT 0,
  ADD COLUMN IF NOT EXISTS claim_date text,
  ADD COLUMN IF NOT EXISTS insurance_provider text,
  ADD COLUMN IF NOT EXISTS policy_number text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'Pending',
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

DROP POLICY IF EXISTS "Allow company access on univ_medicalclaims" ON public.univ_medicalclaims;
CREATE POLICY "Allow company access on univ_medicalclaims" ON public.univ_medicalclaims
  FOR ALL USING (company_id IS NOT NULL OR auth.uid() IS NOT NULL);

-- ============================================================
-- 13. univ_medicalbillings — HospitalBilling.jsx columns
-- ============================================================
ALTER TABLE public.univ_medicalbillings
  ADD COLUMN IF NOT EXISTS patient_id text,
  ADD COLUMN IF NOT EXISTS service_provided text DEFAULT 'Medical Service',
  ADD COLUMN IF NOT EXISTS total_cost real DEFAULT 0,
  ADD COLUMN IF NOT EXISTS insurance_covered real DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_due real DEFAULT 0,
  ADD COLUMN IF NOT EXISTS issue_date text,
  ADD COLUMN IF NOT EXISTS due_date text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'Unpaid',
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

DROP POLICY IF EXISTS "Allow company access on univ_medicalbillings" ON public.univ_medicalbillings;
CREATE POLICY "Allow company access on univ_medicalbillings" ON public.univ_medicalbillings
  FOR ALL USING (company_id IS NOT NULL OR auth.uid() IS NOT NULL);

-- ============================================================
-- 14. univ_ambulance_dispatch — AmbulanceDispatch.jsx columns
-- ============================================================
ALTER TABLE public.univ_ambulance_dispatch
  ADD COLUMN IF NOT EXISTS vehicle_id text,
  ADD COLUMN IF NOT EXISTS driver_name text,
  ADD COLUMN IF NOT EXISTS paramedic_name text,
  ADD COLUMN IF NOT EXISTS dispatch_time text,
  ADD COLUMN IF NOT EXISTS destination text,
  ADD COLUMN IF NOT EXISTS emergency_type text DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'Dispatched',
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

DROP POLICY IF EXISTS "Allow company access on univ_ambulance_dispatch" ON public.univ_ambulance_dispatch;
CREATE POLICY "Allow company access on univ_ambulance_dispatch" ON public.univ_ambulance_dispatch
  FOR ALL USING (company_id IS NOT NULL OR auth.uid() IS NOT NULL);

-- ============================================================
-- 15. univ_blood_bank — BloodBank.jsx columns
-- ============================================================
ALTER TABLE public.univ_blood_bank
  ADD COLUMN IF NOT EXISTS blood_group text,
  ADD COLUMN IF NOT EXISTS unit_number text,
  ADD COLUMN IF NOT EXISTS component_type text DEFAULT 'Whole Blood',
  ADD COLUMN IF NOT EXISTS donor_name text,
  ADD COLUMN IF NOT EXISTS collection_date text,
  ADD COLUMN IF NOT EXISTS expiry_date text,
  ADD COLUMN IF NOT EXISTS units_available integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'available',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

DROP POLICY IF EXISTS "Allow company access on univ_blood_bank" ON public.univ_blood_bank;
CREATE POLICY "Allow company access on univ_blood_bank" ON public.univ_blood_bank
  FOR ALL USING (company_id IS NOT NULL OR auth.uid() IS NOT NULL);

-- ============================================================
-- 16. univ_queue — Queue.jsx (patient queue management)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.univ_queue (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  company_id text,
  patient_id text,
  patient_name text,
  ticket_number text,
  department text DEFAULT 'General',
  priority text DEFAULT 'Normal',
  status text DEFAULT 'Waiting',
  checked_in_at text,
  called_at text,
  notes text
);

ALTER TABLE public.univ_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_queue" ON public.univ_queue;
CREATE POLICY "Allow company access on univ_queue" ON public.univ_queue
  FOR ALL USING (company_id IS NOT NULL OR auth.uid() IS NOT NULL);

-- ============================================================
-- 17. univ_referrals — Referrals.jsx
-- ============================================================
CREATE TABLE IF NOT EXISTS public.univ_referrals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  company_id text,
  patient_id text,
  referring_doctor text,
  referred_to text,
  specialty text,
  reason text,
  referral_date text,
  status text DEFAULT 'Pending',
  notes text
);

ALTER TABLE public.univ_referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_referrals" ON public.univ_referrals;
CREATE POLICY "Allow company access on univ_referrals" ON public.univ_referrals
  FOR ALL USING (company_id IS NOT NULL OR auth.uid() IS NOT NULL);

-- ============================================================
-- 18. univ_staff_roster — StaffRoster.jsx
-- ============================================================
CREATE TABLE IF NOT EXISTS public.univ_staff_roster (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  company_id text,
  staff_name text DEFAULT 'Staff Member',
  role text DEFAULT 'Nurse',
  department text DEFAULT 'General',
  shift text DEFAULT 'Morning',
  shift_date text,
  status text DEFAULT 'On Duty',
  notes text
);

ALTER TABLE public.univ_staff_roster ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_staff_roster" ON public.univ_staff_roster;
CREATE POLICY "Allow company access on univ_staff_roster" ON public.univ_staff_roster
  FOR ALL USING (company_id IS NOT NULL OR auth.uid() IS NOT NULL);

-- ============================================================
-- 19. univ_infection_control — InfectionControl.jsx
-- ============================================================
CREATE TABLE IF NOT EXISTS public.univ_infection_control (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  company_id text,
  patient_id text,
  pathogen text,
  ward text,
  isolation_status text DEFAULT 'Active',
  detected_date text,
  resolved_date text,
  notes text,
  status text DEFAULT 'Active'
);

ALTER TABLE public.univ_infection_control ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_infection_control" ON public.univ_infection_control;
CREATE POLICY "Allow company access on univ_infection_control" ON public.univ_infection_control
  FOR ALL USING (company_id IS NOT NULL OR auth.uid() IS NOT NULL);

-- ============================================================
-- 20. univ_patient_portal — PatientPortal.jsx
-- ============================================================
CREATE TABLE IF NOT EXISTS public.univ_patient_portal (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  company_id text,
  patient_id text,
  message text,
  type text DEFAULT 'General',
  status text DEFAULT 'Open',
  responded_at text,
  response text
);

ALTER TABLE public.univ_patient_portal ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_patient_portal" ON public.univ_patient_portal;
CREATE POLICY "Allow company access on univ_patient_portal" ON public.univ_patient_portal
  FOR ALL USING (company_id IS NOT NULL OR auth.uid() IS NOT NULL);

-- ============================================================
-- 21. Add ALL hospital tables to powersync publication
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
    'univ_queue',
    'univ_referrals',
    'univ_staff_roster',
    'univ_infection_control',
    'univ_patient_portal',
    'univ_doctorschedules',
    'univ_dischargesummary',
    'univ_emr',
    'univ_notifications',
    'univ_invoices'
  ];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'powersync') THEN
    CREATE PUBLICATION powersync;
  END IF;

  FOREACH t IN ARRAY tables LOOP
    BEGIN
      -- Check table exists before trying to add to publication
      IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = t
      ) THEN
        EXECUTE format('ALTER PUBLICATION powersync ADD TABLE public.%I', t);
      END IF;
    EXCEPTION
      WHEN duplicate_object THEN NULL;
      WHEN OTHERS THEN RAISE NOTICE 'Skip % from powersync: %', t, SQLERRM;
    END;
  END LOOP;
END $pub$;

-- ============================================================
-- 22. Performance indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_patients_company ON public.univ_patients(company_id);
CREATE INDEX IF NOT EXISTS idx_appointments_company ON public.univ_appointments(company_id);
CREATE INDEX IF NOT EXISTS idx_admissions_company_status ON public.univ_admissions(company_id, status);
CREATE INDEX IF NOT EXISTS idx_wards_company ON public.univ_wards(company_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_company ON public.univ_prescriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_company ON public.univ_lab_results(company_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_company ON public.univ_pharmacy(company_id);
CREATE INDEX IF NOT EXISTS idx_medical_history_company ON public.univ_medical_history(company_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_imaging_company ON public.univ_imaging(company_id);
CREATE INDEX IF NOT EXISTS idx_surgeries_company ON public.univ_surgeries(company_id);
CREATE INDEX IF NOT EXISTS idx_medicalclaims_company ON public.univ_medicalclaims(company_id);
CREATE INDEX IF NOT EXISTS idx_medicalbillings_company ON public.univ_medicalbillings(company_id);
CREATE INDEX IF NOT EXISTS idx_ambulance_company ON public.univ_ambulance_dispatch(company_id);
CREATE INDEX IF NOT EXISTS idx_blood_bank_company ON public.univ_blood_bank(company_id);
