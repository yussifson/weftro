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
DROP POLICY IF EXISTS "Users can view connect apps"
    ON clipad_v3_connect_apps;
CREATE POLICY "Users can view connect apps"
    ON clipad_v3_connect_apps FOR SELECT
    USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Only admins/creators can manage apps (simplified to creators for this phase)
DROP POLICY IF EXISTS "Users can manage their connect apps"
    ON clipad_v3_connect_apps;
CREATE POLICY "Users can manage their connect apps"
    ON clipad_v3_connect_apps FOR ALL
    USING (created_by = auth.uid())
    WITH CHECK (created_by = auth.uid());

-- Users can view and revoke their own granted tokens
DROP POLICY IF EXISTS "Users can view their connect tokens"
    ON clipad_v3_connect_tokens;
CREATE POLICY "Users can view their connect tokens"
    ON clipad_v3_connect_tokens FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can revoke their connect tokens"
    ON clipad_v3_connect_tokens;
CREATE POLICY "Users can revoke their connect tokens"
    ON clipad_v3_connect_tokens FOR UPDATE
    USING (user_id = auth.uid());

-- Users can manage webhooks for their company (simplified to creators)
DROP POLICY IF EXISTS "Users can view webhooks"
    ON clipad_v3_webhooks;
CREATE POLICY "Users can view webhooks"
    ON clipad_v3_webhooks FOR SELECT
    USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can manage webhooks"
    ON clipad_v3_webhooks;
CREATE POLICY "Users can manage webhooks"
    ON clipad_v3_webhooks FOR ALL
    USING (created_by = auth.uid())
    WITH CHECK (created_by = auth.uid());
