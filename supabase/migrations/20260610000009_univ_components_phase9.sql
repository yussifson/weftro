-- ==========================================
-- Phase 9: Legal & Manufacturing Suites
-- Execute this script in your Supabase SQL Editor
-- ==========================================

-- 44. Case Management (univ_cases)
CREATE TABLE IF NOT EXISTS public.univ_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    case_number TEXT NOT NULL,
    client_name TEXT NOT NULL,
    case_type TEXT,
    status TEXT DEFAULT 'Open', -- Open, In Progress, Closed, Pending Review
    filed_date DATE,
    court_jurisdiction TEXT,
    assigned_lawyer UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.univ_cases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their company's cases" ON public.univ_cases;
CREATE POLICY "Users can manage their company's cases" ON public.univ_cases FOR ALL USING (auth.uid() IS NOT NULL);

-- 45. Legal Documents (univ_legal_documents)
CREATE TABLE IF NOT EXISTS public.univ_legal_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    case_id UUID,
    document_title TEXT NOT NULL,
    document_type TEXT, -- Contract, Pleading, Affidavit, Evidence
    status TEXT DEFAULT 'Draft', -- Draft, Under Review, Final, Filed
    file_url TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.univ_legal_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their company's legal docs" ON public.univ_legal_documents;
CREATE POLICY "Users can manage their company's legal docs" ON public.univ_legal_documents FOR ALL USING (auth.uid() IS NOT NULL);

-- 46. Court Calendar (univ_court_calendar)
CREATE TABLE IF NOT EXISTS public.univ_court_calendar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    case_id UUID,
    event_title TEXT NOT NULL,
    event_type TEXT, -- Hearing, Trial, Deposition, Deadline
    event_date TIMESTAMPTZ NOT NULL,
    location TEXT,
    status TEXT DEFAULT 'Scheduled', -- Scheduled, Completed, Adjourned
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.univ_court_calendar ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their company's court calendar" ON public.univ_court_calendar;
DROP POLICY IF EXISTS "Users can manage their company's court calendar" ON public.univ_court_calendar;
CREATE POLICY "Users can manage their company's court calendar" ON public.univ_court_calendar FOR ALL USING (auth.uid() IS NOT NULL);

-- 47. Client Portal (univ_client_portal)
CREATE TABLE IF NOT EXISTS public.univ_client_portal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    client_name TEXT NOT NULL,
    case_id UUID,
    portal_access BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMPTZ,
    outstanding_balance NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.univ_client_portal ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their company's client portal" ON public.univ_client_portal;
DROP POLICY IF EXISTS "Users can manage their company's client portal" ON public.univ_client_portal;
CREATE POLICY "Users can manage their company's client portal" ON public.univ_client_portal FOR ALL USING (auth.uid() IS NOT NULL);

-- 48. Production (univ_production)
CREATE TABLE IF NOT EXISTS public.univ_production (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    batch_number TEXT NOT NULL,
    product_name TEXT NOT NULL,
    quantity NUMERIC NOT NULL,
    status TEXT DEFAULT 'Planned', -- Planned, In Progress, QA, Completed
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.univ_production ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their company's production" ON public.univ_production;
CREATE POLICY "Users can manage their company's production" ON public.univ_production FOR ALL USING (auth.uid() IS NOT NULL);

-- 49. BOM (univ_boms)
CREATE TABLE IF NOT EXISTS public.univ_boms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    product_name TEXT NOT NULL,
    material_name TEXT NOT NULL,
    quantity_required NUMERIC,
    unit TEXT,
    cost_per_unit NUMERIC,
    total_cost NUMERIC,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.univ_boms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their company's boms" ON public.univ_boms;
CREATE POLICY "Users can manage their company's boms" ON public.univ_boms FOR ALL USING (auth.uid() IS NOT NULL);

-- 50. Machine Maintenance (univ_machines)
CREATE TABLE IF NOT EXISTS public.univ_machines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    machine_name TEXT NOT NULL,
    serial_number TEXT,
    location TEXT,
    status TEXT DEFAULT 'Operational', -- Operational, Maintenance, Offline
    last_maintenance DATE,
    next_maintenance DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.univ_machines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their company's machines" ON public.univ_machines;
CREATE POLICY "Users can manage their company's machines" ON public.univ_machines FOR ALL USING (auth.uid() IS NOT NULL);

-- 51. Quality Control (univ_quality_control)
CREATE TABLE IF NOT EXISTS public.univ_quality_control (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    batch_number TEXT NOT NULL,
    inspector_name TEXT,
    inspection_date DATE,
    result TEXT DEFAULT 'Pending', -- Pending, Pass, Fail, Rework
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.univ_quality_control ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their company's quality control" ON public.univ_quality_control;
DROP POLICY IF EXISTS "Users can manage their company's quality control" ON public.univ_quality_control;
CREATE POLICY "Users can manage their company's quality control" ON public.univ_quality_control FOR ALL USING (auth.uid() IS NOT NULL);

-- Add triggers to auto-update updated_at for all Phase 9 tables
DROP TRIGGER IF EXISTS update_univ_cases_modtime ON public.univ_cases;
CREATE TRIGGER update_univ_cases_modtime BEFORE UPDATE ON public.univ_cases FOR EACH ROW EXECUTE PROCEDURE update_univ_updated_at_column();
DROP TRIGGER IF EXISTS update_univ_legal_documents_modtime ON public.univ_legal_documents;
CREATE TRIGGER update_univ_legal_documents_modtime BEFORE UPDATE ON public.univ_legal_documents FOR EACH ROW EXECUTE PROCEDURE update_univ_updated_at_column();
DROP TRIGGER IF EXISTS update_univ_court_calendar_modtime ON public.univ_court_calendar;
CREATE TRIGGER update_univ_court_calendar_modtime BEFORE UPDATE ON public.univ_court_calendar FOR EACH ROW EXECUTE PROCEDURE update_univ_updated_at_column();
DROP TRIGGER IF EXISTS update_univ_client_portal_modtime ON public.univ_client_portal;
CREATE TRIGGER update_univ_client_portal_modtime BEFORE UPDATE ON public.univ_client_portal FOR EACH ROW EXECUTE PROCEDURE update_univ_updated_at_column();
DROP TRIGGER IF EXISTS update_univ_production_modtime ON public.univ_production;
CREATE TRIGGER update_univ_production_modtime BEFORE UPDATE ON public.univ_production FOR EACH ROW EXECUTE PROCEDURE update_univ_updated_at_column();
DROP TRIGGER IF EXISTS update_univ_boms_modtime ON public.univ_boms;
CREATE TRIGGER update_univ_boms_modtime BEFORE UPDATE ON public.univ_boms FOR EACH ROW EXECUTE PROCEDURE update_univ_updated_at_column();
DROP TRIGGER IF EXISTS update_univ_machines_modtime ON public.univ_machines;
CREATE TRIGGER update_univ_machines_modtime BEFORE UPDATE ON public.univ_machines FOR EACH ROW EXECUTE PROCEDURE update_univ_updated_at_column();
DROP TRIGGER IF EXISTS update_univ_quality_control_modtime ON public.univ_quality_control;
CREATE TRIGGER update_univ_quality_control_modtime BEFORE UPDATE ON public.univ_quality_control FOR EACH ROW EXECUTE PROCEDURE update_univ_updated_at_column();
