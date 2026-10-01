-- Migration: Fix clipad_notifications missing columns + add plan_upgrade notification type
-- The triggers were inserting 'title' and 'link' columns that didn't exist, causing silent failures.

ALTER TABLE public.clipad_notifications 
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS link TEXT;

-- Also add plan_upgrade notification type support (no schema change needed, just documents it)
