-- ═══════════════════════════════════════════════════════════════════════════
--  INTEGRATION VISIBILITY MODEL — fully type-safe, run this in Supabase SQL editor
--  Uses auth.uid()::text everywhere to avoid uuid vs text operator errors.
--  Works regardless of whether company_id columns are uuid or text.
-- ═══════════════════════════════════════════════════════════════════════════

-- Step 1: Add new scoping columns (idempotent)
ALTER TABLE public.clipad_integrations
  ADD COLUMN IF NOT EXISTS connected_by_user_id text,
  ADD COLUMN IF NOT EXISTS visibility           text NOT NULL DEFAULT 'company',
  ADD COLUMN IF NOT EXISTS space_id             text;

-- Step 2: Backfill existing rows as company-wide
UPDATE public.clipad_integrations
  SET visibility = 'company'
  WHERE visibility IS NULL OR visibility = '';

-- Step 3: Indexes
CREATE INDEX IF NOT EXISTS idx_clipad_integrations_cbuid ON public.clipad_integrations (connected_by_user_id);
CREATE INDEX IF NOT EXISTS idx_clipad_integrations_vis   ON public.clipad_integrations (visibility);

-- Step 4: RLS
ALTER TABLE public.clipad_integrations ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies (cover any old names)
DROP POLICY IF EXISTS "company_integrations_select"  ON public.clipad_integrations;
DROP POLICY IF EXISTS "company_integrations_insert"  ON public.clipad_integrations;
DROP POLICY IF EXISTS "company_integrations_update"  ON public.clipad_integrations;
DROP POLICY IF EXISTS "company_integrations_delete"  ON public.clipad_integrations;
DROP POLICY IF EXISTS "integrations_select"          ON public.clipad_integrations;
DROP POLICY IF EXISTS "integrations_insert"          ON public.clipad_integrations;
DROP POLICY IF EXISTS "integrations_manage"          ON public.clipad_integrations;

-- SELECT: personal (connecting user) OR company-wide (same company) OR space (member)
-- All comparisons use ::text to be safe across any underlying column type
DROP POLICY IF EXISTS "integrations_select" ON public.clipad_integrations;
CREATE POLICY "integrations_select" ON public.clipad_integrations
  FOR SELECT USING (
    -- Personal: only the user who connected it
    connected_by_user_id = auth.uid()::text
    OR
    -- Company-wide: anyone in the same company
    (visibility = 'company'
      AND company_id::text IN (
        SELECT company_id::text FROM public.profiles
        WHERE id::text = auth.uid()::text
      )
    )
    OR
    -- Space-level: any member of that space
    (visibility = 'space'
      AND space_id::text IN (
        SELECT space_id::text FROM public.clipad_space_members
        WHERE user_id::text = auth.uid()::text
      )
    )
  );

-- INSERT: anyone in the company can connect; company-wide requires admin role
DROP POLICY IF EXISTS "integrations_insert" ON public.clipad_integrations;
CREATE POLICY "integrations_insert" ON public.clipad_integrations
  FOR INSERT WITH CHECK (
    company_id::text IN (
      SELECT company_id::text FROM public.profiles
      WHERE id::text = auth.uid()::text
    )
    AND (
      visibility != 'company'
      OR
      (SELECT role FROM public.profiles WHERE id::text = auth.uid()::text) IN ('admin', 'super_admin')
    )
  );

-- UPDATE / DELETE: owner or admin
DROP POLICY IF EXISTS "integrations_manage" ON public.clipad_integrations;
CREATE POLICY "integrations_manage" ON public.clipad_integrations
  FOR ALL USING (
    connected_by_user_id = auth.uid()::text
    OR
    (SELECT role FROM public.profiles WHERE id::text = auth.uid()::text) IN ('admin', 'super_admin')
  );

-- ── Backfill clipad_imported_knowledge ────────────────────────────────────────
ALTER TABLE public.clipad_imported_knowledge
  ADD COLUMN IF NOT EXISTS connected_by_user_id text,
  ADD COLUMN IF NOT EXISTS space_id             text,
  ADD COLUMN IF NOT EXISTS visibility           text NOT NULL DEFAULT 'company';

UPDATE public.clipad_imported_knowledge SET visibility = 'company' WHERE visibility IS NULL;

-- Propagate from parent integration
UPDATE public.clipad_imported_knowledge ik
  SET
    connected_by_user_id = ci.connected_by_user_id,
    space_id             = ci.space_id::text,
    visibility           = ci.visibility
  FROM public.clipad_integrations ci
  WHERE ik.integration_id = ci.id
    AND ik.connected_by_user_id IS NULL;
