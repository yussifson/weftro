-- 1. Create a helper function to securely check company access
CREATE OR REPLACE FUNCTION public.check_user_company_access(target_space_id UUID, target_creator_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles viewer
    WHERE viewer.id = auth.uid()
    AND (
      -- If the video/meeting belongs to a space, check if viewer's company matches the space's company
      (target_space_id IS NOT NULL AND viewer.company_id::text = (SELECT company_id::text FROM public.clipad_spaces WHERE id = target_space_id LIMIT 1))
      OR
      -- If there is no space (e.g., personal space), check if viewer's company matches the creator's company
      (target_space_id IS NULL AND target_creator_id IS NOT NULL AND viewer.company_id::text = (SELECT company_id::text FROM public.profiles creator WHERE creator.id = target_creator_id LIMIT 1))
    )
  );
$$;

-- 2. Update clipad_videos RLS Policies
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.clipad_videos;
CREATE POLICY "Enable read for same company users" ON public.clipad_videos 
FOR SELECT TO authenticated 
USING (public.check_user_company_access(space_id, creator_id));

-- 3. Update clipad_meeting_records RLS Policies
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.clipad_meeting_records;

-- Since the previous policy was FOR ALL, we need to split it or recreate it for SELECT, INSERT, UPDATE, DELETE
-- Or just create one for ALL with the strict check, but usually creators need to update/delete. 
-- For safety, we will restrict SELECT and allow updates/deletes only if they pass the company check as well.
DROP POLICY IF EXISTS "Enable all for same company users" ON public.clipad_meeting_records;
CREATE POLICY "Enable all for same company users" ON public.clipad_meeting_records 
FOR ALL TO authenticated 
USING (public.check_user_company_access(space_id, host_id))
WITH CHECK (public.check_user_company_access(space_id, host_id));

-- (Optional) If you want to keep the old FOR ALL behavior for meetings but restricted to company:
-- Note: users inserting a new meeting record for their company will pass the WITH CHECK since their company matches.
