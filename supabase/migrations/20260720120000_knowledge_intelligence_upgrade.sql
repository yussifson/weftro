-- Phase 1 & 4 DB changes: incremental sync column, pgvector, knowledge relationships

-- Add sync_frequency to clipad_integrations if not exists
ALTER TABLE public.clipad_integrations 
  ADD COLUMN IF NOT EXISTS sync_frequency TEXT DEFAULT 'manual' 
    CHECK (sync_frequency IN ('manual', '6h', '12h', '24h'));

ALTER TABLE public.clipad_integrations
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ DEFAULT NULL;

-- ─── pgvector Extension & Embeddings ─────────────────────────────────────────
-- Enable pgvector (must be done via Supabase dashboard or superuser)
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to imported knowledge
ALTER TABLE public.clipad_imported_knowledge
  ADD COLUMN IF NOT EXISTS embedding vector(768);

-- Create a vector similarity search function
CREATE OR REPLACE FUNCTION public.match_knowledge(
  query_embedding vector(768),
  match_company_id text, -- Changed to text to handle both uuid/text types safely
  match_threshold FLOAT DEFAULT 0.6,
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
  ai_entities JSONB,
  imported_at TIMESTAMPTZ,
  similarity FLOAT
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
    k.content,
    k.ai_summary,
    k.url,
    k.author,
    k.ai_entities,
    k.imported_at,
    1 - (k.embedding <=> query_embedding) AS similarity
  FROM public.clipad_imported_knowledge k
  WHERE
    k.company_id::text = match_company_id::text
    AND k.embedding IS NOT NULL
    AND 1 - (k.embedding <=> query_embedding) > match_threshold
  ORDER BY k.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ─── Knowledge Relationships Table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clipad_knowledge_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID, -- Removed explicit reference in case companies(id) is text
  source_id UUID REFERENCES public.clipad_imported_knowledge(id) ON DELETE CASCADE,
  target_id UUID REFERENCES public.clipad_imported_knowledge(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('mentions', 'continues', 'implements', 'blocks', 'references', 'related')),
  confidence_score FLOAT DEFAULT 0.7,
  ai_detected BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_relationships_source ON public.clipad_knowledge_relationships(source_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_relationships_target ON public.clipad_knowledge_relationships(target_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_relationships_company ON public.clipad_knowledge_relationships(company_id);

-- Enable RLS on the new table
ALTER TABLE public.clipad_knowledge_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "knowledge_relationships_company_isolation" ON public.clipad_knowledge_relationships
  FOR ALL USING (
    company_id::text IN (
      SELECT company_id::text FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Create index on embedding for fast ANN search
CREATE INDEX IF NOT EXISTS idx_knowledge_embedding ON public.clipad_imported_knowledge 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
