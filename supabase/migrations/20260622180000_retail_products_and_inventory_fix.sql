-- Fix missing univ_retail_products table and univ_retail_inventory missing columns
-- Run: 2026-06-22

-- 1. Create univ_retail_products table (was missing from Supabase entirely)
CREATE TABLE IF NOT EXISTS public.univ_retail_products (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at text,
    company_id text,
    name text,
    sku text,
    category text,
    price numeric,
    stock integer DEFAULT 0,
    supplier text,
    status text DEFAULT 'Active'
);

-- RLS
ALTER TABLE public.univ_retail_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow company access on univ_retail_products" ON public.univ_retail_products;
CREATE POLICY "Allow company access on univ_retail_products" ON public.univ_retail_products
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_univ_retail_products_company_id ON public.univ_retail_products(company_id);
CREATE INDEX IF NOT EXISTS idx_univ_retail_products_sku ON public.univ_retail_products(sku);

-- 2. Add missing cost_price column to univ_retail_inventory
ALTER TABLE public.univ_retail_inventory
    ADD COLUMN IF NOT EXISTS cost_price numeric;

-- 3. Add missing sku & supplier columns to univ_retail_inventory if also missing
ALTER TABLE public.univ_retail_inventory
    ADD COLUMN IF NOT EXISTS sku text;

ALTER TABLE public.univ_retail_inventory
    ADD COLUMN IF NOT EXISTS supplier text;
