-- Allow anonymous (unauthenticated) users to read video_rooms by room ID
-- This is required for the standalone meet.optavel.com join flow where
-- guests arrive without being authenticated.

DROP POLICY IF EXISTS "Anyone can view video rooms by id" ON public.video_rooms;
CREATE POLICY "Anyone can view video rooms by id" ON public.video_rooms
    FOR SELECT
    USING (true);

-- Also ensure the anon role has USAGE on the public schema
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON public.video_rooms TO anon;
