-- -----------------------------------------------------------------------------
-- Optavel OS Full Fledged Expansion
-- -----------------------------------------------------------------------------

-- 1. HR & Team
CREATE TABLE IF NOT EXISTS public.optavel_employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    department TEXT NOT NULL,
    onboarding_progress INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    start_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);
ALTER TABLE public.optavel_employees ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "optavel_employees_policy" ON public.optavel_employees;
CREATE POLICY "optavel_employees_policy" ON public.optavel_employees FOR ALL USING (auth.uid() IN (SELECT user_id FROM public.profiles WHERE company_id = optavel_employees.company_id));

CREATE TABLE IF NOT EXISTS public.optavel_leave_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES public.optavel_employees(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);
ALTER TABLE public.optavel_leave_requests ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "optavel_leave_requests_policy" ON public.optavel_leave_requests;
CREATE POLICY "optavel_leave_requests_policy" ON public.optavel_leave_requests FOR ALL USING (auth.uid() IN (SELECT user_id FROM public.profiles WHERE company_id = optavel_leave_requests.company_id));

-- 2. Customer Support
CREATE TABLE IF NOT EXISTS public.optavel_support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'open',
    severity TEXT DEFAULT 'medium',
    customer_id TEXT,
    reporter_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);
ALTER TABLE public.optavel_support_tickets ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "optavel_support_tickets_policy" ON public.optavel_support_tickets;
CREATE POLICY "optavel_support_tickets_policy" ON public.optavel_support_tickets FOR ALL USING (auth.uid() IN (SELECT user_id FROM public.profiles WHERE company_id = optavel_support_tickets.company_id));

CREATE TABLE IF NOT EXISTS public.optavel_nps_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    customer_id TEXT,
    score INTEGER NOT NULL,
    feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);
ALTER TABLE public.optavel_nps_responses ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "optavel_nps_responses_policy" ON public.optavel_nps_responses;
CREATE POLICY "optavel_nps_responses_policy" ON public.optavel_nps_responses FOR ALL USING (auth.uid() IN (SELECT user_id FROM public.profiles WHERE company_id = optavel_nps_responses.company_id));

-- 3. Partnerships
CREATE TABLE IF NOT EXISTS public.optavel_partners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    revenue_share REAL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);
ALTER TABLE public.optavel_partners ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "optavel_partners_policy" ON public.optavel_partners;
CREATE POLICY "optavel_partners_policy" ON public.optavel_partners FOR ALL USING (auth.uid() IN (SELECT user_id FROM public.profiles WHERE company_id = optavel_partners.company_id));

-- Ensure replication includes new tables
/* ALTER PUBLICATION skipped */
