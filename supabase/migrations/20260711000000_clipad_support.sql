-- Migration for CliPad Support System
CREATE TABLE IF NOT EXISTS public.clipad_support_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_email TEXT,
    subject TEXT,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.clipad_support_requests ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can insert own support requests" ON public.clipad_support_requests;
CREATE POLICY "Users can insert own support requests" ON public.clipad_support_requests 
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Super admins can view all support requests" ON public.clipad_support_requests;
CREATE POLICY "Super admins can view all support requests" ON public.clipad_support_requests 
FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);

DROP POLICY IF EXISTS "Users can view own support requests" ON public.clipad_support_requests;
CREATE POLICY "Users can view own support requests" ON public.clipad_support_requests 
FOR SELECT USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE clipad_support_requests;
