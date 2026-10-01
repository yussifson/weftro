-- Fix RLS policies for meeting comments and reactions (missing WITH CHECK for INSERTS)
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.clipad_meeting_comments;
CREATE POLICY "Enable all for authenticated users" ON public.clipad_meeting_comments FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.clipad_meeting_reactions;
CREATE POLICY "Enable all for authenticated users" ON public.clipad_meeting_reactions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Fix RLS policies for async video comments and reactions (missing WITH CHECK for INSERTS)
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.clipad_video_comments;
CREATE POLICY "Enable all for authenticated users" ON public.clipad_video_comments FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.clipad_video_reactions;
CREATE POLICY "Enable all for authenticated users" ON public.clipad_video_reactions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Fix RLS policies for async video views
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.clipad_video_views;
CREATE POLICY "Enable all for authenticated users" ON public.clipad_video_views FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Ensure public access to views if needed (optional fallback if anonymous users view videos)
DROP POLICY IF EXISTS "Enable all for public" ON public.clipad_video_views;
CREATE POLICY "Enable all for public" ON public.clipad_video_views FOR ALL USING (true) WITH CHECK (true);

-- Add missing title column to clipad_meeting_metrics (Fixes schema cache error)
ALTER TABLE public.clipad_meeting_metrics ADD COLUMN IF NOT EXISTS title TEXT;
