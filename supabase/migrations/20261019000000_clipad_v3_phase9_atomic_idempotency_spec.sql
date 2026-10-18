-- ══════════════════════════════════════════════════════════════════════════════
-- WEFTRO V3 — PHASE 9 PLANNED MIGRATION: ATOMIC DISTRIBUTED IDEMPOTENCY LEDGER
-- Additive, Non-Destructive Schema Extension for Safe Concurrency Across Edge Function Instances
-- ══════════════════════════════════════════════════════════════════════════════
-- NOTE: THIS IS A PREPARED SPECIFICATION FOR THE PLANNED PRODUCTION RELEASE WINDOW.
-- DO NOT APPLY TO LIVE PRODUCTION WITHOUT EXPLICIT USER APPROVAL.
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Create Dedicated Idempotency Ledger Table
CREATE TABLE IF NOT EXISTS public.clipad_v3_idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL,
  request_path TEXT NOT NULL,
  request_hash TEXT, -- SHA-256 of normalized request body
  status TEXT NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS', 'RESOLVED', 'FAILED')),
  response_status INTEGER,
  response_body JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  CONSTRAINT clipad_v3_idempotency_company_key_uniq UNIQUE (company_id, idempotency_key)
);

-- 2. Indexes for Expiration Cleanup and Rapid Verification
CREATE INDEX IF NOT EXISTS idx_clipad_v3_idempotency_expires 
  ON public.clipad_v3_idempotency_keys (expires_at);

CREATE INDEX IF NOT EXISTS idx_clipad_v3_idempotency_lookup
  ON public.clipad_v3_idempotency_keys (company_id, idempotency_key, status);

-- 3. Row-Level Security: Isolated strictly by tenant company
ALTER TABLE public.clipad_v3_idempotency_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clipad_v3_idempotency_select" ON public.clipad_v3_idempotency_keys;
CREATE POLICY clipad_v3_idempotency_select ON public.clipad_v3_idempotency_keys
  FOR SELECT USING (
    company_id::text IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "clipad_v3_idempotency_all_service" ON public.clipad_v3_idempotency_keys;
CREATE POLICY clipad_v3_idempotency_all_service ON public.clipad_v3_idempotency_keys
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ══════════════════════════════════════════════════════════════════════════════
-- ROLLBACK SPECIFICATION:
-- DROP TABLE IF EXISTS public.clipad_v3_idempotency_keys CASCADE;
-- ══════════════════════════════════════════════════════════════════════════════
