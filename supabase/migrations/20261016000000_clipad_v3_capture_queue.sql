-- ══════════════════════════════════════════════════════════════════════════════
-- WEFTRO V3 — PHASE 2 MIGRATION: DURABLE CAPTURE PROCESSING QUEUE & WORKER INFRASTRUCTURE
-- Additive, Non-Destructive Schema Extension for Robust Asynchronous Processing
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Safely add 'QUEUED' value to existing capture_status enum if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_enum 
    WHERE enumtypid = 'public.capture_status'::regtype 
      AND enumlabel = 'QUEUED'
  ) THEN
    ALTER TYPE public.capture_status ADD VALUE 'QUEUED' AFTER 'CREATED';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

-- 2. Durable Capture Jobs Queue Table
CREATE TABLE IF NOT EXISTS public.clipad_v3_capture_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  capture_id UUID NOT NULL REFERENCES public.clipad_v3_captures(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (
    status IN ('queued', 'processing', 'completed', 'failed', 'dead_letter')
  ),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_at TIMESTAMPTZ,
  locked_by TEXT,
  completed_at TIMESTAMPTZ,
  last_error_message TEXT,
  last_error_stack TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  processing_metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT clipad_v3_capture_queue_capture_uniq UNIQUE (capture_id)
);

-- 3. High-Performance Indexing for Queue Workers & Tenant Isolation
CREATE INDEX IF NOT EXISTS idx_clipad_v3_queue_claim 
  ON public.clipad_v3_capture_queue (status, scheduled_at) 
  WHERE status IN ('queued', 'failed');

CREATE INDEX IF NOT EXISTS idx_clipad_v3_queue_recovery 
  ON public.clipad_v3_capture_queue (status, locked_at) 
  WHERE status = 'processing';

CREATE INDEX IF NOT EXISTS idx_clipad_v3_queue_company 
  ON public.clipad_v3_capture_queue (company_id);

CREATE INDEX IF NOT EXISTS idx_clipad_v3_queue_user 
  ON public.clipad_v3_capture_queue (user_id);

CREATE INDEX IF NOT EXISTS idx_clipad_v3_queue_capture 
  ON public.clipad_v3_capture_queue (capture_id);

-- 4. Enable Row Level Security (Tenant Protected)
ALTER TABLE public.clipad_v3_capture_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view capture jobs in their company" ON public.clipad_v3_capture_queue;
CREATE POLICY "Users can view capture jobs in their company"
  ON public.clipad_v3_capture_queue FOR SELECT
  USING (
    company_id::text IN (
      SELECT company_id::text FROM public.profiles WHERE id = auth.uid()
    )
    AND (
      auth.uid() = user_id
      OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'owner', 'super_admin')
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert queue jobs for their own captures" ON public.clipad_v3_capture_queue;
CREATE POLICY "Users can insert queue jobs for their own captures"
  ON public.clipad_v3_capture_queue FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND company_id::text IN (
      SELECT company_id::text FROM public.profiles WHERE id = auth.uid()
    )
  );

-- 5. Safe Concurrency Claim Function (SELECT FOR UPDATE SKIP LOCKED)
-- Supports both single-capture targeted runs and background batch claiming
CREATE OR REPLACE FUNCTION public.claim_next_capture_job(
  p_worker_id TEXT,
  p_batch_size INTEGER DEFAULT 1,
  p_specific_capture_id UUID DEFAULT NULL
)
RETURNS TABLE (
  job_id UUID,
  job_company_id UUID,
  job_user_id UUID,
  job_capture_id UUID,
  job_attempt_count INTEGER,
  job_max_attempts INTEGER,
  job_payload JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  WITH claimable AS (
    SELECT q.id
    FROM public.clipad_v3_capture_queue q
    WHERE (
      (p_specific_capture_id IS NOT NULL AND q.capture_id = p_specific_capture_id AND q.status IN ('queued', 'failed'))
      OR
      (p_specific_capture_id IS NULL AND (
        (q.status = 'queued' AND q.scheduled_at <= now())
        OR (q.status = 'failed' AND q.attempt_count < q.max_attempts AND q.scheduled_at <= now())
      ))
    )
    ORDER BY q.scheduled_at ASC
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.clipad_v3_capture_queue target
  SET 
    status = 'processing',
    locked_at = now(),
    locked_by = p_worker_id,
    attempt_count = target.attempt_count + 1,
    updated_at = now()
  FROM claimable
  WHERE target.id = claimable.id
  RETURNING 
    target.id,
    target.company_id,
    target.user_id,
    target.capture_id,
    target.attempt_count,
    target.max_attempts,
    target.payload;
END;
$$;

-- 6. Job Finalization Function with Lease Ownership Verification
-- Prevents a zombie or timed-out worker from overwriting a newer worker's state
CREATE OR REPLACE FUNCTION public.finalize_capture_job(
  p_job_id UUID,
  p_status TEXT, -- 'completed' or 'failed'
  p_worker_id TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_error_stack TEXT DEFAULT NULL,
  p_processing_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_job RECORD;
  v_backoff_seconds INTEGER;
  v_next_status TEXT;
BEGIN
  SELECT * INTO v_job 
  FROM public.clipad_v3_capture_queue 
  WHERE id = p_job_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Queue job % not found', p_job_id;
  END IF;

  -- Lease Ownership Check: If p_worker_id is passed, verify this worker still holds the lock
  IF p_worker_id IS NOT NULL AND v_job.locked_by IS DISTINCT FROM p_worker_id THEN
    RETURN FALSE;
  END IF;

  IF p_status = 'completed' THEN
    UPDATE public.clipad_v3_capture_queue
    SET 
      status = 'completed',
      locked_at = NULL,
      locked_by = NULL,
      completed_at = now(),
      processing_metadata = COALESCE(processing_metadata, '{}'::jsonb) || p_processing_metadata,
      updated_at = now()
    WHERE id = p_job_id;

    -- Update parent capture status
    UPDATE public.clipad_v3_captures
    SET 
      status = 'CONTEXTUALIZED',
      processed_at = now(),
      updated_at = now()
    WHERE id = v_job.capture_id;

    RETURN TRUE;

  ELSE -- Failed
    IF v_job.attempt_count >= v_job.max_attempts THEN
      v_next_status := 'dead_letter';
      
      UPDATE public.clipad_v3_captures
      SET 
        status = 'FAILED',
        updated_at = now()
      WHERE id = v_job.capture_id;
    ELSE
      v_next_status := 'failed';
    END IF;

    -- Exponential backoff: 30s * 2^(attempt - 1)
    v_backoff_seconds := (power(2, LEAST(v_job.attempt_count - 1, 6)) * 30)::INTEGER;

    UPDATE public.clipad_v3_capture_queue
    SET 
      status = v_next_status,
      locked_at = NULL,
      locked_by = NULL,
      scheduled_at = now() + (v_backoff_seconds || ' seconds')::INTERVAL,
      last_error_message = p_error_message,
      last_error_stack = p_error_stack,
      processing_metadata = COALESCE(processing_metadata, '{}'::jsonb) || p_processing_metadata,
      updated_at = now()
    WHERE id = p_job_id;

    RETURN TRUE;
  END IF;
END;
$$;

-- 7. Abandoned Job Recovery Function (Stale worker recovery)
CREATE OR REPLACE FUNCTION public.recover_abandoned_capture_jobs(
  p_stale_threshold_interval INTERVAL DEFAULT INTERVAL '10 minutes'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_recovered_count INTEGER := 0;
BEGIN
  WITH stale_jobs AS (
    SELECT id
    FROM public.clipad_v3_capture_queue
    WHERE status = 'processing'
      AND locked_at < (now() - p_stale_threshold_interval)
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.clipad_v3_capture_queue q
  SET 
    status = CASE 
      WHEN q.attempt_count >= q.max_attempts THEN 'dead_letter' 
      ELSE 'failed' 
    END,
    locked_at = NULL,
    locked_by = NULL,
    last_error_message = 'Worker abandoned execution or lease expired',
    scheduled_at = now() + INTERVAL '30 seconds',
    updated_at = now()
  FROM stale_jobs
  WHERE q.id = stale_jobs.id;

  GET DIAGNOSTICS v_recovered_count = ROW_COUNT;
  RETURN v_recovered_count;
END;
$$;

-- 8. Updated At Trigger
CREATE OR REPLACE FUNCTION update_clipad_v3_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_clipad_v3_capture_queue_updated_at ON public.clipad_v3_capture_queue;
CREATE TRIGGER trigger_clipad_v3_capture_queue_updated_at
  BEFORE UPDATE ON public.clipad_v3_capture_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_clipad_v3_queue_updated_at();
