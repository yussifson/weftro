-- ══════════════════════════════════════════════════════════════════════════════
-- WEFTRO V3 — PHASE 4 MIGRATION: ATOMIC CHUNK REPLACEMENT & SPACE-AWARE RETRIEVAL
-- Non-Destructive Extension for Canonical Knowledge Chunks
-- Migration: 20261020000000_clipad_v3_phase4_chunking_security.sql
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Atomic Document Chunk Replacement Function
-- Ensures that deleting stale chunks and inserting fresh chunks executes in a single
-- ACID database transaction. If any error occurs during insertion, the transaction rolls back,
-- completely preserving existing chunks and preventing data loss.
CREATE OR REPLACE FUNCTION public.replace_document_chunks(
  p_knowledge_id UUID,
  p_company_id UUID,
  p_chunks JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER -- Enforces caller's RLS and authenticated context
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_company_id UUID;
  v_chunk_record JSONB;
  v_inserted_count INT := 0;
  v_chunk_index INT;
  v_content TEXT;
  v_embedding_str TEXT;
  v_embedding_vector vector(768);
BEGIN
  -- Verify caller organization context
  SELECT company_id INTO v_caller_company_id
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_caller_company_id IS NULL OR v_caller_company_id::text <> p_company_id::text THEN
    RAISE EXCEPTION 'Unauthorized: Caller company context does not match target company.';
  END IF;

  -- Verify parent knowledge record exists and belongs to target company
  IF NOT EXISTS (
    SELECT 1 FROM public.clipad_imported_knowledge
    WHERE id = p_knowledge_id AND company_id::text = p_company_id::text
  ) THEN
    RAISE EXCEPTION 'Parent knowledge document not found or does not belong to target organization.';
  END IF;

  -- Step 1: Delete existing stale chunks for this parent record
  DELETE FROM public.clipad_knowledge_chunks
  WHERE knowledge_id = p_knowledge_id AND company_id = p_company_id;

  -- Step 2: Insert fresh chunks from JSONB array
  IF p_chunks IS NOT NULL AND jsonb_array_length(p_chunks) > 0 THEN
    FOR v_chunk_record IN SELECT * FROM jsonb_array_elements(p_chunks)
    LOOP
      v_chunk_index := (v_chunk_record->>'chunk_index')::INT;
      v_content := v_chunk_record->>'content';
      v_embedding_str := v_chunk_record->>'embedding';

      IF v_embedding_str IS NOT NULL AND v_embedding_str <> '' THEN
        v_embedding_vector := v_embedding_str::vector(768);
      ELSE
        v_embedding_vector := NULL;
      END IF;

      INSERT INTO public.clipad_knowledge_chunks (
        id,
        knowledge_id,
        company_id,
        chunk_index,
        content,
        embedding,
        created_at
      ) VALUES (
        COALESCE((v_chunk_record->>'id')::UUID, gen_random_uuid()),
        p_knowledge_id,
        p_company_id,
        v_chunk_index,
        v_content,
        v_embedding_vector,
        NOW()
      );

      v_inserted_count := v_inserted_count + 1;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'knowledge_id', p_knowledge_id,
    'company_id', p_company_id,
    'chunks_created', v_inserted_count
  );
END;
$$;

-- Grant replace_document_chunks strictly to authenticated sessions
REVOKE ALL ON FUNCTION public.replace_document_chunks(UUID, UUID, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.replace_document_chunks(UUID, UUID, JSONB) FROM service_role;
GRANT EXECUTE ON FUNCTION public.replace_document_chunks(UUID, UUID, JSONB) TO authenticated;


-- 2. Space-Aware & Permission-Enforced Chunk Retrieval RPC
-- Upgrades match_knowledge_chunks with inline parent visibility and private-space membership checks.
CREATE OR REPLACE FUNCTION public.match_knowledge_chunks_secure(
  query_embedding vector(768),
  match_company_id UUID,
  match_threshold FLOAT DEFAULT 0.4,
  match_count INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  provider TEXT,
  content_type TEXT,
  title TEXT,
  content TEXT,
  ai_summary TEXT,
  url TEXT,
  author TEXT,
  similarity FLOAT,
  chunk_id UUID,
  chunk_index INT,
  space_id UUID
)
LANGUAGE plpgsql
SECURITY INVOKER -- Enforces caller's RLS and authenticated context
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_company_id UUID;
  v_is_admin BOOLEAN := false;
BEGIN
  -- Resolve caller profile and authorization role
  SELECT p.company_id, (p.role IN ('admin', 'super_admin'))
  INTO v_company_id, v_is_admin
  FROM public.profiles p
  WHERE p.id = v_user_id;

  -- Strict tenant boundary check: Reject cross-tenant callers
  IF v_company_id IS NULL OR v_company_id::text <> match_company_id::text THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    k.id,
    k.provider,
    k.content_type,
    k.title,
    c.content,
    k.ai_summary,
    k.url,
    k.author,
    (1 - (c.embedding <=> query_embedding))::FLOAT AS similarity,
    c.id AS chunk_id,
    c.chunk_index,
    k.space_id
  FROM public.clipad_knowledge_chunks c
  JOIN public.clipad_imported_knowledge k ON k.id = c.knowledge_id
  WHERE
    c.company_id = match_company_id
    AND c.embedding IS NOT NULL
    AND (1 - (c.embedding <=> query_embedding)) > match_threshold
    -- Zero-Trust Authorization Matrix:
    AND (
      -- 1. Tenant admin bypass within own organization
      v_is_admin
      OR
      -- 2. Personal knowledge imported by this user
      k.connected_by_user_id = v_user_id::text
      OR
      -- 3. Company-wide non-private knowledge
      (k.visibility = 'company' AND (k.space_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM public.clipad_spaces s WHERE s.id = k.space_id AND s.is_private = true
      )))
      OR
      -- 4. Space-level knowledge where caller is an active space member
      (k.space_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.clipad_space_members sm
        WHERE sm.space_id = k.space_id AND sm.user_id = v_user_id
      ))
    )
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function privileges: Revoke service_role, grant strictly to authenticated callers
REVOKE ALL ON FUNCTION public.match_knowledge_chunks_secure(vector(768), UUID, FLOAT, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.match_knowledge_chunks_secure(vector(768), UUID, FLOAT, INT) FROM service_role;
GRANT EXECUTE ON FUNCTION public.match_knowledge_chunks_secure(vector(768), UUID, FLOAT, INT) TO authenticated;
