-- supabase/migrations/20261019000000_clipad_v3_phase6_webhooks.sql
-- Weftro V3 Phase 6: Webhook Subscriptions, Delivery Queue & Audit Log
-- Extends public.clipad_v3_webhooks with app ownership and creates public.clipad_v3_webhook_deliveries

-- 1. Ensure columns on clipad_v3_webhooks
ALTER TABLE public.clipad_v3_webhooks
  ADD COLUMN IF NOT EXISTS app_id UUID REFERENCES public.clipad_v3_connect_apps(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS description TEXT;

-- Index for app lookups
CREATE INDEX IF NOT EXISTS idx_clipad_v3_webhooks_app ON public.clipad_v3_webhooks(app_id);
CREATE INDEX IF NOT EXISTS idx_clipad_v3_webhooks_company ON public.clipad_v3_webhooks(company_id);

-- 2. Create Webhook Deliveries Table
CREATE TABLE IF NOT EXISTS public.clipad_v3_webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES public.clipad_v3_webhooks(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_id UUID DEFAULT gen_random_uuid(),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (
    status IN ('queued', 'delivered', 'failed')
  ),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  response_status INTEGER,
  response_body TEXT,
  error_message TEXT,
  execution_duration_ms INTEGER,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for delivery lookups and tenant queries
CREATE INDEX IF NOT EXISTS idx_clipad_v3_webhook_deliveries_comp ON public.clipad_v3_webhook_deliveries(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clipad_v3_webhook_deliveries_hook ON public.clipad_v3_webhook_deliveries(webhook_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clipad_v3_webhook_deliveries_status ON public.clipad_v3_webhook_deliveries(status);

-- 3. RLS Policies
ALTER TABLE public.clipad_v3_webhook_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS clipad_v3_webhook_deliveries_select ON public.clipad_v3_webhook_deliveries;
CREATE POLICY clipad_v3_webhook_deliveries_select ON public.clipad_v3_webhook_deliveries
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );
