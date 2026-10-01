-- 20260613000000_feature_gating_rls.sql
-- Enforce Plan limits via RLS

-- Function to check internal user limit
CREATE OR REPLACE FUNCTION auth_check_company_users_limit(p_company_id text) RETURNS boolean AS $$
DECLARE
    v_limit int;
    v_current_count int;
BEGIN
    -- Get limit (defaults to 5 if no plan found)
    SELECT COALESCE((sp.limits->>'users')::int, 5) INTO v_limit 
    FROM company_subscriptions cs 
    JOIN subscription_plans sp ON cs.plan_id = sp.id 
    WHERE cs.company_id = p_company_id;
    
    -- If no subscription found, assume starter limit of 5
    IF v_limit IS NULL THEN v_limit := 5; END IF;
    -- -1 means unlimited
    IF v_limit = -1 THEN RETURN true; END IF;
    
    -- Count current active staff records
    SELECT count(*) INTO v_current_count FROM staff_records WHERE company_id = p_company_id;
    
    RETURN v_current_count < v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing INSERT policy on staff_records if any, and create a gated one
DROP POLICY IF EXISTS "Insert staff record" ON public.staff_records;
DROP POLICY IF EXISTS "Company members can insert staff records" ON public.staff_records;
CREATE POLICY "Company members can insert staff records (Gated)" ON public.staff_records FOR INSERT WITH CHECK (
    company_id::text IN (SELECT company_id::text FROM profiles WHERE id = auth.uid()) AND
    auth_check_company_users_limit(company_id::text)
);


-- Function to check storage limit (stub, full implementation depends on how storage is tracked)
CREATE OR REPLACE FUNCTION auth_check_company_storage_limit(p_company_id uuid, new_bytes bigint) RETURNS boolean AS $$
DECLARE
    v_limit_gb numeric;
    v_current_bytes numeric;
BEGIN
    SELECT COALESCE((sp.limits->>'storage_gb')::numeric, 10) INTO v_limit_gb 
    FROM company_subscriptions cs 
    JOIN subscription_plans sp ON cs.plan_id = sp.id 
    WHERE cs.company_id = p_company_id;
    
    IF v_limit_gb IS NULL THEN v_limit_gb := 10; END IF;
    IF v_limit_gb = -1 THEN RETURN true; END IF;
    
    -- Assuming a usage_metrics table tracks this
    SELECT COALESCE(used_amount, 0) INTO v_current_bytes 
    FROM usage_metrics 
    WHERE company_id = p_company_id AND metric_name = 'storage_bytes';
    
    RETURN (v_current_bytes + new_bytes) <= (v_limit_gb * 1024 * 1024 * 1024);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- We apply the storage check as a trigger or policy on documents table if applicable.
-- Skipping document table drop for now to avoid breaking existing unknown schemas, 
-- but providing the function for future use.

-- Update usage_metrics to enforce AI token limits
CREATE OR REPLACE FUNCTION auth_check_company_ai_limit(p_company_id uuid, p_requested_tokens int) RETURNS boolean AS $$
DECLARE
    v_limit int;
    v_current_usage int;
BEGIN
    SELECT COALESCE((sp.limits->>'ai_credits_monthly')::int, 0) INTO v_limit 
    FROM company_subscriptions cs 
    JOIN subscription_plans sp ON cs.plan_id = sp.id 
    WHERE cs.company_id = p_company_id;
    
    IF v_limit IS NULL THEN v_limit := 0; END IF;
    IF v_limit = -1 THEN RETURN true; END IF;
    IF v_limit = 0 THEN RETURN false; END IF;
    
    SELECT COALESCE(used_amount, 0) INTO v_current_usage 
    FROM usage_metrics 
    WHERE company_id = p_company_id AND metric_name = 'ai_credits_monthly';
    
    RETURN (v_current_usage + p_requested_tokens) <= v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
