-- ══════════════════════════════════════════════════════════════════════════════
-- WEFTRO V3 — PHASE 3 MIGRATION: API GATEWAY, RATE LIMITING & SCOPE REFINEMENT
-- Additive, Non-Destructive Schema Extension for Production API Infrastructure
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Rate Limiting Table (Distributed server-side bucket per token / IP / company)
CREATE TABLE IF NOT EXISTS public.clipad_v3_api_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL, -- e.g. token:{tokenId} or ip:{ip} or company:{companyId}
  counter INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT clipad_v3_api_rate_limits_key_uniq UNIQUE (key)
);

CREATE INDEX IF NOT EXISTS idx_clipad_v3_rate_limits_expiry 
  ON public.clipad_v3_api_rate_limits(expires_at);

-- 2. Atomic Rate Limiter RPC
-- Returns: allowed (boolean), current count, limit, remaining, and reset_seconds
CREATE OR REPLACE FUNCTION public.check_api_rate_limit(
  p_key TEXT,
  p_max_requests INTEGER DEFAULT 120,
  p_window_seconds INTEGER DEFAULT 60
)
RETURNS TABLE (
  allowed BOOLEAN,
  current_count INTEGER,
  max_limit INTEGER,
  remaining INTEGER,
  reset_seconds INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
  v_record RECORD;
  v_expires TIMESTAMPTZ := v_now + (p_window_seconds || ' seconds')::INTERVAL;
  v_reset_sec INTEGER;
BEGIN
  -- Cleanup any expired records periodically or on hit
  DELETE FROM public.clipad_v3_api_rate_limits 
  WHERE expires_at < v_now;

  -- Upsert bucket
  INSERT INTO public.clipad_v3_api_rate_limits (key, counter, window_start, expires_at)
  VALUES (p_key, 1, v_now, v_expires)
  ON CONFLICT (key) DO UPDATE
  SET 
    counter = CASE 
      WHEN public.clipad_v3_api_rate_limits.expires_at < v_now THEN 1
      ELSE public.clipad_v3_api_rate_limits.counter + 1
    END,
    window_start = CASE 
      WHEN public.clipad_v3_api_rate_limits.expires_at < v_now THEN v_now
      ELSE public.clipad_v3_api_rate_limits.window_start
    END,
    expires_at = CASE 
      WHEN public.clipad_v3_api_rate_limits.expires_at < v_now THEN v_expires
      ELSE public.clipad_v3_api_rate_limits.expires_at
    END
  RETURNING * INTO v_record;

  v_reset_sec := GREATEST(1, EXTRACT(EPOCH FROM (v_record.expires_at - v_now))::INTEGER);

  RETURN QUERY SELECT 
    (v_record.counter <= p_max_requests) AS allowed,
    v_record.counter AS current_count,
    p_max_requests AS max_limit,
    GREATEST(0, p_max_requests - v_record.counter) AS remaining,
    v_reset_sec AS reset_seconds;
END;
$$;

-- 3. Extend clipad_v3_connect_tokens with standard rate limit attributes
ALTER TABLE public.clipad_v3_connect_tokens
  ADD COLUMN IF NOT EXISTS rate_limit_rpm INTEGER DEFAULT 120,
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;

-- 4. Enable RLS on rate limits table (internal/service-role access only)
ALTER TABLE public.clipad_v3_api_rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role access for rate limits" ON public.clipad_v3_api_rate_limits;
CREATE POLICY "Service role access for rate limits"
  ON public.clipad_v3_api_rate_limits
  FOR ALL
  USING (true)
  WITH CHECK (true);
