-- ══════════════════════════════════════════════════════════════════════════════
-- WEFTRO V3 — PHASE 2 MIGRATION: EMBEDDING STORAGE & HYBRID RETRIEVAL ENGINE
-- Additive, Non-Destructive Extension for Canonical Organizational Memories
-- Migration: 20261018000000_clipad_v3_phase2_embeddings.sql
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Ensure pgvector extension is present
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;

-- 2. Additive nullable embedding column to canonical clipad_v3_memories
-- Adding a nullable column without defaults does not lock rows or rewrite tables.
ALTER TABLE public.clipad_v3_memories
ADD COLUMN IF NOT EXISTS embedding vector(768);

-- 3. Standard Transaction-Compatible HNSW Vector Index
CREATE INDEX IF NOT EXISTS idx_clipad_v3_memories_embedding_hnsw
ON public.clipad_v3_memories USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 4. Full-Text Search GIN Index (Perfectly aligned with COALESCE query expression)
CREATE INDEX IF NOT EXISTS idx_clipad_v3_memories_fts
ON public.clipad_v3_memories USING gin (to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(content, '') || ' ' || COALESCE(summary, '')));

-- 5. Secure Hybrid Retrieval RPC Function
CREATE OR REPLACE FUNCTION public.match_memories_hybrid(
  query_text TEXT,
  query_embedding vector(768),
  match_count INT DEFAULT 20,
  filter_tier TEXT DEFAULT NULL,
  filter_space_id UUID DEFAULT NULL,
  min_confidence FLOAT DEFAULT 0.0,
  similarity_threshold FLOAT DEFAULT 0.15
)
RETURNS TABLE (
  id UUID,
  company_id UUID,
  team_space_id UUID,
  title TEXT,
  content TEXT,
  summary TEXT,
  memory_type TEXT,
  memory_tier TEXT,
  confidence_score FLOAT,
  importance FLOAT,
  source_type TEXT,
  source_id TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  similarity FLOAT,
  search_rank FLOAT,
  combined_score FLOAT
)
LANGUAGE plpgsql
SECURITY INVOKER -- Enforces caller's RLS policies automatically
SET search_path = public, pg_temp
AS $$
DECLARE
  v_company_id TEXT;
  v_user_id UUID;
  v_is_admin BOOLEAN;
BEGIN
  -- Authoritatively resolve session credentials directly from Postgres auth context
  v_user_id := auth.uid();
  v_company_id := public.get_auth_company_id();
  v_is_admin := public.is_super_admin() OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = v_user_id AND role IN ('super_admin', 'admin')
  );

  -- Reject unauthenticated callers immediately (requires active user session)
  IF v_user_id IS NULL OR (v_company_id IS NULL AND NOT v_is_admin) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    m.id,
    m.company_id,
    m.team_space_id,
    m.title,
    m.content,
    m.summary,
    m.memory_type,
    m.memory_tier,
    m.confidence_score::FLOAT,
    m.importance::FLOAT,
    m.source_type,
    m.source_id,
    m.created_at,
    m.updated_at,
    COALESCE(1 - (m.embedding <=> query_embedding), 0.0)::FLOAT AS similarity,
    COALESCE(ts_rank_cd(to_tsvector('english', COALESCE(m.title, '') || ' ' || COALESCE(m.content, '') || ' ' || COALESCE(m.summary, '')), plainto_tsquery('english', query_text)), 0.0)::FLOAT AS search_rank,
    (
      COALESCE(1 - (m.embedding <=> query_embedding), 0.0) * 0.60 +
      COALESCE(ts_rank_cd(to_tsvector('english', COALESCE(m.title, '') || ' ' || COALESCE(m.content, '') || ' ' || COALESCE(m.summary, '')), plainto_tsquery('english', query_text)), 0.0) * 0.40
    )::FLOAT AS combined_score
  FROM public.clipad_v3_memories m
  WHERE
    -- 1. Active Lifecycle Enforcement (Excludes ARCHIVED, SUPERSEDED, and DELETED)
    m.status = 'ACTIVE'
    AND m.is_active = true
    -- 2. Multi-Tenant Boundary Enforcement
    AND m.company_id::text = v_company_id
    -- 3. Personal Memory Boundary (Strictly only owner)
    AND (m.memory_tier != 'personal' OR m.user_id = v_user_id)
    -- 4. Space Boundary (Enforced strictly on actual team_space_id regardless of tier label)
    AND (
      m.team_space_id IS NULL
      OR v_is_admin
      OR m.team_space_id IN (
        SELECT space_id FROM public.clipad_space_members WHERE user_id = v_user_id
      )
      OR m.team_space_id IN (
        SELECT id FROM public.clipad_spaces WHERE is_private = false AND company_id::text = v_company_id
      )
    )
    -- 5. Caller Optional Filters (Untrusted caller arguments strictly constrained)
    AND (filter_tier IS NULL OR m.memory_tier = filter_tier)
    AND (filter_space_id IS NULL OR m.team_space_id = filter_space_id)
    AND (m.confidence_score >= min_confidence)
    -- 6. Hybrid Matching with Lexical Fallback
    AND (
      (m.embedding IS NOT NULL AND (1 - (m.embedding <=> query_embedding)) >= similarity_threshold)
      OR to_tsvector('english', COALESCE(m.title, '') || ' ' || COALESCE(m.content, '') || ' ' || COALESCE(m.summary, '')) @@ plainto_tsquery('english', query_text)
      OR (query_text IS NULL OR query_text = '')
    )
  ORDER BY combined_score DESC
  LIMIT match_count;
END;
$$;

-- 6. Function Grants: Restricted exclusively to authenticated users with user session
REVOKE ALL ON FUNCTION public.match_memories_hybrid(TEXT, vector(768), INT, TEXT, UUID, FLOAT, FLOAT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.match_memories_hybrid(TEXT, vector(768), INT, TEXT, UUID, FLOAT, FLOAT) FROM service_role;
GRANT EXECUTE ON FUNCTION public.match_memories_hybrid(TEXT, vector(768), INT, TEXT, UUID, FLOAT, FLOAT) TO authenticated;
