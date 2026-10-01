-- Fix scheduling links
ALTER TABLE public.clipad_scheduling_links ADD COLUMN IF NOT EXISTS title TEXT DEFAULT 'Meeting';
ALTER TABLE public.clipad_scheduling_links ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 30;

-- Fix meeting records ai_summary just in case it was missed
ALTER TABLE public.clipad_meeting_records ADD COLUMN IF NOT EXISTS ai_summary TEXT;

-- Fix tasks space_id
ALTER TABLE public.clipad_tasks ADD COLUMN IF NOT EXISTS space_id UUID REFERENCES public.clipad_spaces(id) ON DELETE CASCADE;

-- Reload schema cache
NOTIFY pgrst, reload_schema;
