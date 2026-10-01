-- Add status column to univ_pharmacy_inventory to support custom Kanban stages

ALTER TABLE IF EXISTS public.univ_pharmacy_inventory ADD COLUMN IF NOT EXISTS status TEXT;
