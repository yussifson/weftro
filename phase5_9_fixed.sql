
-- Clean up partially created tables from previous failed runs
DROP TABLE IF EXISTS clipad_v3_capture_settings CASCADE;
DROP TABLE IF EXISTS clipad_v3_connect_tokens CASCADE;
DROP TABLE IF EXISTS clipad_v3_connect_apps CASCADE;
DROP TABLE IF EXISTS clipad_v3_webhooks CASCADE;
DROP TABLE IF EXISTS clipad_v3_captures CASCADE;
DROP TABLE IF EXISTS clipad_v3_context_sessions CASCADE;
DROP TABLE IF EXISTS clipad_v3_organizational_insights CASCADE;
DROP TABLE IF EXISTS clipad_v3_automation_rules CASCADE;

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
        company_id::text IN (SELECT company_id FROM profiles WHERE id = auth.uid()
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
        AND company_id::text IN (SELECT company_id FROM profiles WHERE id = auth.uid())
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
        company_id::text IN (SELECT company_id FROM profiles WHERE id = auth.uid()
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
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
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
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
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
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    token_hash text UNIQUE NOT NULL,
    scopes text[] NOT NULL DEFAULT '{}'::text[],
    expires_at timestamptz,
    revoked_at timestamptz,
    created_at timestamptz DEFAULT now()
);

-- 3. Webhooks
CREATE TABLE IF NOT EXISTS clipad_v3_webhooks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
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
    USING (company_id::text IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

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
    USING (company_id::text IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

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
    USING (company_id::text IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update company insights"
    ON public.clipad_v3_organizational_insights FOR UPDATE
    USING (company_id::text IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert company insights"
    ON public.clipad_v3_organizational_insights FOR INSERT
    WITH CHECK (company_id::text IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- Automation Rules RLS
CREATE POLICY "Users can view company automation rules"
    ON public.clipad_v3_automation_rules FOR SELECT
    USING (company_id::text IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage company automation rules"
    ON public.clipad_v3_automation_rules FOR ALL
    USING (
        company_id::text IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()) 
        AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('super_admin', 'admin', 'owner')
    );
