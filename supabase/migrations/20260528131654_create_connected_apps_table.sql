-- Create connected_apps table
CREATE TABLE IF NOT EXISTS public.connected_apps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    provider TEXT NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'disconnected', 'error')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, provider)
);

-- RLS Policies
ALTER TABLE public.connected_apps ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view connected apps
DROP POLICY IF EXISTS "Users can view connected apps" ON public.connected_apps;
CREATE POLICY "Users can view connected apps" ON public.connected_apps
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Allow authenticated users to manage connected apps
DROP POLICY IF EXISTS "Users can manage connected apps" ON public.connected_apps;
CREATE POLICY "Users can manage connected apps" ON public.connected_apps
    FOR ALL
    USING (auth.role() = 'authenticated');

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_connected_apps_modtime ON public.connected_apps;
CREATE TRIGGER update_connected_apps_modtime
    BEFORE UPDATE ON public.connected_apps
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();
