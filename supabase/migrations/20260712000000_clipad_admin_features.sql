-- Create clipad_pricing_tags table
CREATE TABLE IF NOT EXISTS public.clipad_pricing_tags (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    description text,
    price numeric(10,2) NOT NULL DEFAULT 0.00,
    currency text NOT NULL DEFAULT 'USD',
    features jsonb DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add pricing_tag_id to companies if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'pricing_tag_id') THEN
        ALTER TABLE public.companies ADD COLUMN pricing_tag_id uuid REFERENCES public.clipad_pricing_tags(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Enable RLS on clipad_pricing_tags
ALTER TABLE public.clipad_pricing_tags ENABLE ROW LEVEL SECURITY;

-- Everyone can read active pricing tags
DROP POLICY IF EXISTS "clipad_pricing_tags_select" ON public.clipad_pricing_tags;
CREATE POLICY "clipad_pricing_tags_select" ON public.clipad_pricing_tags
  FOR SELECT USING (is_active = true OR public.is_clipad_admin());

-- Only admins can insert/update/delete
DROP POLICY IF EXISTS "clipad_pricing_tags_insert" ON public.clipad_pricing_tags;
CREATE POLICY "clipad_pricing_tags_insert" ON public.clipad_pricing_tags
  FOR INSERT WITH CHECK (public.is_clipad_admin());

DROP POLICY IF EXISTS "clipad_pricing_tags_update" ON public.clipad_pricing_tags;
CREATE POLICY "clipad_pricing_tags_update" ON public.clipad_pricing_tags
  FOR UPDATE USING (public.is_clipad_admin());

DROP POLICY IF EXISTS "clipad_pricing_tags_delete" ON public.clipad_pricing_tags;
CREATE POLICY "clipad_pricing_tags_delete" ON public.clipad_pricing_tags
  FOR DELETE USING (public.is_clipad_admin());

-- Ensure Super Admins can see ALL audit logs
DROP POLICY IF EXISTS "audit_logs_admin_select" ON public.audit_logs;
CREATE POLICY "audit_logs_admin_select" ON public.audit_logs
  FOR SELECT USING (
    company_id = auth.uid() OR public.is_clipad_admin()
  );
