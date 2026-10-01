-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Migration: module_definitions - industry isolation & metadata columns
-- Run this against your Supabase project via the SQL editor
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

-- 1. Add industry_type for per-industry module scoping
ALTER TABLE public.module_definitions
  ADD COLUMN IF NOT EXISTS industry_type TEXT DEFAULT NULL;

-- 2. Add status ('published' | 'draft') for publish/draft workflow
ALTER TABLE public.module_definitions
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published'
  CHECK (status IN ('published', 'draft'));

-- 3. Add visibility ('private' | 'shared' | 'public') for cross-workspace sharing
ALTER TABLE public.module_definitions
  ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'private'
  CHECK (visibility IN ('private', 'shared', 'public'));

-- 4. Add shared_with for comma-delimited list of company_ids that can access a shared module
ALTER TABLE public.module_definitions
  ADD COLUMN IF NOT EXISTS shared_with TEXT DEFAULT NULL;

-- 5. Fix is_active: ensure it exists as BOOLEAN (may already exist as TEXT)
--    We use a DO block to handle the case gracefully
DO $$
BEGIN
  -- If the column doesn't exist yet, add it as boolean
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'module_definitions'
      AND column_name  = 'is_active'
  ) THEN
    ALTER TABLE public.module_definitions ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
END $$;

-- 6. Back-fill industry_type for any existing modules that lack it
--    (law is the default industry; adjust if needed)
UPDATE public.module_definitions
SET industry_type = 'law'
WHERE industry_type IS NULL;

-- 7. Back-fill status for existing modules
UPDATE public.module_definitions
SET status = 'published'
WHERE status IS NULL;

-- 8. Index for fast sidebar look-ups by company + industry
CREATE INDEX IF NOT EXISTS idx_module_definitions_company_industry
  ON public.module_definitions (company_id, industry_type);

-- 9. Index for status filtering
CREATE INDEX IF NOT EXISTS idx_module_definitions_status
  ON public.module_definitions (status);
