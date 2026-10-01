-- ==========================================
-- Phase 6: Healthcare Suite Data Layer
-- Execute this script in your Supabase SQL Editor
-- ==========================================

-- 23. Patients (univ_patients)
CREATE TABLE IF NOT EXISTS public.univ_patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    patient_number TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    date_of_birth DATE,
    gender TEXT,
    blood_group TEXT,
    phone TEXT,
    email TEXT,
    emergency_contact TEXT,
    status TEXT DEFAULT 'Active', -- Active, Discharged, Deceased
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.univ_patients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their company's patients" ON public.univ_patients;
CREATE POLICY "Users can manage their company's patients" ON public.univ_patients FOR ALL USING (auth.uid() IS NOT NULL);

-- 24. EMR (univ_emr)
CREATE TABLE IF NOT EXISTS public.univ_emr (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    patient_id UUID NOT NULL,
    doctor_id UUID,
    visit_date TIMESTAMPTZ DEFAULT NOW(),
    diagnosis TEXT,
    symptoms TEXT,
    treatment_plan TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.univ_emr ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their company's emr" ON public.univ_emr;
CREATE POLICY "Users can manage their company's emr" ON public.univ_emr FOR ALL USING (auth.uid() IS NOT NULL);

-- 25. Prescriptions (univ_prescriptions)
CREATE TABLE IF NOT EXISTS public.univ_prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    patient_id UUID NOT NULL,
    doctor_id UUID,
    medication TEXT NOT NULL,
    dosage TEXT NOT NULL,
    frequency TEXT NOT NULL,
    duration TEXT NOT NULL,
    status TEXT DEFAULT 'Active', -- Active, Completed, Cancelled
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.univ_prescriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their company's prescriptions" ON public.univ_prescriptions;
DROP POLICY IF EXISTS "Users can manage their company's prescriptions" ON public.univ_prescriptions;
CREATE POLICY "Users can manage their company's prescriptions" ON public.univ_prescriptions FOR ALL USING (auth.uid() IS NOT NULL);

-- 26. Labs (univ_labs)
CREATE TABLE IF NOT EXISTS public.univ_labs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    patient_id UUID NOT NULL,
    test_name TEXT NOT NULL,
    ordered_by UUID,
    test_date TIMESTAMPTZ,
    result_value TEXT,
    reference_range TEXT,
    status TEXT DEFAULT 'Pending', -- Pending, Processing, Completed
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.univ_labs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their company's labs" ON public.univ_labs;
CREATE POLICY "Users can manage their company's labs" ON public.univ_labs FOR ALL USING (auth.uid() IS NOT NULL);

-- 27. Wards/Beds (univ_wards)
CREATE TABLE IF NOT EXISTS public.univ_wards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    ward_name TEXT NOT NULL,
    bed_number TEXT NOT NULL,
    patient_id UUID, -- Null if available
    status TEXT DEFAULT 'Available', -- Available, Occupied, Maintenance
    admission_date TIMESTAMPTZ,
    expected_discharge TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.univ_wards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their company's wards" ON public.univ_wards;
CREATE POLICY "Users can manage their company's wards" ON public.univ_wards FOR ALL USING (auth.uid() IS NOT NULL);

-- 28. Telemedicine (univ_telemedicine)
CREATE TABLE IF NOT EXISTS public.univ_telemedicine (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    patient_id UUID NOT NULL,
    doctor_id UUID,
    scheduled_time TIMESTAMPTZ NOT NULL,
    meeting_link TEXT,
    status TEXT DEFAULT 'Scheduled', -- Scheduled, Ongoing, Completed, Cancelled
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.univ_telemedicine ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their company's telemedicine" ON public.univ_telemedicine;
CREATE POLICY "Users can manage their company's telemedicine" ON public.univ_telemedicine FOR ALL USING (auth.uid() IS NOT NULL);

-- Add triggers to auto-update updated_at for all Phase 6 tables
DROP TRIGGER IF EXISTS update_univ_patients_modtime ON public.univ_patients;
CREATE TRIGGER update_univ_patients_modtime BEFORE UPDATE ON public.univ_patients FOR EACH ROW EXECUTE PROCEDURE update_univ_updated_at_column();
DROP TRIGGER IF EXISTS update_univ_emr_modtime ON public.univ_emr;
CREATE TRIGGER update_univ_emr_modtime BEFORE UPDATE ON public.univ_emr FOR EACH ROW EXECUTE PROCEDURE update_univ_updated_at_column();
DROP TRIGGER IF EXISTS update_univ_prescriptions_modtime ON public.univ_prescriptions;
CREATE TRIGGER update_univ_prescriptions_modtime BEFORE UPDATE ON public.univ_prescriptions FOR EACH ROW EXECUTE PROCEDURE update_univ_updated_at_column();
DROP TRIGGER IF EXISTS update_univ_labs_modtime ON public.univ_labs;
CREATE TRIGGER update_univ_labs_modtime BEFORE UPDATE ON public.univ_labs FOR EACH ROW EXECUTE PROCEDURE update_univ_updated_at_column();
DROP TRIGGER IF EXISTS update_univ_wards_modtime ON public.univ_wards;
CREATE TRIGGER update_univ_wards_modtime BEFORE UPDATE ON public.univ_wards FOR EACH ROW EXECUTE PROCEDURE update_univ_updated_at_column();
DROP TRIGGER IF EXISTS update_univ_telemedicine_modtime ON public.univ_telemedicine;
CREATE TRIGGER update_univ_telemedicine_modtime BEFORE UPDATE ON public.univ_telemedicine FOR EACH ROW EXECUTE PROCEDURE update_univ_updated_at_column();
