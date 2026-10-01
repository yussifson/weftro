-- Migration: Fix CliPad Schema Persistence
-- Fixes missing columns and tables that break RLS policies and cause 500 errors

-- 1. clipad_spaces missing columns
ALTER TABLE public.clipad_spaces ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.clipad_spaces ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;
ALTER TABLE public.clipad_spaces ADD COLUMN IF NOT EXISTS description TEXT;

-- 2. clipad_videos missing columns
ALTER TABLE public.clipad_videos ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;

-- 3. clipad_meeting_records missing columns
ALTER TABLE public.clipad_meeting_records ADD COLUMN IF NOT EXISTS host_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 4. clipad_space_members
CREATE TABLE IF NOT EXISTS public.clipad_space_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID REFERENCES public.clipad_spaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(space_id, user_id)
);
ALTER TABLE public.clipad_space_members ENABLE ROW LEVEL SECURITY;

-- 5. clipad_action_items
CREATE TABLE IF NOT EXISTS public.clipad_action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID REFERENCES public.clipad_meeting_records(id) ON DELETE CASCADE,
  space_id UUID REFERENCES public.clipad_spaces(id) ON DELETE CASCADE,
  title TEXT,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  context TEXT,
  is_complete BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.clipad_action_items ENABLE ROW LEVEL SECURITY;

-- Apply publication for powersync if it exists, ignoring errors if not
DO $$
BEGIN
    ALTER PUBLICATION powersync ADD TABLE public.clipad_space_members;
EXCEPTION
    WHEN OTHERS THEN null;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION powersync ADD TABLE public.clipad_action_items;
EXCEPTION
    WHEN OTHERS THEN null;
END $$;
