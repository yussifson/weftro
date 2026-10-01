-- Migration for Support Chat System and Phone Callbacks

CREATE TABLE IF NOT EXISTS public.support_chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    user_name TEXT,
    user_email TEXT,
    status TEXT DEFAULT 'ai_handling' CHECK (status IN ('ai_handling', 'escalated', 'admin_joined', 'resolved')),
    admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID REFERENCES public.support_chats(id) ON DELETE CASCADE,
    sender_type TEXT CHECK (sender_type IN ('user', 'ai', 'admin', 'system')),
    sender_id UUID, -- Can be null for AI or System
    sender_name TEXT,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.support_callbacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    user_name TEXT,
    user_email TEXT,
    phone_number TEXT NOT NULL,
    reason TEXT NOT NULL,
    preferred_time TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'resolved')),
    admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.support_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_callbacks ENABLE ROW LEVEL SECURITY;

-- Policies for support_chats
CREATE POLICY "Users can view own chats" ON public.support_chats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own chats" ON public.support_chats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own chats" ON public.support_chats FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Super admins can view all chats" ON public.support_chats FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- Policies for support_messages
CREATE POLICY "Users can view messages in own chats" ON public.support_messages FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.support_chats WHERE id = support_messages.chat_id AND user_id = auth.uid())
);
CREATE POLICY "Users can insert messages in own chats" ON public.support_messages FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.support_chats WHERE id = support_messages.chat_id AND user_id = auth.uid())
);
CREATE POLICY "Super admins can view and insert all messages" ON public.support_messages FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- Policies for support_callbacks
CREATE POLICY "Users can view own callbacks" ON public.support_callbacks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own callbacks" ON public.support_callbacks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Super admins can view and manage all callbacks" ON public.support_callbacks FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- Realtime replication (Required for real-time chat updates)
ALTER PUBLICATION supabase_realtime ADD TABLE support_chats;
ALTER PUBLICATION supabase_realtime ADD TABLE support_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE support_callbacks;
