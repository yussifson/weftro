-- ──────────────────────────────────────────────────────────────────
-- CLIPAD V3 — PHASE 1 FOUNDATION MIGRATION (STRICT MULTI-TENANT SECURITY)
-- Non-Destructive Extension of Existing Schema for Clipad V3
-- ──────────────────────────────────────────────────────────────────

-- 1. V3 Feature Flags Table (Per-Organization / Per-User Flag Storage)
CREATE TABLE IF NOT EXISTS public.clipad_v3_feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  flag_key TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT clipad_v3_flags_uniq UNIQUE (company_id, user_id, flag_key)
);

-- 2. Provenance-Aware Knowledge Meta Extension (Non-destructive)
ALTER TABLE public.clipad_imported_knowledge 
  ADD COLUMN IF NOT EXISTS source_type TEXT,
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS source_permissions JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS provenance_metadata JSONB DEFAULT '{}'::jsonb;

-- 3. V3 Organizational Memory Table (Personal, Team, Org Memory Tiers)
CREATE TABLE IF NOT EXISTS public.clipad_v3_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  team_space_id UUID REFERENCES public.clipad_spaces(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  memory_tier TEXT NOT NULL CHECK (memory_tier IN ('personal', 'team', 'organizational')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  confidence_score NUMERIC(3,2) DEFAULT 1.00,
  freshness_score NUMERIC(3,2) DEFAULT 1.00,
  source_type TEXT,
  source_id TEXT,
  source_url TEXT,
  permissions_policy JSONB DEFAULT '{"visibility": "inherit"}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. V3 Event Bus / Audit Trail Log Table
CREATE TABLE IF NOT EXISTS public.clipad_v3_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  source_domain TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  trace_id UUID DEFAULT gen_random_uuid(),
  processed_at TIMESTAMPTZ,
  error_log TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance & tenant filtering
CREATE INDEX IF NOT EXISTS idx_clipad_v3_flags_comp ON public.clipad_v3_feature_flags(company_id, flag_key);
CREATE INDEX IF NOT EXISTS idx_clipad_v3_memories_tier ON public.clipad_v3_memories(company_id, memory_tier, is_active);
CREATE INDEX IF NOT EXISTS idx_clipad_v3_memories_user ON public.clipad_v3_memories(user_id, memory_tier);
CREATE INDEX IF NOT EXISTS idx_clipad_v3_events_type ON public.clipad_v3_events(company_id, event_type, created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.clipad_v3_feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clipad_v3_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clipad_v3_events ENABLE ROW LEVEL SECURITY;

-- ──────────────────────────────────────────────────────────────────
-- STRICT MULTI-TENANT ROW LEVEL SECURITY POLICIES
-- ──────────────────────────────────────────────────────────────────

-- Drop legacy broad policies if present
DROP POLICY IF EXISTS clipad_v3_flags_select ON public.clipad_v3_feature_flags;
DROP POLICY IF EXISTS clipad_v3_memories_select ON public.clipad_v3_memories;
DROP POLICY IF EXISTS clipad_v3_events_select ON public.clipad_v3_events;

-- 1. Feature Flags Policies
CREATE POLICY clipad_v3_flags_select ON public.clipad_v3_feature_flags
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    OR user_id = auth.uid()
  );

CREATE POLICY clipad_v3_flags_insert ON public.clipad_v3_feature_flags
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
  );

CREATE POLICY clipad_v3_flags_update ON public.clipad_v3_feature_flags
  FOR UPDATE USING (
    user_id = auth.uid()
    OR company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
  );

-- 2. Memory Isolation Policies (Personal vs Team vs Org Isolation)
CREATE POLICY clipad_v3_memories_select ON public.clipad_v3_memories
  FOR SELECT USING (
    (memory_tier = 'personal' AND user_id = auth.uid())
    OR
    (memory_tier IN ('team', 'organizational') AND company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    ))
  );

CREATE POLICY clipad_v3_memories_insert ON public.clipad_v3_memories
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY clipad_v3_memories_update ON public.clipad_v3_memories
  FOR UPDATE USING (
    (memory_tier = 'personal' AND user_id = auth.uid())
    OR company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY clipad_v3_memories_delete ON public.clipad_v3_memories
  FOR DELETE USING (
    (memory_tier = 'personal' AND user_id = auth.uid())
    OR company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

-- 3. Event Bus Audit Policies
CREATE POLICY clipad_v3_events_select ON public.clipad_v3_events
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY clipad_v3_events_insert ON public.clipad_v3_events
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    OR user_id = auth.uid()
  );
-- ──────────────────────────────────────────────────────────────────
-- CLIPAD V3 — PHASE 2 ORGANIZATIONAL MEMORY & INTELLIGENCE MIGRATION
-- Non-Destructive Extension for Organizational Memory Core & Graph Entities
-- ──────────────────────────────────────────────────────────────────

-- 1. Extend clipad_v3_memories with Taxonomy, Lifecycle, & Provenance
ALTER TABLE public.clipad_v3_memories
  ADD COLUMN IF NOT EXISTS memory_type TEXT DEFAULT 'FACT',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS importance NUMERIC(3,2) DEFAULT 0.50,
  ADD COLUMN IF NOT EXISTS superseded_by UUID REFERENCES public.clipad_v3_memories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS version INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source_metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS speaker_id TEXT,
  ADD COLUMN IF NOT EXISTS speaker_name TEXT,
  ADD COLUMN IF NOT EXISTS timestamp_marker TEXT;

-- Status constraint check
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'clipad_v3_memories_status_check'
  ) THEN
    ALTER TABLE public.clipad_v3_memories
      ADD CONSTRAINT clipad_v3_memories_status_check
      CHECK (status IN ('ACTIVE', 'OUTDATED', 'SUPERSEDED', 'ARCHIVED', 'DELETED'));
  END IF;
END $$;

-- 2. V3 Normalized Organizational Entities Table
CREATE TABLE IF NOT EXISTS public.clipad_v3_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (
    entity_type IN ('person', 'organization', 'team', 'space', 'project', 'meeting', 'conversation', 'document', 'knowledge', 'decision', 'commitment', 'task', 'event', 'memory')
  ),
  entity_id TEXT, -- Mapped external or existing internal record ID
  name TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT clipad_v3_entity_uniq UNIQUE (company_id, entity_type, entity_id)
);

-- 3. V3 Graph-Ready Entity Relationships Table
CREATE TABLE IF NOT EXISTS public.clipad_v3_entity_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  source_entity_id UUID REFERENCES public.clipad_v3_entities(id) ON DELETE CASCADE,
  target_entity_id UUID REFERENCES public.clipad_v3_entities(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL CHECK (
    relationship_type IN ('member_of', 'participated_in', 'belongs_to', 'produced', 'creates', 'relates_to', 'derived_from', 'concerns', 'supersedes')
  ),
  confidence NUMERIC(3,2) DEFAULT 1.00,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT clipad_v3_rel_uniq UNIQUE (source_entity_id, target_entity_id, relationship_type)
);

-- Indexes for memory search and graph queries
CREATE INDEX IF NOT EXISTS idx_clipad_v3_memories_status ON public.clipad_v3_memories(company_id, status, memory_tier);
CREATE INDEX IF NOT EXISTS idx_clipad_v3_memories_type ON public.clipad_v3_memories(company_id, memory_type);
CREATE INDEX IF NOT EXISTS idx_clipad_v3_entities_comp ON public.clipad_v3_entities(company_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_clipad_v3_rels_source ON public.clipad_v3_entity_relationships(company_id, source_entity_id);
CREATE INDEX IF NOT EXISTS idx_clipad_v3_rels_target ON public.clipad_v3_entity_relationships(company_id, target_entity_id);

-- Enable RLS
ALTER TABLE public.clipad_v3_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clipad_v3_entity_relationships ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for Entities & Relationships
DROP POLICY IF EXISTS clipad_v3_entities_select ON public.clipad_v3_entities;
DROP POLICY IF EXISTS clipad_v3_entities_insert ON public.clipad_v3_entities;
DROP POLICY IF EXISTS clipad_v3_entities_update ON public.clipad_v3_entities;
DROP POLICY IF EXISTS clipad_v3_entities_delete ON public.clipad_v3_entities;

CREATE POLICY clipad_v3_entities_select ON public.clipad_v3_entities
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY clipad_v3_entities_insert ON public.clipad_v3_entities
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY clipad_v3_entities_update ON public.clipad_v3_entities
  FOR UPDATE USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY clipad_v3_entities_delete ON public.clipad_v3_entities
  FOR DELETE USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
  );

DROP POLICY IF EXISTS clipad_v3_rels_select ON public.clipad_v3_entity_relationships;
DROP POLICY IF EXISTS clipad_v3_rels_insert ON public.clipad_v3_entity_relationships;
DROP POLICY IF EXISTS clipad_v3_rels_update ON public.clipad_v3_entity_relationships;
DROP POLICY IF EXISTS clipad_v3_rels_delete ON public.clipad_v3_entity_relationships;

CREATE POLICY clipad_v3_rels_select ON public.clipad_v3_entity_relationships
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY clipad_v3_rels_insert ON public.clipad_v3_entity_relationships
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY clipad_v3_rels_update ON public.clipad_v3_entity_relationships
  FOR UPDATE USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY clipad_v3_rels_delete ON public.clipad_v3_entity_relationships
  FOR DELETE USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
  );

-- 5. Strict Space-Aware, Multi-Tenant, & JSONB-Enforced Database RLS Policies for Memories
DROP POLICY IF EXISTS clipad_v3_memories_select ON public.clipad_v3_memories;
DROP POLICY IF EXISTS clipad_v3_memories_insert ON public.clipad_v3_memories;
DROP POLICY IF EXISTS clipad_v3_memories_update ON public.clipad_v3_memories;
DROP POLICY IF EXISTS clipad_v3_memories_delete ON public.clipad_v3_memories;

-- SELECT Policy with Authoritative Space Membership & Private Source Protection
CREATE POLICY clipad_v3_memories_select ON public.clipad_v3_memories
  FOR SELECT USING (
    -- Multi-tenant isolation baseline
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND
    (
      -- 1. Personal tier: strictly accessible only by the owning user
      (memory_tier = 'personal' AND user_id = auth.uid())
      OR
      -- 2. Team tier: strictly requires non-null team_space_id with active membership or public space status
      (memory_tier = 'team' AND team_space_id IS NOT NULL AND (
        team_space_id IN (SELECT space_id FROM public.clipad_space_members WHERE user_id = auth.uid())
        OR team_space_id IN (SELECT id FROM public.clipad_spaces WHERE is_private = false)
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
      ))
      OR
      -- 3. Organizational tier: accessible across company members UNLESS marked private in permissions_policy
      (memory_tier = 'organizational' AND (
        COALESCE((permissions_policy->>'is_private')::boolean, false) = false
        OR user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
      ))
    )
  );

-- INSERT Policy with Scope & Privacy Validation
CREATE POLICY clipad_v3_memories_insert ON public.clipad_v3_memories
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND (
      memory_tier != 'team'
      OR (team_space_id IS NOT NULL AND (
        team_space_id IN (SELECT space_id FROM public.clipad_space_members WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
      ))
    )
    AND (
      COALESCE((permissions_policy->>'is_private')::boolean, false) = false
      OR memory_tier = 'personal'
      OR user_id = auth.uid()
    )
  );

-- UPDATE Policy
CREATE POLICY clipad_v3_memories_update ON public.clipad_v3_memories
  FOR UPDATE USING (
    (memory_tier = 'personal' AND user_id = auth.uid())
    OR
    (memory_tier = 'team' AND team_space_id IS NOT NULL AND (
      user_id = auth.uid()
      OR team_space_id IN (SELECT space_id FROM public.clipad_space_members WHERE user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
    ))
    OR
    (memory_tier = 'organizational' AND company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    ))
  );

-- DELETE Policy
CREATE POLICY clipad_v3_memories_delete ON public.clipad_v3_memories
  FOR DELETE USING (
    (memory_tier = 'personal' AND user_id = auth.uid())
    OR
    (memory_tier = 'team' AND company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    ) AND (
      user_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
    ))
    OR
    (memory_tier = 'organizational' AND company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    ))
  );
-- ──────────────────────────────────────────────────────────────────
-- CLIPAD V3 — PHASE 3 SMART MOMENTS & MEETING/VIDEO INTELLIGENCE MIGRATION
-- Non-Destructive Database Schema Extension for Smart Moments
-- ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.clipad_v3_smart_moments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  team_space_id UUID REFERENCES public.clipad_spaces(id) ON DELETE SET NULL,
  meeting_id UUID REFERENCES public.clipad_meeting_records(id) ON DELETE CASCADE,
  video_id UUID REFERENCES public.clipad_videos(id) ON DELETE CASCADE,
  moment_type TEXT NOT NULL CHECK (
    moment_type IN ('DECISION', 'ACTION', 'COMMITMENT', 'QUESTION', 'RISK', 'BLOCKER', 'INSIGHT', 'FOLLOW_UP', 'IMPORTANT_TOPIC', 'AGREEMENT', 'DISAGREEMENT', 'CHANGE')
  ),
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  confidence NUMERIC(3,2) DEFAULT 0.90,
  importance NUMERIC(3,2) DEFAULT 0.50,
  timestamp_start TEXT,
  timestamp_end TEXT,
  speaker_id TEXT,
  speaker_name TEXT,
  status TEXT DEFAULT 'detected' CHECK (
    status IN ('detected', 'confirmed', 'edited', 'dismissed', 'converted')
  ),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  CONSTRAINT clipad_v3_moment_meeting_video_check CHECK (
    meeting_id IS NOT NULL OR video_id IS NOT NULL
  )
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_clipad_v3_moments_meeting ON public.clipad_v3_smart_moments(meeting_id, created_at);
CREATE INDEX IF NOT EXISTS idx_clipad_v3_moments_video ON public.clipad_v3_smart_moments(video_id, created_at);
CREATE INDEX IF NOT EXISTS idx_clipad_v3_moments_comp_type ON public.clipad_v3_smart_moments(company_id, moment_type, status);

-- Enable RLS
ALTER TABLE public.clipad_v3_smart_moments ENABLE ROW LEVEL SECURITY;

-- Multi-Tenant & Permission-Aware RLS Policies
DROP POLICY IF EXISTS clipad_v3_moments_select ON public.clipad_v3_smart_moments;
DROP POLICY IF EXISTS clipad_v3_moments_insert ON public.clipad_v3_smart_moments;
DROP POLICY IF EXISTS clipad_v3_moments_update ON public.clipad_v3_smart_moments;
DROP POLICY IF EXISTS clipad_v3_moments_delete ON public.clipad_v3_smart_moments;

-- SELECT Policy: Inherits tenant, personal, and team space boundaries
CREATE POLICY clipad_v3_moments_select ON public.clipad_v3_smart_moments
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND (
      team_space_id IS NULL
      OR team_space_id IN (SELECT space_id FROM public.clipad_space_members WHERE user_id = auth.uid())
      OR team_space_id IN (SELECT id FROM public.clipad_spaces WHERE is_private = false OR is_private IS NULL)
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
    )
  );

-- INSERT Policy
CREATE POLICY clipad_v3_moments_insert ON public.clipad_v3_smart_moments
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND (
      team_space_id IS NULL
      OR team_space_id IN (SELECT space_id FROM public.clipad_space_members WHERE user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
    )
  );

-- UPDATE Policy: Allows creator, space members, or admins to confirm/edit/dismiss
CREATE POLICY clipad_v3_moments_update ON public.clipad_v3_smart_moments
  FOR UPDATE USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND (
      created_by = auth.uid()
      OR team_space_id IN (SELECT space_id FROM public.clipad_space_members WHERE user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
    )
  );

-- DELETE Policy
CREATE POLICY clipad_v3_moments_delete ON public.clipad_v3_smart_moments
  FOR DELETE USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND (
      created_by = auth.uid()
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
    )
  );
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
CREATE POLICY v3_query_log_select ON public.clipad_v3_query_log
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND (
      user_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
    )
  );

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
CREATE POLICY v3_aliases_select ON public.clipad_v3_entity_aliases
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY v3_aliases_insert ON public.clipad_v3_entity_aliases
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY v3_aliases_update ON public.clipad_v3_entity_aliases
  FOR UPDATE USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
  );

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
-- Migration for Clipad V3 Phase 5 - Capture System & Context Sessions

-- 1. ENUMS
CREATE TYPE capture_status AS ENUM ('CREATED', 'PROCESSING', 'PROCESSED', 'CLASSIFIED', 'CONTEXTUALIZED', 'INGESTED', 'FAILED', 'DISMISSED', 'ARCHIVED');
CREATE TYPE capture_visibility AS ENUM ('PERSONAL', 'TEAM', 'ORGANIZATIONAL');
CREATE TYPE context_session_status AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED');

-- 2. CONTEXT SESSIONS TABLE
CREATE TABLE IF NOT EXISTS clipad_v3_context_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status context_session_status DEFAULT 'ACTIVE',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    permissions JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_context_sessions_company ON clipad_v3_context_sessions(company_id);
CREATE INDEX idx_context_sessions_user ON clipad_v3_context_sessions(user_id);
CREATE INDEX idx_context_sessions_status ON clipad_v3_context_sessions(status);

-- 3. CAPTURES TABLE
CREATE TABLE IF NOT EXISTS clipad_v3_captures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    context_session_id UUID REFERENCES clipad_v3_context_sessions(id) ON DELETE SET NULL,
    source_type TEXT NOT NULL,
    source_id TEXT,
    capture_type TEXT NOT NULL, -- TEXT, NOTE, VOICE, SCREEN, VIDEO, DOCUMENT, CLIP, LINK, MEETING_CONTEXT, CONVERSATION_CONTEXT, EXTERNAL_CONTEXT
    title TEXT,
    content TEXT,
    content_type TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    provenance JSONB DEFAULT '{}'::jsonb,
    permission_info JSONB DEFAULT '{}'::jsonb,
    status capture_status DEFAULT 'CREATED',
    visibility capture_visibility DEFAULT 'PERSONAL',
    processing_version INT DEFAULT 1,
    captured_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (company_id, id)
);

CREATE INDEX idx_captures_company ON clipad_v3_captures(company_id);
CREATE INDEX idx_captures_user ON clipad_v3_captures(user_id);
CREATE INDEX idx_captures_session ON clipad_v3_captures(context_session_id);
CREATE INDEX idx_captures_status ON clipad_v3_captures(status);
CREATE INDEX idx_captures_visibility ON clipad_v3_captures(visibility);

-- 4. RLS POLICIES FOR CONTEXT SESSIONS
ALTER TABLE clipad_v3_context_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own context sessions"
    ON clipad_v3_context_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own context sessions"
    ON clipad_v3_context_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own context sessions"
    ON clipad_v3_context_sessions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own context sessions"
    ON clipad_v3_context_sessions FOR DELETE
    USING (auth.uid() = user_id);

-- 5. RLS POLICIES FOR CAPTURES
ALTER TABLE clipad_v3_captures ENABLE ROW LEVEL SECURITY;

-- Personal visibility: only creator can see
CREATE POLICY "Users can view their own personal captures"
    ON clipad_v3_captures FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
        AND (
            auth.uid() = user_id 
            OR 
            (visibility = 'ORGANIZATIONAL')
            OR
            (visibility = 'TEAM' AND EXISTS (
                SELECT 1 FROM clipad_team_members ctm 
                JOIN clipad_teams t ON t.id = ctm.team_id 
                WHERE ctm.user_id = auth.uid() 
                AND ctm.team_id = (permission_info->>'team_id')::uuid
            ))
        )
    );

CREATE POLICY "Users can insert their own captures"
    ON clipad_v3_captures FOR INSERT
    WITH CHECK (
        auth.uid() = user_id 
        AND company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "Users can update their own captures"
    ON clipad_v3_captures FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own captures"
    ON clipad_v3_captures FOR DELETE
    USING (auth.uid() = user_id);

-- 6. TRIGGERS
CREATE OR REPLACE FUNCTION update_clipad_v3_captures_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_clipad_v3_captures_updated_at
BEFORE UPDATE ON clipad_v3_captures
FOR EACH ROW
EXECUTE FUNCTION update_clipad_v3_captures_updated_at();

CREATE OR REPLACE FUNCTION update_clipad_v3_context_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_clipad_v3_context_sessions_updated_at
BEFORE UPDATE ON clipad_v3_context_sessions
FOR EACH ROW
EXECUTE FUNCTION update_clipad_v3_context_sessions_updated_at();
-- Migration to correct Phase 5 RLS issue (clipad_team_members -> clipad_space_members)

-- Drop the incorrect policy
DROP POLICY IF EXISTS "Users can view their own personal captures" ON clipad_v3_captures;

-- Recreate it using the canonical clipad_space_members
CREATE POLICY "Users can view accessible captures"
    ON clipad_v3_captures FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
        AND (
            auth.uid() = user_id 
            OR 
            (visibility = 'ORGANIZATIONAL')
            OR
            (visibility = 'TEAM' AND EXISTS (
                SELECT 1 FROM clipad_space_members csm 
                WHERE csm.user_id = auth.uid() 
                AND csm.space_id = (permission_info->>'space_id')::uuid
            ))
        )
    );
-- supabase/migrations/20261007220000_clipad_v3_phase6_browser_capture.sql
-- Phase 6: Browser & Desktop Capture Architecture (Privacy & Settings)

CREATE TABLE IF NOT EXISTS clipad_v3_capture_settings (
    user_id uuid REFERENCES auth.users(id) PRIMARY KEY,
    company_id text NOT NULL,
    is_capture_enabled boolean DEFAULT true,
    excluded_domains text[] DEFAULT '{}'::text[],
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- RLS Policies
ALTER TABLE clipad_v3_capture_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own capture settings"
    ON clipad_v3_capture_settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own capture settings"
    ON clipad_v3_capture_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own capture settings"
    ON clipad_v3_capture_settings FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own capture settings"
    ON clipad_v3_capture_settings FOR DELETE
    USING (auth.uid() = user_id);
-- supabase/migrations/20261007230000_clipad_v3_phase7_connect.sql
-- Phase 7: Connect Layer (API, OAuth, MCP, Webhooks)

-- 1. OAuth Apps / Connect Clients
CREATE TABLE IF NOT EXISTS clipad_v3_connect_apps (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id text NOT NULL,
    created_by uuid REFERENCES auth.users(id),
    name text NOT NULL,
    description text,
    client_id text UNIQUE NOT NULL,
    client_secret_hash text NOT NULL,
    redirect_uris text[] DEFAULT '{}'::text[],
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. OAuth Grants / Access Tokens
CREATE TABLE IF NOT EXISTS clipad_v3_connect_tokens (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    app_id uuid REFERENCES clipad_v3_connect_apps(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id),
    company_id text NOT NULL,
    token_hash text UNIQUE NOT NULL,
    scopes text[] NOT NULL DEFAULT '{}'::text[],
    expires_at timestamptz,
    revoked_at timestamptz,
    created_at timestamptz DEFAULT now()
);

-- 3. Webhooks
CREATE TABLE IF NOT EXISTS clipad_v3_webhooks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id text NOT NULL,
    created_by uuid REFERENCES auth.users(id),
    endpoint_url text NOT NULL,
    secret text NOT NULL,
    events text[] NOT NULL DEFAULT '{}'::text[],
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- RLS Policies

ALTER TABLE clipad_v3_connect_apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE clipad_v3_connect_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE clipad_v3_webhooks ENABLE ROW LEVEL SECURITY;

-- Users can view apps in their company
CREATE POLICY "Users can view connect apps"
    ON clipad_v3_connect_apps FOR SELECT
    USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Only admins/creators can manage apps (simplified to creators for this phase)
CREATE POLICY "Users can manage their connect apps"
    ON clipad_v3_connect_apps FOR ALL
    USING (created_by = auth.uid())
    WITH CHECK (created_by = auth.uid());

-- Users can view and revoke their own granted tokens
CREATE POLICY "Users can view their connect tokens"
    ON clipad_v3_connect_tokens FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can revoke their connect tokens"
    ON clipad_v3_connect_tokens FOR UPDATE
    USING (user_id = auth.uid());

-- Users can manage webhooks for their company (simplified to creators)
CREATE POLICY "Users can view webhooks"
    ON clipad_v3_webhooks FOR SELECT
    USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage webhooks"
    ON clipad_v3_webhooks FOR ALL
    USING (created_by = auth.uid())
    WITH CHECK (created_by = auth.uid());
-- Migration: Clipad V3 Phase 9 - Analytics, Insights, and Automation
-- Creates tables for Organizational Insights and Automation Rules with strict RLS.

-- 1. Organizational Insights Table
CREATE TABLE IF NOT EXISTS public.clipad_v3_organizational_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    insight_type TEXT NOT NULL, -- RECURRING_PROBLEM, BLOCKER, KNOWLEDGE_GAP, STALE_KNOWLEDGE, EMERGING_TOPIC, RECOMMENDATION
    title TEXT NOT NULL,
    summary TEXT,
    confidence FLOAT DEFAULT 0.0,
    status TEXT DEFAULT 'active', -- active, reviewed, dismissed, resolved
    first_detected_at TIMESTAMPTZ DEFAULT now(),
    last_observed_at TIMESTAMPTZ DEFAULT now(),
    evidence_count INT DEFAULT 1,
    source_ids JSONB DEFAULT '[]'::jsonb, -- array of UUIDs pointing to memories/moments/meetings
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_clipad_v3_insights_company ON public.clipad_v3_organizational_insights(company_id, insight_type, status);

-- 2. Automation Rules Table
CREATE TABLE IF NOT EXISTS public.clipad_v3_automation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    trigger_event TEXT NOT NULL, -- e.g., 'smart_moment.created', 'knowledge.stale'
    conditions JSONB DEFAULT '{}'::jsonb,
    action_type TEXT NOT NULL, -- 'create_recommendation', 'notify_manager'
    action_payload JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_clipad_v3_automation_company ON public.clipad_v3_automation_rules(company_id, is_active, trigger_event);

-- Enable RLS
ALTER TABLE public.clipad_v3_organizational_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clipad_v3_automation_rules ENABLE ROW LEVEL SECURITY;

-- Insights RLS
CREATE POLICY "Users can view company insights"
    ON public.clipad_v3_organizational_insights FOR SELECT
    USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update company insights"
    ON public.clipad_v3_organizational_insights FOR UPDATE
    USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert company insights"
    ON public.clipad_v3_organizational_insights FOR INSERT
    WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- Automation Rules RLS
CREATE POLICY "Users can view company automation rules"
    ON public.clipad_v3_automation_rules FOR SELECT
    USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage company automation rules"
    ON public.clipad_v3_automation_rules FOR ALL
    USING (
        company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()) 
        AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('super_admin', 'admin', 'owner')
    );
