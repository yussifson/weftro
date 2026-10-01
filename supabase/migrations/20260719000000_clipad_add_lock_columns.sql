ALTER TABLE public.clipad_meeting_records ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;
ALTER TABLE public.clipad_meeting_records ADD COLUMN IF NOT EXISTS unlock_at TIMESTAMPTZ;
