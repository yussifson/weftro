-- Fix audit_logs table to add user_id column if missing
-- This migration ensures audit_logs have proper user_id tracking

ALTER TABLE public.audit_logs
ADD COLUMN IF NOT EXISTS user_id TEXT,
ADD COLUMN IF NOT EXISTS company_id TEXT;

-- Create index for user_id if not exists
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_id ON public.audit_logs(company_id);
