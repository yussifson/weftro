-- Create system_activity_logs table
CREATE TABLE IF NOT EXISTS public.system_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    user_email TEXT,
    user_name TEXT,
    action TEXT NOT NULL,
    module TEXT,
    slate TEXT,
    ip_address TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.system_activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their company activity logs"
    ON public.system_activity_logs;
CREATE POLICY "Users can view their company activity logs"
    ON public.system_activity_logs
    FOR SELECT
    USING (company_id::text IN (
        SELECT company_id::text FROM public.profiles WHERE id = auth.uid()
    ));

DROP POLICY IF EXISTS "Users can insert activity logs for their company"
    ON public.system_activity_logs;
CREATE POLICY "Users can insert activity logs for their company"
    ON public.system_activity_logs
    FOR INSERT
    WITH CHECK (company_id::text IN (
        SELECT company_id::text FROM public.profiles WHERE id = auth.uid()
    ));

-- Add realtime replica identity
ALTER TABLE public.system_activity_logs REPLICA IDENTITY FULL;

-- Add publication for powersync
BEGIN;
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'powersync' AND tablename = 'system_activity_logs'
  ) THEN 
    ALTER PUBLICATION powersync ADD TABLE public.system_activity_logs;
  END IF; 
END $$;
COMMIT;
