-- ══════════════════════════════════════════════════════════════════════════════
-- CLIPAD V3 — PHASE 4 MIGRATION
-- Knowledge Graph Extension + Advanced Search + AI Assistant Intelligence
-- Additive only. No existing tables or data are modified destructively.
-- ══════════════════════════════════════════════════════════════════════════════

-- ─── 1. Expand Entity Types to include 'smart_moment' ────────────────────────
-- entity_type constraint in Phase 2 did not include 'smart_moment'
-- We safely add it by dropping and recreating the constraint.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'clipad_v3_entities_entity_type_check'
    AND conrelid = 'public.clipad_v3_entities'::regclass
  ) THEN
    ALTER TABLE public.clipad_v3_entities DROP CONSTRAINT clipad_v3_entities_entity_type_check;
  END IF;
END $$;

ALTER TABLE public.clipad_v3_entities
  ADD CONSTRAINT clipad_v3_entities_entity_type_check CHECK (
    entity_type IN (
      'person', 'organization', 'team', 'space', 'project',
      'meeting', 'conversation', 'document', 'knowledge',
      'decision', 'commitment', 'task', 'event', 'memory', 'smart_moment'
    )
  );

-- ─── 2. Expand Relationship Types ────────────────────────────────────────────
-- Phase 2 only had 9 relationship types. Phase 4 needs 14.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'clipad_v3_entity_relationships_relationship_type_check'
    AND conrelid = 'public.clipad_v3_entity_relationships'::regclass
  ) THEN
    ALTER TABLE public.clipad_v3_entity_relationships
      DROP CONSTRAINT clipad_v3_entity_relationships_relationship_type_check;
  END IF;
END $$;

ALTER TABLE public.clipad_v3_entity_relationships
  ADD CONSTRAINT clipad_v3_entity_relationships_relationship_type_check CHECK (
    relationship_type IN (
      'member_of', 'participated_in', 'belongs_to', 'produced',
      'creates', 'relates_to', 'derived_from', 'concerns', 'supersedes',
      'assigned_to', 'owns', 'discussed_in', 'mentioned_in',
      'decided_in', 'committed_in', 'supports', 'blocks', 'depends_on'
    )
  );

-- ─── 3. Performance Indexes for Graph Traversal ──────────────────────────────
CREATE INDEX IF NOT EXISTS idx_v3_entities_company_type
  ON public.clipad_v3_entities (company_id, entity_type);

CREATE INDEX IF NOT EXISTS idx_v3_entities_entity_id
  ON public.clipad_v3_entities (entity_id, company_id);

CREATE INDEX IF NOT EXISTS idx_v3_entities_name_trgm
  ON public.clipad_v3_entities USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_v3_rels_source
  ON public.clipad_v3_entity_relationships (source_entity_id, company_id);

CREATE INDEX IF NOT EXISTS idx_v3_rels_target
  ON public.clipad_v3_entity_relationships (target_entity_id, company_id);

CREATE INDEX IF NOT EXISTS idx_v3_rels_company_type
  ON public.clipad_v3_entity_relationships (company_id, relationship_type);

-- ─── 4. Smart Moment Search Indexes ──────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_v3_moments_company_type_status
  ON public.clipad_v3_smart_moments (company_id, moment_type, status);

CREATE INDEX IF NOT EXISTS idx_v3_moments_created_at
  ON public.clipad_v3_smart_moments (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_v3_moments_title_search
  ON public.clipad_v3_smart_moments USING gin (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(content, '')));

-- ─── 5. Query Intelligence Log ───────────────────────────────────────────────
-- Non-sensitive metadata logging for assistant quality improvement.
-- No personal content is stored — only query intent classification metadata.
CREATE TABLE IF NOT EXISTS public.clipad_v3_query_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  query_hash    TEXT,                      -- SHA256 of query (no raw query stored here)
  intent        TEXT,                      -- DECISION_SEARCH, PROJECT_STATUS, GENERAL, etc.
  source_types  TEXT[],                    -- Which source types were retrieved
  result_count  INT DEFAULT 0,
  retrieval_ms  INT,                       -- Latency for observability
  ai_provider   TEXT DEFAULT 'cloudflare',
  created_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.clipad_v3_query_log ENABLE ROW LEVEL SECURITY;

-- Users can only see their own query logs; admins can see company-wide.
DROP POLICY IF EXISTS v3_query_log_select ON public.clipad_v3_query_log;
CREATE POLICY v3_query_log_select ON public.clipad_v3_query_log
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND (
      user_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
    )
  );

DROP POLICY IF EXISTS v3_query_log_insert ON public.clipad_v3_query_log;
CREATE POLICY v3_query_log_insert ON public.clipad_v3_query_log
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND user_id = auth.uid()
  );

-- ─── 6. Entity Aliases Table (for Entity Resolution) ─────────────────────────
-- Stores normalized name aliases that map to a canonical entity node.
-- Allows "Yussif", "Yussif Abdul-Jalil", "the founder" → same Person entity.
CREATE TABLE IF NOT EXISTS public.clipad_v3_entity_aliases (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  canonical_id   UUID REFERENCES public.clipad_v3_entities(id) ON DELETE CASCADE,
  alias_text     TEXT NOT NULL,
  confidence     NUMERIC(3,2) DEFAULT 1.00,
  source         TEXT DEFAULT 'manual',   -- 'manual', 'ai_extracted', 'inferred'
  created_at     TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT clipad_v3_alias_uniq UNIQUE (company_id, alias_text)
);

CREATE INDEX IF NOT EXISTS idx_v3_aliases_company_alias
  ON public.clipad_v3_entity_aliases (company_id, alias_text);

CREATE INDEX IF NOT EXISTS idx_v3_aliases_canonical
  ON public.clipad_v3_entity_aliases (canonical_id);

ALTER TABLE public.clipad_v3_entity_aliases ENABLE ROW LEVEL SECURITY;

-- Same company = readable; writing requires membership.
DROP POLICY IF EXISTS v3_aliases_select ON public.clipad_v3_entity_aliases;
CREATE POLICY v3_aliases_select ON public.clipad_v3_entity_aliases
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS v3_aliases_insert ON public.clipad_v3_entity_aliases;
CREATE POLICY v3_aliases_insert ON public.clipad_v3_entity_aliases
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS v3_aliases_update ON public.clipad_v3_entity_aliases;
CREATE POLICY v3_aliases_update ON public.clipad_v3_entity_aliases
  FOR UPDATE USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
  );

DROP POLICY IF EXISTS v3_aliases_delete ON public.clipad_v3_entity_aliases;
CREATE POLICY v3_aliases_delete ON public.clipad_v3_entity_aliases
  FOR DELETE USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
  );

-- ─── 7. Memories Full-Text Search Index ──────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_v3_memories_fts
  ON public.clipad_v3_memories USING gin (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, '') || ' ' || coalesce(summary, ''))
  );

-- ─── 8. RLS on entity aliases is handled above ───────────────────────────────
-- Summary of Phase 4 changes:
--   + clipad_v3_entities: entity_type expanded to include 'smart_moment'
--   + clipad_v3_entity_relationships: 9 new relationship types added
--   + 6 new performance indexes for graph traversal
--   + 3 new Smart Moment search indexes (type/status, date, FTS)
--   + clipad_v3_query_log: non-PII observability table (RLS enabled)
--   + clipad_v3_entity_aliases: entity resolution aliases (RLS enabled)
--   + clipad_v3_memories FTS index
-- No existing data modified. All changes are additive.
