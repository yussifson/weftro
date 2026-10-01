-- Migration: Advanced Chat and Video Boards
-- Description: Creates tables for direct/group real-time chat and video rooms.

-- 1. Chat Rooms
CREATE TABLE IF NOT EXISTS public.chat_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    room_type TEXT NOT NULL CHECK (room_type IN ('direct', 'group')),
    name TEXT, -- Used for group chats
    description TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    company_id UUID -- Useful if enforcing tenant boundaries
);

-- 2. Chat Participants
CREATE TABLE IF NOT EXISTS public.chat_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(room_id, user_id)
);

-- 3. Chat Messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_edited BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Video Rooms / Boards
CREATE TABLE IF NOT EXISTS public.video_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID,
    title TEXT NOT NULL,
    description TEXT,
    daily_room_url TEXT NOT NULL,
    daily_room_name TEXT NOT NULL,
    host_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('scheduled', 'active', 'ended')),
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_rooms ENABLE ROW LEVEL SECURITY;

-- Basic Policies (can be refined later based on company_id)
DROP POLICY IF EXISTS "Users can view rooms they are in" ON public.chat_rooms;
CREATE POLICY "Users can view rooms they are in" ON public.chat_rooms
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.chat_participants cp WHERE cp.room_id = id AND cp.user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Users can insert rooms" ON public.chat_rooms;
CREATE POLICY "Users can insert rooms" ON public.chat_rooms
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update rooms they admin" ON public.chat_rooms;
CREATE POLICY "Users can update rooms they admin" ON public.chat_rooms
    FOR UPDATE USING (EXISTS (
        SELECT 1 FROM public.chat_participants cp WHERE cp.room_id = id AND cp.user_id = auth.uid() AND cp.role = 'admin'
    ));

DROP POLICY IF EXISTS "Users can view participants in their rooms" ON public.chat_participants;
CREATE POLICY "Users can view participants in their rooms" ON public.chat_participants
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.chat_participants cp WHERE cp.room_id = room_id AND cp.user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Users can insert participants" ON public.chat_participants;
CREATE POLICY "Users can insert participants" ON public.chat_participants
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their own participant record" ON public.chat_participants;
CREATE POLICY "Users can update their own participant record" ON public.chat_participants
    FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view messages in their rooms" ON public.chat_messages;
CREATE POLICY "Users can view messages in their rooms" ON public.chat_messages
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.chat_participants cp WHERE cp.room_id = room_id AND cp.user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Users can insert messages to their rooms" ON public.chat_messages;
CREATE POLICY "Users can insert messages to their rooms" ON public.chat_messages
    FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM public.chat_participants cp WHERE cp.room_id = room_id AND cp.user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Users can update their own messages" ON public.chat_messages;
CREATE POLICY "Users can update their own messages" ON public.chat_messages
    FOR UPDATE USING (sender_id = auth.uid());

DROP POLICY IF EXISTS "Users can view video rooms" ON public.video_rooms;
CREATE POLICY "Users can view video rooms" ON public.video_rooms
    FOR SELECT USING (true); -- Refine to company_id if needed

DROP POLICY IF EXISTS "Users can insert video rooms" ON public.video_rooms;
CREATE POLICY "Users can insert video rooms" ON public.video_rooms
    FOR INSERT WITH CHECK (true);

-- Enable Realtime for Messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_participants;
