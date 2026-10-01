
CREATE TABLE IF NOT EXISTS public.automation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT NOT NULL,
    rule_id UUID NOT NULL REFERENCES public.automation_rules(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    logs JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own company automation logs" ON public.automation_logs FOR SELECT USING (company_id = ((SELECT company_id FROM public.profiles WHERE id = auth.uid()))::uuid);

CREATE TABLE IF NOT EXISTS public.automation_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT NOT NULL,
    rule_id UUID NOT NULL REFERENCES public.automation_rules(id) ON DELETE CASCADE,
    payload JSONB NOT NULL,
    execute_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.automation_queue ENABLE ROW LEVEL SECURITY;
