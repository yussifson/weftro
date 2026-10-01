-- clipad_meeting_records and clipad_action_items
CREATE TABLE IF NOT EXISTS public.clipad_meeting_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID REFERENCES public.clipad_spaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    meeting_link TEXT NOT NULL,
    duration INTEGER, -- in seconds
    ai_summary TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.clipad_action_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID REFERENCES public.clipad_meeting_records(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    assignee_id UUID REFERENCES auth.users(id),
    is_complete BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.clipad_meeting_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated users" ON public.clipad_meeting_records FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.clipad_action_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated users" ON public.clipad_action_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Add to PowerSync
ALTER PUBLICATION powersync ADD TABLE public.clipad_meeting_records;
ALTER PUBLICATION powersync ADD TABLE public.clipad_action_items;
