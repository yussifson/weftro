CREATE EXTENSION IF NOT EXISTS pg_trgm;
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
