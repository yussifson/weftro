CREATE TABLE IF NOT EXISTS public.industry_records (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    company_id uuid not null,
    industry text,
    record_type text,
    data jsonb,
    status text,
    title text,
    search_text text
);
ALTER TABLE public.industry_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow company access on industry_records" ON public.industry_records;
CREATE POLICY "Allow company access on industry_records" ON public.industry_records FOR ALL USING (auth.uid() IS NOT NULL);
