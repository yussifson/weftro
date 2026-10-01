-- Migration: Document Chunking for RAG Pipeline

-- ─── Knowledge Chunks Table ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clipad_knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_id UUID REFERENCES public.clipad_imported_knowledge(id) ON DELETE CASCADE,
  company_id UUID NOT NULL,
  chunk_index INT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(768),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast filtering
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_knowledge_id ON public.clipad_knowledge_chunks(knowledge_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_company_id ON public.clipad_knowledge_chunks(company_id);

-- Enable RLS
ALTER TABLE public.clipad_knowledge_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "knowledge_chunks_company_isolation" ON public.clipad_knowledge_chunks
  FOR ALL USING (
    company_id::text IN (
      SELECT company_id::text FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Create IVFFLAT index on embedding for fast semantic search
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding ON public.clipad_knowledge_chunks 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ─── RPC Function: match_knowledge_chunks ─────────────────────────────────────
-- Matches the most relevant chunks and joins with the parent knowledge document
CREATE OR REPLACE FUNCTION public.match_knowledge_chunks(
  query_embedding vector(768),
  match_company_id text,
  match_threshold FLOAT DEFAULT 0.6,
  match_count INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  provider TEXT,
  content_type TEXT,
  title TEXT,
  content TEXT, -- Returns the exact chunk content instead of the full document content
  ai_summary TEXT,
  url TEXT,
  author TEXT,
  ai_entities JSONB,
  imported_at TIMESTAMPTZ,
  similarity FLOAT,
  chunk_id UUID,
  chunk_index INT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    k.id,
    k.provider,
    k.content_type,
    k.title,
    c.content, -- Map the matched chunk content directly to content for easy UI rendering
    k.ai_summary,
    k.url,
    k.author,
    k.ai_entities,
    k.imported_at,
    1 - (c.embedding <=> query_embedding) AS similarity,
    c.id AS chunk_id,
    c.chunk_index
  FROM public.clipad_knowledge_chunks c
  JOIN public.clipad_imported_knowledge k ON k.id = c.knowledge_id
  WHERE
    c.company_id::text = match_company_id::text
    AND c.embedding IS NOT NULL
    AND 1 - (c.embedding <=> query_embedding) > match_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
