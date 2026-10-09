-- ═══════════════════════════════════════════════════════════════════════════
--  INTEGRATION KNOWLEDGE — fixes the uuid/text mismatch safely
--  Drops old foreign keys, alters columns to text, recreates policies.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Create table (will preserve existing types if already created)
CREATE TABLE IF NOT EXISTS public.integration_knowledge (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id           text        NOT NULL,
  space_id             text,
  connected_by_user_id text        NOT NULL,
  integration_type     text        NOT NULL,
  source_id            text,
  source_url           text,
  title                text        NOT NULL,
  summary              text,
  raw_content          text,
  tags                 text[],
  sentiment            text,
  flagged_action       text,
  metadata             jsonb,
  visibility           text        NOT NULL DEFAULT 'private',
  is_flagged           boolean     NOT NULL DEFAULT false,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- 2. Drop old constraints (from V1) that block type conversion
ALTER TABLE public.integration_knowledge DROP CONSTRAINT IF EXISTS integration_knowledge_company_id_fkey;
ALTER TABLE public.integration_knowledge DROP CONSTRAINT IF EXISTS integration_knowledge_space_id_fkey;

-- 3. Force existing columns to be TEXT
ALTER TABLE public.integration_knowledge ALTER COLUMN company_id TYPE text USING company_id::text;
ALTER TABLE public.integration_knowledge ALTER COLUMN space_id TYPE text USING space_id::text;
ALTER TABLE public.integration_knowledge ALTER COLUMN connected_by_user_id TYPE text USING connected_by_user_id::text;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_integration_knowledge_company  ON public.integration_knowledge (company_id);
CREATE INDEX IF NOT EXISTS idx_integration_knowledge_user     ON public.integration_knowledge (connected_by_user_id);
CREATE INDEX IF NOT EXISTS idx_integration_knowledge_type     ON public.integration_knowledge (integration_type);
CREATE INDEX IF NOT EXISTS idx_integration_knowledge_flagged  ON public.integration_knowledge (is_flagged) WHERE is_flagged = true;
CREATE INDEX IF NOT EXISTS idx_integration_knowledge_space    ON public.integration_knowledge (space_id) WHERE space_id IS NOT NULL;

-- RLS
ALTER TABLE public.integration_knowledge ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_see_own"      ON public.integration_knowledge;
DROP POLICY IF EXISTS "users_see_company"  ON public.integration_knowledge;
DROP POLICY IF EXISTS "users_see_space"    ON public.integration_knowledge;
DROP POLICY IF EXISTS "users_insert_own"   ON public.integration_knowledge;
DROP POLICY IF EXISTS "users_manage_own"   ON public.integration_knowledge;

-- Own records
DROP POLICY IF EXISTS "users_see_own" ON public.integration_knowledge;
CREATE POLICY "users_see_own" ON public.integration_knowledge
  FOR SELECT USING (connected_by_user_id = auth.uid()::text);

-- Company-wide records
DROP POLICY IF EXISTS "users_see_company" ON public.integration_knowledge;
CREATE POLICY "users_see_company" ON public.integration_knowledge
  FOR SELECT USING (
    visibility = 'company' AND
    company_id = ANY(
      ARRAY(SELECT company_id::text FROM public.profiles WHERE id::text = auth.uid()::text)
    )
  );

-- Space records
DROP POLICY IF EXISTS "users_see_space" ON public.integration_knowledge;
CREATE POLICY "users_see_space" ON public.integration_knowledge
  FOR SELECT USING (
    visibility = 'space' AND
    space_id = ANY(
      ARRAY(SELECT space_id::text FROM public.clipad_space_members WHERE user_id::text = auth.uid()::text)
    )
  );

DROP POLICY IF EXISTS "users_insert_own" ON public.integration_knowledge;
CREATE POLICY "users_insert_own" ON public.integration_knowledge
  FOR INSERT WITH CHECK (connected_by_user_id = auth.uid()::text);

DROP POLICY IF EXISTS "users_manage_own" ON public.integration_knowledge;
CREATE POLICY "users_manage_own" ON public.integration_knowledge
  FOR ALL USING (connected_by_user_id = auth.uid()::text);

-- ── Backfill clipad_imported_knowledge visibility columns ─────────────────────
ALTER TABLE public.clipad_imported_knowledge
  ADD COLUMN IF NOT EXISTS connected_by_user_id text,
  ADD COLUMN IF NOT EXISTS visibility           text NOT NULL DEFAULT 'company';

-- Also force these to text just in case they were created as UUID previously
ALTER TABLE public.clipad_imported_knowledge ALTER COLUMN connected_by_user_id TYPE text USING connected_by_user_id::text;
ALTER TABLE public.clipad_imported_knowledge ALTER COLUMN visibility TYPE text USING visibility::text;

UPDATE public.clipad_imported_knowledge
  SET visibility = 'company'
  WHERE visibility IS NULL OR visibility = '';
