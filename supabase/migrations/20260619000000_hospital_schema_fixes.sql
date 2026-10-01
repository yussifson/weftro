-- Hospital Schema Fixes
-- Adds missing columns to existing hospital tables and creates missing tables like univ_pharmacy and univ_admissions

-- 1. univ_patients (Fixing the "vanishing patients" issue)
ALTER TABLE "public"."univ_patients" ADD COLUMN IF NOT EXISTS "first_name" text;
ALTER TABLE "public"."univ_patients" ADD COLUMN IF NOT EXISTS "last_name" text;
ALTER TABLE "public"."univ_patients" ADD COLUMN IF NOT EXISTS "date_of_birth" text;
ALTER TABLE "public"."univ_patients" ADD COLUMN IF NOT EXISTS "gender" text;
ALTER TABLE "public"."univ_patients" ADD COLUMN IF NOT EXISTS "blood_group" text;
ALTER TABLE "public"."univ_patients" ADD COLUMN IF NOT EXISTS "phone" text;
ALTER TABLE "public"."univ_patients" ADD COLUMN IF NOT EXISTS "email" text;
ALTER TABLE "public"."univ_patients" ADD COLUMN IF NOT EXISTS "address" text;
ALTER TABLE "public"."univ_patients" ADD COLUMN IF NOT EXISTS "status" text;

-- 2. univ_appointments (Fixing the appointment sync failure)
ALTER TABLE "public"."univ_appointments" ADD COLUMN IF NOT EXISTS "doctor_id" text;
ALTER TABLE "public"."univ_appointments" ADD COLUMN IF NOT EXISTS "patient_id" text;
ALTER TABLE "public"."univ_appointments" ADD COLUMN IF NOT EXISTS "type" text;

-- 3. univ_wards (Fixing the ward creation issue)
ALTER TABLE "public"."univ_wards" ADD COLUMN IF NOT EXISTS "type" text;
ALTER TABLE "public"."univ_wards" ADD COLUMN IF NOT EXISTS "capacity" text;
ALTER TABLE "public"."univ_wards" ADD COLUMN IF NOT EXISTS "admission_id" text;

-- 4. univ_labs (Fixing Lab Results)
ALTER TABLE "public"."univ_labs" ADD COLUMN IF NOT EXISTS "reference_range" text;
ALTER TABLE "public"."univ_labs" ADD COLUMN IF NOT EXISTS "document_url" text;
ALTER TABLE "public"."univ_labs" ADD COLUMN IF NOT EXISTS "test_name" text;
ALTER TABLE "public"."univ_labs" ADD COLUMN IF NOT EXISTS "result_value" text;

-- 5. univ_pharmacy (Completely missing table)
CREATE TABLE IF NOT EXISTS "public"."univ_pharmacy" (
    id uuid default gen_random_uuid() primary key,
    created_at text default timezone('utc'::text, now()),
    company_id text,
    drug_name text,
    sku text,
    category text,
    stock_level integer default 0,
    reorder_level integer default 0,
    unit_price real default 0,
    expiry_date text,
    status text
);
ALTER TABLE public.univ_pharmacy ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_pharmacy" ON public.univ_pharmacy;
CREATE POLICY "Allow company access on univ_pharmacy" ON public.univ_pharmacy FOR ALL USING (auth.uid() IS NOT NULL);

-- 6. univ_admissions (Completely missing table)
CREATE TABLE IF NOT EXISTS "public"."univ_admissions" (
    id uuid default gen_random_uuid() primary key,
    created_at text default timezone('utc'::text, now()),
    company_id text,
    patient_id text,
    ward_id text,
    bed_number text,
    admission_date text,
    expected_discharge text,
    reason_for_admission text,
    attending_doctor_id text,
    status text
);
ALTER TABLE public.univ_admissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on univ_admissions" ON public.univ_admissions;
CREATE POLICY "Allow company access on univ_admissions" ON public.univ_admissions FOR ALL USING (auth.uid() IS NOT NULL);
ALTER TABLE "public"."univ_prescriptions" ADD COLUMN IF NOT EXISTS "prescription_date" text;
