-- Add missing lock columns to clipad_meeting_records
ALTER TABLE public.clipad_meeting_records ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;
ALTER TABLE public.clipad_meeting_records ADD COLUMN IF NOT EXISTS unlock_at TIMESTAMPTZ;

-- Reload PostgREST schema cache so PGRST204 is resolved
NOTIFY pgrst, 'reload schema';
