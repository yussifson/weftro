-- Migration to create clipad_standups and fix clipad_action_items

-- 1. Create clipad_standups
CREATE TABLE IF NOT EXISTS public.clipad_standups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID REFERENCES public.clipad_spaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID,
    user_name TEXT,
    today TEXT NOT NULL,
    yesterday TEXT,
    blockers TEXT,
    mood TEXT DEFAULT 'good',
    priority TEXT DEFAULT 'normal',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.clipad_standups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Standups are viewable by everyone in the company"
    ON public.clipad_standups;
CREATE POLICY "Standups are viewable by everyone in the company"
    ON public.clipad_standups FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Users can insert their own standups"
    ON public.clipad_standups;
CREATE POLICY "Users can insert their own standups"
    ON public.clipad_standups FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own standups"
    ON public.clipad_standups;
CREATE POLICY "Users can update their own standups"
    ON public.clipad_standups FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own standups"
    ON public.clipad_standups;
CREATE POLICY "Users can delete their own standups"
    ON public.clipad_standups FOR DELETE
    USING (auth.uid() = user_id);

-- 2. Add company_id to clipad_action_items
ALTER TABLE public.clipad_action_items
ADD COLUMN IF NOT EXISTS company_id UUID;

-- 3. Update existing clipad_action_items to inherit company_id from space_id or meeting_id
UPDATE public.clipad_action_items a
SET company_id = s.company_id
FROM public.clipad_spaces s
WHERE a.space_id = s.id AND a.company_id IS NULL;

-- 4. Enable PowerSync publication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_publication_tables 
        WHERE pubname = 'powersync' AND tablename = 'clipad_standups'
    ) THEN
        ALTER PUBLICATION powersync ADD TABLE public.clipad_standups;
    END IF;
EXCEPTION
    WHEN OTHERS THEN null;
END $$;

-- 5. Force Schema Cache Reload
NOTIFY pgrst, 'reload schema';
