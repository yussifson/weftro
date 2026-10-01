-- Phase 1: Add Plan Visibility and Industry Toggle System
-- This migration enables hiding test plans and controlling industry visibility

-- =====================================================
-- PART 1: Add is_visible column to subscription_plans
-- =====================================================

ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT true;

-- Hide test plans (amount = 2) from regular users
UPDATE public.subscription_plans 
SET is_visible = false 
WHERE name = 'test plan' AND price_monthly = 2;

-- =====================================================
-- PART 2: Create industry_visibility table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.industry_visibility (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    industry_key TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    CONSTRAINT industry_key_not_empty CHECK (industry_key != '')
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_industry_visibility_active ON public.industry_visibility(is_active);
CREATE INDEX IF NOT EXISTS idx_industry_visibility_key ON public.industry_visibility(industry_key);

-- Add trigger to update updated_at automatically
CREATE OR REPLACE FUNCTION update_industry_visibility_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_industry_visibility_timestamp ON public.industry_visibility;
CREATE TRIGGER trigger_update_industry_visibility_timestamp
    BEFORE UPDATE ON public.industry_visibility
    FOR EACH ROW
    EXECUTE FUNCTION update_industry_visibility_timestamp();

-- =====================================================
-- PART 3: RLS Policies for industry_visibility
-- =====================================================

ALTER TABLE public.industry_visibility ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Industry visibility viewable by authenticated" ON public.industry_visibility;
DROP POLICY IF EXISTS "Industry visibility updatable by super admin" ON public.industry_visibility;
DROP POLICY IF EXISTS "Industry visibility insertable by super admin" ON public.industry_visibility;
DROP POLICY IF EXISTS "Industry visibility deletable by super admin" ON public.industry_visibility;

-- Create new policies
CREATE POLICY "Industry visibility viewable by authenticated" 
    ON public.industry_visibility 
    FOR SELECT 
    USING (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "Industry visibility updatable by super admin" 
    ON public.industry_visibility 
    FOR UPDATE 
    USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'super_admin'));

CREATE POLICY "Industry visibility insertable by super admin" 
    ON public.industry_visibility 
    FOR INSERT 
    WITH CHECK (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'super_admin'));

CREATE POLICY "Industry visibility deletable by super admin" 
    ON public.industry_visibility 
    FOR DELETE 
    USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'super_admin'));

-- =====================================================
-- PART 4: Seed initial industry visibility data
-- =====================================================

-- Get all existing industries from the system and insert them
INSERT INTO public.industry_visibility (industry_key, is_active)
VALUES 
    ('law', true),
    ('school', true),
    ('highschool', true),
    ('healthcare', true),
    ('hospital', true),
    ('clinic', true),
    ('pharmacy', true),
    ('laboratory', true),
    ('realEstate', true),
    ('events', true),
    ('hospitality', true),
    ('hotel', true),
    ('restaurant', true),
    ('retail', true),
    ('manufacturing', true),
    ('logistics', true),
    ('ecommerce', true),
    ('fintech', true),
    ('insurance', true),
    ('education', true),
    ('nonprofit', true),
    ('government', true)
ON CONFLICT (industry_key) DO NOTHING;

-- =====================================================
-- PART 5: Update subscription_plans RLS for visibility
-- =====================================================

-- Drop existing plan visibility policy if exists
DROP POLICY IF EXISTS "Plans viewable by everyone if visible" ON public.subscription_plans;

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Plans viewable based on visibility and role" ON public.subscription_plans;

CREATE POLICY "Plans viewable based on visibility and role" 
    ON public.subscription_plans 
    FOR SELECT 
    USING (
        -- Super admins see all plans
        auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'super_admin')
        -- Regular users see only visible plans
        OR is_visible = true
    );

-- =====================================================
-- PART 6: Add audit fields to subscription_plans
-- =====================================================

ALTER TABLE public.subscription_plans
ADD COLUMN IF NOT EXISTS visibility_changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS visibility_changed_at TIMESTAMP WITH TIME ZONE;

-- Update visibility_changed_at for the test plans we just hidden
UPDATE public.subscription_plans 
SET visibility_changed_at = NOW(),
    visibility_changed_by = auth.uid()
WHERE name = 'test plan' AND is_visible = false AND visibility_changed_at IS NULL;

-- Create audit log table for compliance
CREATE TABLE IF NOT EXISTS public.industry_visibility_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    industry_key TEXT NOT NULL,
    old_status BOOLEAN,
    new_status BOOLEAN,
    changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reason TEXT
);

-- Create audit trigger
CREATE OR REPLACE FUNCTION audit_industry_visibility_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.industry_visibility_audit (industry_key, old_status, new_status, changed_by)
    VALUES (NEW.industry_key, OLD.is_active, NEW.is_active, auth.uid());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_audit_industry_visibility ON public.industry_visibility;
CREATE TRIGGER trigger_audit_industry_visibility
    AFTER UPDATE ON public.industry_visibility
    FOR EACH ROW
    WHEN (OLD.is_active IS DISTINCT FROM NEW.is_active)
    EXECUTE FUNCTION audit_industry_visibility_changes();

-- =====================================================
-- PART 7: Ensure backward compatibility
-- =====================================================

-- Ensure all existing plans have is_visible set
UPDATE public.subscription_plans 
SET is_visible = true 
WHERE is_visible IS NULL;

-- Make is_visible NOT NULL for data integrity
ALTER TABLE public.subscription_plans
ALTER COLUMN is_visible SET DEFAULT true,
ALTER COLUMN is_visible SET NOT NULL;
