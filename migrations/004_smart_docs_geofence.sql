-- Advanced Logistics Additions (Smart Docs & Geofence)

CREATE TABLE IF NOT EXISTS public.logistics_smart_docs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    document_type TEXT,
    file_url TEXT,
    extracted_data JSONB,
    status TEXT DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS public.logistics_geofences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    name TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    radius_meters INTEGER NOT NULL,
    active BOOLEAN DEFAULT true,
    alert_phone_numbers TEXT
);

CREATE TABLE IF NOT EXISTS public.logistics_geofence_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    geofence_id UUID NOT NULL REFERENCES public.logistics_geofences(id) ON DELETE CASCADE,
    vehicle_id TEXT,
    event TEXT NOT NULL,
    sent_to TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_logistics_smart_docs_company_id ON public.logistics_smart_docs(company_id);
CREATE INDEX IF NOT EXISTS idx_logistics_geofences_company_id ON public.logistics_geofences(company_id);
CREATE INDEX IF NOT EXISTS idx_logistics_geofence_logs_company_id ON public.logistics_geofence_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_logistics_geofence_logs_geofence_id ON public.logistics_geofence_logs(geofence_id);
