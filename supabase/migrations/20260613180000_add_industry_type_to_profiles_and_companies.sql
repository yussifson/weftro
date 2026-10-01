-- 20260613180000_add_industry_type_to_profiles_and_companies.sql
-- Add industry_type to companies and profiles for testing and overriding purposes

-- 1. Add industry_type to companies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'companies'
      AND column_name  = 'industry_type'
  ) THEN
    ALTER TABLE public.companies ADD COLUMN industry_type TEXT;
  END IF;
END $$;

-- 2. Add industry_type to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'profiles'
      AND column_name  = 'industry_type'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN industry_type TEXT;
  END IF;
END $$;
