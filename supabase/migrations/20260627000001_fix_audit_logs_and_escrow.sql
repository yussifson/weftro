-- ============================================================
-- FIX: audit_logs user_id in AppSchema + escrow_accounts missing columns
-- Migration: 20260627000001_fix_audit_logs_and_escrow.sql
-- ============================================================
-- ERROR 1: "table audit_logs has no column named user_id"
--   CAUSE: AppSchema.js defines audit_logs WITHOUT user_id, so PowerSync's
--          local SQLite schema has no user_id column. RealEstateAPI.js inserts
--          user_id into audit_logs -> fails locally.
--   FIX:   Ensure user_id exists on Supabase side (already done in 20260623000000
--          but let's be safe). The AppSchema.js fix is done in code below.
--
-- ERROR 2: "Could not find 'conditions_for_release' column of 'univ_re_escrow_accounts'"
--   CAUSE: DB table was created with different column names:
--          DB has: held_conditions, release_conditions, deposited_amount, status
--          Code/AppSchema uses: conditions_for_release, release_status, escrow_amount,
--                               buyer_id, seller_id, agent_id, property_id,
--                               escrow_type, escrow_agent_company,
--                               escrow_agent_email, escrow_agent_phone
--   FIX:   Add all missing columns to the existing table
-- ============================================================

-- ============================================================
-- FIX 1: audit_logs - add user_id (safe, already exists guard)
-- ============================================================
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS action TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS record_type TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS record_id TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS changes TEXT;

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);

-- ============================================================
-- FIX 2: univ_re_escrow_accounts - add all missing columns
-- DB had: held_conditions, release_conditions, deposited_amount, status
-- AppSchema + RealEstateAPI.js expects the columns below
-- ============================================================

-- Core identifiers missing from DB
ALTER TABLE public.univ_re_escrow_accounts ADD COLUMN IF NOT EXISTS buyer_id TEXT;
ALTER TABLE public.univ_re_escrow_accounts ADD COLUMN IF NOT EXISTS seller_id TEXT;
ALTER TABLE public.univ_re_escrow_accounts ADD COLUMN IF NOT EXISTS agent_id TEXT;
ALTER TABLE public.univ_re_escrow_accounts ADD COLUMN IF NOT EXISTS property_id TEXT;

-- Financial fields (DB has deposited_amount; code also uses escrow_amount)
ALTER TABLE public.univ_re_escrow_accounts ADD COLUMN IF NOT EXISTS escrow_amount DECIMAL(15,2);
ALTER TABLE public.univ_re_escrow_accounts ADD COLUMN IF NOT EXISTS escrow_type TEXT;

-- Agent detail fields missing
ALTER TABLE public.univ_re_escrow_accounts ADD COLUMN IF NOT EXISTS escrow_agent_company TEXT;
ALTER TABLE public.univ_re_escrow_accounts ADD COLUMN IF NOT EXISTS escrow_agent_email TEXT;
ALTER TABLE public.univ_re_escrow_accounts ADD COLUMN IF NOT EXISTS escrow_agent_phone TEXT;

-- Release columns (DB has release_conditions; code expects conditions_for_release & release_status)
ALTER TABLE public.univ_re_escrow_accounts ADD COLUMN IF NOT EXISTS conditions_for_release TEXT;
ALTER TABLE public.univ_re_escrow_accounts ADD COLUMN IF NOT EXISTS release_status TEXT DEFAULT 'pending';

-- Notify schema cache to refresh
NOTIFY pgrst, 'reload schema';
