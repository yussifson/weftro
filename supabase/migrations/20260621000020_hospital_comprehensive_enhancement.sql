-- Hospital Comprehensive Enhancement Migration

-- 1. EHR Tables (Allergies, Problems, Immunizations)
CREATE TABLE IF NOT EXISTS public.univ_patient_allergies (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    company_id uuid NOT NULL,
    patient_id uuid NOT NULL,
    allergen text NOT NULL,
    reaction text,
    severity text,
    status text DEFAULT 'active'
);
ALTER TABLE public.univ_patient_allergies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_patient_allergies" ON public.univ_patient_allergies;
CREATE POLICY "Allow company access on univ_patient_allergies" ON public.univ_patient_allergies FOR ALL USING (company_id::text = current_setting('app.current_company_id', true) OR auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_patient_problems (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    company_id uuid NOT NULL,
    patient_id uuid NOT NULL,
    problem_name text NOT NULL,
    diagnosis_date date,
    status text DEFAULT 'active',
    notes text
);
ALTER TABLE public.univ_patient_problems ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_patient_problems" ON public.univ_patient_problems;
CREATE POLICY "Allow company access on univ_patient_problems" ON public.univ_patient_problems FOR ALL USING (company_id::text = current_setting('app.current_company_id', true) OR auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_patient_immunizations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    company_id uuid NOT NULL,
    patient_id uuid NOT NULL,
    vaccine_name text NOT NULL,
    administration_date date,
    administered_by uuid,
    notes text
);
ALTER TABLE public.univ_patient_immunizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_patient_immunizations" ON public.univ_patient_immunizations;
CREATE POLICY "Allow company access on univ_patient_immunizations" ON public.univ_patient_immunizations FOR ALL USING (company_id::text = current_setting('app.current_company_id', true) OR auth.uid() IS NOT NULL);

-- 2. Referrals
CREATE TABLE IF NOT EXISTS public.univ_hospital_referrals (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    company_id uuid NOT NULL,
    patient_id uuid NOT NULL,
    referring_provider_id uuid,
    receiving_department text,
    receiving_provider_id uuid,
    referral_type text DEFAULT 'internal',
    external_facility_name text,
    reason text NOT NULL,
    priority text DEFAULT 'routine',
    status text DEFAULT 'pending',
    outcome_notes text
);
ALTER TABLE public.univ_hospital_referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_hospital_referrals" ON public.univ_hospital_referrals;
CREATE POLICY "Allow company access on univ_hospital_referrals" ON public.univ_hospital_referrals FOR ALL USING (company_id::text = current_setting('app.current_company_id', true) OR auth.uid() IS NOT NULL);

-- 3. Consents
CREATE TABLE IF NOT EXISTS public.univ_hospital_consents (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    company_id uuid NOT NULL,
    patient_id uuid NOT NULL,
    procedure_name text NOT NULL,
    consent_type text,
    status text DEFAULT 'pending',
    signature_data text,
    signed_by text,
    signed_at timestamp with time zone,
    notes text
);
ALTER TABLE public.univ_hospital_consents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_hospital_consents" ON public.univ_hospital_consents;
CREATE POLICY "Allow company access on univ_hospital_consents" ON public.univ_hospital_consents FOR ALL USING (company_id::text = current_setting('app.current_company_id', true) OR auth.uid() IS NOT NULL);

-- 4. Queues (Waiting Room/OPD)
CREATE TABLE IF NOT EXISTS public.univ_hospital_queues (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    company_id uuid NOT NULL,
    patient_id uuid NOT NULL,
    department text NOT NULL,
    provider_id uuid,
    status text DEFAULT 'waiting',
    priority_score integer DEFAULT 0,
    called_at timestamp with time zone,
    completed_at timestamp with time zone,
    notes text
);
ALTER TABLE public.univ_hospital_queues ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_hospital_queues" ON public.univ_hospital_queues;
CREATE POLICY "Allow company access on univ_hospital_queues" ON public.univ_hospital_queues FOR ALL USING (company_id::text = current_setting('app.current_company_id', true) OR auth.uid() IS NOT NULL);

-- 5. Blood Bank
CREATE TABLE IF NOT EXISTS public.univ_blood_bank (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    company_id uuid NOT NULL,
    blood_group text NOT NULL,
    unit_number text NOT NULL,
    component_type text DEFAULT 'Whole Blood',
    collection_date date,
    expiry_date date,
    status text DEFAULT 'available',
    location text
);
ALTER TABLE public.univ_blood_bank ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_blood_bank" ON public.univ_blood_bank;
CREATE POLICY "Allow company access on univ_blood_bank" ON public.univ_blood_bank FOR ALL USING (company_id::text = current_setting('app.current_company_id', true) OR auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.univ_blood_crossmatch (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    company_id uuid NOT NULL,
    patient_id uuid NOT NULL,
    blood_unit_id uuid REFERENCES public.univ_blood_bank(id),
    requested_by uuid,
    request_date timestamp with time zone DEFAULT timezone('utc'::text, now()),
    crossmatch_status text DEFAULT 'pending',
    issue_status text DEFAULT 'pending',
    notes text
);
ALTER TABLE public.univ_blood_crossmatch ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_blood_crossmatch" ON public.univ_blood_crossmatch;
CREATE POLICY "Allow company access on univ_blood_crossmatch" ON public.univ_blood_crossmatch FOR ALL USING (company_id::text = current_setting('app.current_company_id', true) OR auth.uid() IS NOT NULL);

-- 6. Duty Rosters
CREATE TABLE IF NOT EXISTS public.univ_duty_rosters (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    company_id uuid NOT NULL,
    staff_id uuid NOT NULL,
    department text,
    shift_date date NOT NULL,
    shift_type text,
    start_time time without time zone,
    end_time time without time zone,
    status text DEFAULT 'scheduled',
    notes text
);
ALTER TABLE public.univ_duty_rosters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_duty_rosters" ON public.univ_duty_rosters;
CREATE POLICY "Allow company access on univ_duty_rosters" ON public.univ_duty_rosters FOR ALL USING (company_id::text = current_setting('app.current_company_id', true) OR auth.uid() IS NOT NULL);

-- 7. Infection Control
CREATE TABLE IF NOT EXISTS public.univ_infection_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    company_id uuid NOT NULL,
    patient_id uuid,
    ward_id text,
    infection_type text NOT NULL,
    organism text,
    source text,
    detection_date date,
    control_measures text,
    status text DEFAULT 'active',
    reported_by uuid
);
ALTER TABLE public.univ_infection_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_infection_logs" ON public.univ_infection_logs;
CREATE POLICY "Allow company access on univ_infection_logs" ON public.univ_infection_logs FOR ALL USING (company_id::text = current_setting('app.current_company_id', true) OR auth.uid() IS NOT NULL);

-- 8. Altering Existing Tables
ALTER TABLE IF EXISTS public.univ_medical_history ADD COLUMN IF NOT EXISTS discharge_summary text;
ALTER TABLE IF EXISTS public.univ_admissions ADD COLUMN IF NOT EXISTS discharge_summary text;
ALTER TABLE IF EXISTS public.univ_wards ADD COLUMN IF NOT EXISTS occupancy integer DEFAULT 0;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_univ_patient_allergies_company ON public.univ_patient_allergies(company_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_univ_patient_problems_company ON public.univ_patient_problems(company_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_univ_hospital_referrals_company ON public.univ_hospital_referrals(company_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_univ_hospital_queues_company ON public.univ_hospital_queues(company_id, department, status);
CREATE INDEX IF NOT EXISTS idx_univ_blood_bank_company ON public.univ_blood_bank(company_id, blood_group, status);
CREATE INDEX IF NOT EXISTS idx_univ_duty_rosters_company ON public.univ_duty_rosters(company_id, shift_date);
