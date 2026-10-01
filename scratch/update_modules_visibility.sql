-- Run this in the Supabase SQL Editor

-- Add visibility column with default 'private'
ALTER TABLE public.module_definitions 
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'private';

-- Add shared_with text column to store comma-separated company IDs
ALTER TABLE public.module_definitions 
ADD COLUMN IF NOT EXISTS shared_with TEXT DEFAULT '';

-- Ensure existing rows are set to private
UPDATE public.module_definitions 
SET visibility = 'private' 
WHERE visibility IS NULL;
