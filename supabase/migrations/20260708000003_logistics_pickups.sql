-- Create the logistics_pickups table
CREATE TABLE IF NOT EXISTS public.logistics_pickups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by TEXT,
    client_name TEXT NOT NULL,
    contact_phone TEXT,
    pickup_address TEXT NOT NULL,
    pickup_date DATE NOT NULL,
    pickup_time TEXT,
    package_details TEXT,
    weight_lbs NUMERIC,
    status TEXT DEFAULT 'pending',
    assigned_driver_id TEXT
);

-- Enable RLS
ALTER TABLE public.logistics_pickups ENABLE ROW LEVEL SECURITY;

-- Create policy for company isolation
CREATE POLICY "Users can view and manage pickups for their company"
    ON public.logistics_pickups
    FOR ALL
    USING (company_id = (
        SELECT company_id FROM public.profiles WHERE id = auth.uid()
    ));

-- Create replication entry for PowerSync
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'powersync' AND tablename = 'logistics_pickups') THEN
        ALTER PUBLICATION powersync ADD TABLE public.logistics_pickups;
    END IF;
END $$;
