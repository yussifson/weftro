-- Add board_key and stages to univ_kanban_boards

ALTER TABLE IF EXISTS public.univ_kanban_boards ADD COLUMN IF NOT EXISTS board_key TEXT;
ALTER TABLE IF EXISTS public.univ_kanban_boards ADD COLUMN IF NOT EXISTS stages JSONB DEFAULT '[]'::jsonb;
