-- Create partner_applications table
CREATE TABLE IF NOT EXISTS public.partner_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    company_name TEXT NOT NULL,
    partner_type TEXT NOT NULL,
    message TEXT,
    status TEXT DEFAULT 'pending' NOT NULL
);

-- Enable RLS
ALTER TABLE public.partner_applications ENABLE ROW LEVEL SECURITY;

-- Allow public to insert applications
DROP POLICY IF EXISTS "Allow public insert on partner_applications" ON public.partner_applications;
CREATE POLICY "Allow public insert on partner_applications" ON public.partner_applications
    FOR INSERT WITH CHECK (true);

-- Allow super_admin to read all applications
DROP POLICY IF EXISTS "Allow super_admin read on partner_applications" ON public.partner_applications;
CREATE POLICY "Allow super_admin read on partner_applications" ON public.partner_applications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'
        )
    );

-- Allow super_admin to update applications
DROP POLICY IF EXISTS "Allow super_admin update on partner_applications" ON public.partner_applications;
CREATE POLICY "Allow super_admin update on partner_applications" ON public.partner_applications
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'
        )
    );

-- Allow super_admin to delete applications
DROP POLICY IF EXISTS "Allow super_admin delete on partner_applications" ON public.partner_applications;
CREATE POLICY "Allow super_admin delete on partner_applications" ON public.partner_applications
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'
        )
    );
