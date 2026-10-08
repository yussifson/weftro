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
