-- Migration for Clipad V3 Phase 5 - Capture System & Context Sessions

-- 1. ENUMS
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'capture_status') THEN
    CREATE TYPE capture_status AS ENUM ('CREATED', 'PROCESSING', 'PROCESSED', 'CLASSIFIED', 'CONTEXTUALIZED', 'INGESTED', 'FAILED', 'DISMISSED', 'ARCHIVED');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'capture_visibility') THEN
    CREATE TYPE capture_visibility AS ENUM ('PERSONAL', 'TEAM', 'ORGANIZATIONAL');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'context_session_status') THEN
    CREATE TYPE context_session_status AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED');
  END IF;
END$$;

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

CREATE INDEX IF NOT EXISTS idx_context_sessions_company ON clipad_v3_context_sessions(company_id);
CREATE INDEX IF NOT EXISTS idx_context_sessions_user ON clipad_v3_context_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_context_sessions_status ON clipad_v3_context_sessions(status);

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

CREATE INDEX IF NOT EXISTS idx_captures_company ON clipad_v3_captures(company_id);
CREATE INDEX IF NOT EXISTS idx_captures_user ON clipad_v3_captures(user_id);
CREATE INDEX IF NOT EXISTS idx_captures_session ON clipad_v3_captures(context_session_id);
CREATE INDEX IF NOT EXISTS idx_captures_status ON clipad_v3_captures(status);
CREATE INDEX IF NOT EXISTS idx_captures_visibility ON clipad_v3_captures(visibility);

-- 4. RLS POLICIES FOR CONTEXT SESSIONS
ALTER TABLE clipad_v3_context_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own context sessions"
    ON clipad_v3_context_sessions;
CREATE POLICY "Users can view their own context sessions"
    ON clipad_v3_context_sessions FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own context sessions"
    ON clipad_v3_context_sessions;
CREATE POLICY "Users can create their own context sessions"
    ON clipad_v3_context_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own context sessions"
    ON clipad_v3_context_sessions;
CREATE POLICY "Users can update their own context sessions"
    ON clipad_v3_context_sessions FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own context sessions"
    ON clipad_v3_context_sessions;
CREATE POLICY "Users can delete their own context sessions"
    ON clipad_v3_context_sessions FOR DELETE
    USING (auth.uid() = user_id);

-- 5. RLS POLICIES FOR CAPTURES
ALTER TABLE clipad_v3_captures ENABLE ROW LEVEL SECURITY;

-- Personal visibility: only creator can see
DROP POLICY IF EXISTS "Users can view their own personal captures"
    ON clipad_v3_captures;
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
                SELECT 1 FROM clipad_space_members csm 
                JOIN clipad_spaces s ON s.id = csm.space_id 
                WHERE csm.user_id = auth.uid() 
                AND csm.space_id = COALESCE(permission_info->>'space_id', permission_info->>'team_id', permission_info->>'team_space_id')::uuid
            ))
        )
    );

DROP POLICY IF EXISTS "Users can insert their own captures"
    ON clipad_v3_captures;
CREATE POLICY "Users can insert their own captures"
    ON clipad_v3_captures FOR INSERT
    WITH CHECK (
        auth.uid() = user_id 
        AND company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can update their own captures"
    ON clipad_v3_captures;
CREATE POLICY "Users can update their own captures"
    ON clipad_v3_captures FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own captures"
    ON clipad_v3_captures;
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

DROP TRIGGER IF EXISTS trigger_update_clipad_v3_captures_updated_at ON clipad_v3_captures;
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

DROP TRIGGER IF EXISTS trigger_update_clipad_v3_context_sessions_updated_at ON clipad_v3_context_sessions;
CREATE TRIGGER trigger_update_clipad_v3_context_sessions_updated_at
BEFORE UPDATE ON clipad_v3_context_sessions
FOR EACH ROW
EXECUTE FUNCTION update_clipad_v3_context_sessions_updated_at();
