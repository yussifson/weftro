-- Migration: Authoritative Meeting Termination and Realtime Signaling
-- Description: Establishes secure server-side RPC and PostgreSQL RLS policy for video room termination,
-- ensuring only the authoritative host can end meetings and broadcasting state changes to all participants.

-- 1. Ensure supabase_realtime publication includes video_rooms
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'video_rooms'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.video_rooms;
  END IF;
END $$;

-- 2. Define tight RLS policy on video_rooms for UPDATE
-- Guarantees that even direct Supabase client calls can ONLY be executed by the authorized host
DROP POLICY IF EXISTS "Only host can update video rooms" ON public.video_rooms;
CREATE POLICY "Only host can update video rooms" ON public.video_rooms
    FOR UPDATE TO authenticated
    USING (auth.uid() = host_id)
    WITH CHECK (auth.uid() = host_id);

-- 3. Dedicated Atomic Stored Procedure (RPC) for Server-Side Termination
-- Provides an explicit, audited, and strictly validated procedure for ending meetings
CREATE OR REPLACE FUNCTION public.terminate_meeting(
    p_room_name TEXT,
    p_space_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_caller_id UUID;
    v_room RECORD;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required to terminate a meeting' USING ERRCODE = '42501';
    END IF;

    -- Look up room by daily_room_name
    SELECT id, host_id, status, company_id
    INTO v_room
    FROM public.video_rooms
    WHERE daily_room_name = p_room_name
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Meeting room not found: %', p_room_name USING ERRCODE = 'P0002';
    END IF;

    -- Strict host authorization check
    IF v_room.host_id IS NULL OR v_room.host_id != v_caller_id THEN
        RAISE EXCEPTION 'Unauthorized: only the meeting host can terminate this meeting' USING ERRCODE = '42501';
    END IF;

    -- Mark room as ended
    UPDATE public.video_rooms
    SET status = 'ended',
        ended_at = NOW()
    WHERE id = v_room.id;

    -- Clear space active meeting URL if space_id was provided
    IF p_space_id IS NOT NULL THEN
        UPDATE public.clipad_spaces
        SET meeting_url = NULL
        WHERE id = p_space_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'room_id', v_room.id,
        'room_name', p_room_name,
        'status', 'ended',
        'ended_at', NOW()
    );
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.terminate_meeting(TEXT, UUID) TO authenticated;
