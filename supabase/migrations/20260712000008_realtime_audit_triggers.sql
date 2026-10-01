-- Migration: Real-time audit logging for CliPad
-- Replaces dummy data with live triggers from actual user actions

-- Ensure audit_logs has all needed columns
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS user_id TEXT,
  ADD COLUMN IF NOT EXISTS user_email TEXT,
  ADD COLUMN IF NOT EXISTS user_name TEXT,
  ADD COLUMN IF NOT EXISTS company_id TEXT,
  ADD COLUMN IF NOT EXISTS action TEXT,
  ADD COLUMN IF NOT EXISTS details TEXT,
  ADD COLUMN IF NOT EXISTS ip_address TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'info',
  ADD COLUMN IF NOT EXISTS entity_type TEXT,
  ADD COLUMN IF NOT EXISTS entity_id TEXT;

-- Fix created_at to be a proper timestamptz if it's text
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_logs' AND column_name = 'created_at' AND data_type = 'text'
  ) THEN
    ALTER TABLE public.audit_logs ALTER COLUMN created_at TYPE timestamptz USING created_at::timestamptz;
  END IF;
END $$;

-- Set default for created_at
ALTER TABLE public.audit_logs ALTER COLUMN created_at SET DEFAULT now();


-- ============================================================
-- TRIGGER: Log when a user signs in (auth.users last_sign_in_at update)
-- ============================================================
CREATE OR REPLACE FUNCTION log_user_login()
RETURNS TRIGGER AS $$
DECLARE
  profile_row RECORD;
BEGIN
  IF NEW.last_sign_in_at IS NOT NULL AND (OLD.last_sign_in_at IS NULL OR NEW.last_sign_in_at != OLD.last_sign_in_at) THEN
    -- Get profile info
    SELECT p.full_name, p.company_id INTO profile_row
    FROM public.profiles p
    WHERE p.id = NEW.id
    LIMIT 1;

    INSERT INTO public.audit_logs (
      user_id, user_email, user_name, company_id,
      action, details, severity, entity_type, created_at
    ) VALUES (
      NEW.id::text,
      NEW.email,
      COALESCE(profile_row.full_name, NEW.raw_user_meta_data->>'full_name', 'Unknown'),
      profile_row.company_id::text,
      'login',
      'User signed in via CliPad',
      'info',
      'auth',
      now()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS log_user_login_trigger ON auth.users;
CREATE TRIGGER log_user_login_trigger
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION log_user_login();


-- ============================================================
-- TRIGGER: Log plan upgrades (company_subscriptions upsert)
-- ============================================================
CREATE OR REPLACE FUNCTION log_plan_upgrade()
RETURNS TRIGGER AS $$
DECLARE
  company_name_val TEXT;
BEGIN
  SELECT name INTO company_name_val FROM public.companies WHERE id = NEW.company_id::uuid;

  INSERT INTO public.audit_logs (
    company_id, action, details, severity, entity_type, entity_id, created_at
  ) VALUES (
    NEW.company_id::text,
    'plan_upgrade',
    'Plan upgraded to ' || COALESCE(NEW.plan_id, 'unknown') || ' for company: ' || COALESCE(company_name_val, NEW.company_id::text),
    'info',
    'subscription',
    NEW.company_id::text,
    now()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS log_plan_upgrade_trigger ON public.company_subscriptions;
CREATE TRIGGER log_plan_upgrade_trigger
  AFTER INSERT OR UPDATE ON public.company_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION log_plan_upgrade();


-- ============================================================
-- TRIGGER: Log meeting creation
-- ============================================================
CREATE OR REPLACE FUNCTION log_meeting_created()
RETURNS TRIGGER AS $$
DECLARE
  profile_row RECORD;
BEGIN
  SELECT p.full_name, p.company_id, u.email
  INTO profile_row
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  WHERE p.id = NEW.host_id
  LIMIT 1;

  INSERT INTO public.audit_logs (
    user_id, user_email, user_name, company_id,
    action, details, severity, entity_type, entity_id, created_at
  ) VALUES (
    NEW.host_id::text,
    profile_row.email,
    profile_row.full_name,
    profile_row.company_id::text,
    'meeting_created',
    'Meeting created: ' || COALESCE(NEW.title, NEW.id::text),
    'info',
    'meeting',
    NEW.id::text,
    now()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS log_meeting_created_trigger ON public.clipad_meeting_records;
CREATE TRIGGER log_meeting_created_trigger
  AFTER INSERT ON public.clipad_meeting_records
  FOR EACH ROW
  EXECUTE FUNCTION log_meeting_created();


-- ============================================================
-- TRIGGER: Log video recordings
-- ============================================================
CREATE OR REPLACE FUNCTION log_video_recorded()
RETURNS TRIGGER AS $$
DECLARE
  profile_row RECORD;
BEGIN
  SELECT p.full_name, p.company_id, u.email
  INTO profile_row
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  WHERE p.id = NEW.user_id
  LIMIT 1;

  INSERT INTO public.audit_logs (
    user_id, user_email, user_name, company_id,
    action, details, severity, entity_type, entity_id, created_at
  ) VALUES (
    NEW.user_id::text,
    profile_row.email,
    profile_row.full_name,
    profile_row.company_id::text,
    'video_recorded',
    'Video recording created: ' || COALESCE(NEW.title, NEW.id::text),
    'info',
    'video',
    NEW.id::text,
    now()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS log_video_recorded_trigger ON public.clipad_videos;
CREATE TRIGGER log_video_recorded_trigger
  AFTER INSERT ON public.clipad_videos
  FOR EACH ROW
  EXECUTE FUNCTION log_video_recorded();
