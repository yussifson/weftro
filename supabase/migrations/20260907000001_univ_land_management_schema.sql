-- ============================================================================
-- Migration: Universal Land Management Schema (Dedicated Tables)
-- Creates: univ_land_parcels, univ_land_ownership, univ_land_allocations, univ_land_surveys
-- ============================================================================

-- 1. Land Parcels Table
CREATE TABLE IF NOT EXISTS public.univ_land_parcels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    parcel_name TEXT NOT NULL,
    plot_number TEXT,
    cadastral_ref TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    country TEXT DEFAULT 'Ghana',
    zip_code TEXT,
    lot_size_acres NUMERIC DEFAULT 0,
    square_feet NUMERIC DEFAULT 0,
    zoning TEXT DEFAULT 'residential',
    topography TEXT DEFAULT 'flat',
    title_type TEXT DEFAULT 'C_of_O',
    price NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'available',
    description TEXT,
    agent_name TEXT,
    documents JSONB DEFAULT '[]'::jsonb
);

-- 2. Land Ownership / Beneficial Interests Table
CREATE TABLE IF NOT EXISTS public.univ_land_ownership (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    parcel_id UUID REFERENCES public.univ_land_parcels(id) ON DELETE CASCADE,
    owner_name TEXT NOT NULL,
    percentage NUMERIC DEFAULT 100,
    interest_type TEXT DEFAULT 'Freehold',
    deed_ref TEXT,
    phone TEXT,
    email TEXT,
    notes TEXT
);

-- 3. Land Allocations / Customer Reservations Table
CREATE TABLE IF NOT EXISTS public.univ_land_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    parcel_id UUID REFERENCES public.univ_land_parcels(id) ON DELETE CASCADE,
    client_id UUID,
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    customer_phone TEXT,
    allocation_date DATE DEFAULT CURRENT_DATE,
    expiry_date DATE,
    deposit_amount NUMERIC DEFAULT 0,
    total_agreed_price NUMERIC DEFAULT 0,
    payment_terms TEXT DEFAULT 'outright',
    allocation_status TEXT DEFAULT 'active_reserved',
    notes TEXT
);

-- 4. Land Surveys / Cadastral Data Table
CREATE TABLE IF NOT EXISTS public.univ_land_surveys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    parcel_id UUID REFERENCES public.univ_land_parcels(id) ON DELETE CASCADE,
    survey_number TEXT NOT NULL,
    surveyor_name TEXT,
    survey_date DATE,
    boundary_coordinates JSONB DEFAULT '[]'::jsonb,
    plan_url TEXT,
    status TEXT DEFAULT 'approved',
    notes TEXT
);

-- Indexes for performance & company scoping
CREATE INDEX IF NOT EXISTS idx_univ_land_parcels_company ON public.univ_land_parcels(company_id);
CREATE INDEX IF NOT EXISTS idx_univ_land_parcels_status ON public.univ_land_parcels(status);
CREATE INDEX IF NOT EXISTS idx_univ_land_ownership_parcel ON public.univ_land_ownership(parcel_id);
CREATE INDEX IF NOT EXISTS idx_univ_land_allocations_parcel ON public.univ_land_allocations(parcel_id);
CREATE INDEX IF NOT EXISTS idx_univ_land_surveys_parcel ON public.univ_land_surveys(parcel_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.univ_land_parcels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.univ_land_ownership ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.univ_land_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.univ_land_surveys ENABLE ROW LEVEL SECURITY;

-- Generic RLS policies (allow company members full access to their company records)
DO $$
BEGIN
    DROP POLICY IF EXISTS "Company isolation for univ_land_parcels" ON public.univ_land_parcels;
    CREATE POLICY "Company isolation for univ_land_parcels" ON public.univ_land_parcels
        FOR ALL USING (company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        ));

    DROP POLICY IF EXISTS "Company isolation for univ_land_ownership" ON public.univ_land_ownership;
    CREATE POLICY "Company isolation for univ_land_ownership" ON public.univ_land_ownership
        FOR ALL USING (company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        ));

    DROP POLICY IF EXISTS "Company isolation for univ_land_allocations" ON public.univ_land_allocations;
    CREATE POLICY "Company isolation for univ_land_allocations" ON public.univ_land_allocations
        FOR ALL USING (company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        ));

    DROP POLICY IF EXISTS "Company isolation for univ_land_surveys" ON public.univ_land_surveys;
    CREATE POLICY "Company isolation for univ_land_surveys" ON public.univ_land_surveys
        FOR ALL USING (company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        ));
END $$;
