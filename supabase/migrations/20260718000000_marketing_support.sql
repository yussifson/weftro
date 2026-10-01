-- Migration for Marketing Support Requests & Chats
CREATE TABLE IF NOT EXISTS public.clipad_marketing_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('call', 'chat')),
    name TEXT,
    email TEXT,
    phone TEXT,
    message TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'resolved')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.clipad_marketing_requests ENABLE ROW LEVEL SECURITY;

-- Allow anyone (including anonymous) to insert
CREATE POLICY "Allow anonymous inserts" ON public.clipad_marketing_requests 
FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Only Super Admins can select/view
CREATE POLICY "Super admins can view all marketing requests" ON public.clipad_marketing_requests 
FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- Only Super Admins can update
CREATE POLICY "Super admins can update marketing requests" ON public.clipad_marketing_requests 
FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- Add to Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE clipad_marketing_requests;
