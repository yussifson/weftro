-- PHASE 3 FIXES: Add missing duration_minutes and columns to Space features

ALTER TABLE public.clipad_scheduling_links 
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 30;

ALTER TABLE public.clipad_task_boards 
ADD COLUMN IF NOT EXISTS columns JSONB DEFAULT '[{"id":"todo","label":"To Do","color":"bg-slate-500"},{"id":"in_progress","label":"In Progress","color":"bg-indigo-500"},{"id":"done","label":"Done","color":"bg-emerald-500"}]'::jsonb;
