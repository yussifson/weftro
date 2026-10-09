-- ═══════════════════════════════════════════════════════════════════════════
--  MIGRATION: Scoped RLS Policies for clipad_imported_knowledge
--  Enables RLS and adds policies to match the visibility model:
--    - Personal: owner only
--    - Space: space members only
--    - Company: all members of the company
-- ═══════════════════════════════════════════════════════════════════════════

-- Ensure RLS is enabled
ALTER TABLE public.clipad_imported_knowledge ENABLE ROW LEVEL SECURITY;

-- Drop any existing conflicting policies
DROP POLICY IF EXISTS "imported_knowledge_select" ON public.clipad_imported_knowledge;
DROP POLICY IF EXISTS "imported_knowledge_insert" ON public.clipad_imported_knowledge;
DROP POLICY IF EXISTS "imported_knowledge_manage" ON public.clipad_imported_knowledge;

-- SELECT Policy: Users see personal items, space-scoped items they have access to, or company-scoped items
DROP POLICY IF EXISTS "imported_knowledge_select" ON public.clipad_imported_knowledge;
CREATE POLICY "imported_knowledge_select" ON public.clipad_imported_knowledge
  FOR SELECT USING (
    -- Personal: only the user who connected/imported it
    connected_by_user_id = auth.uid()::text
    OR
    -- Company-wide: anyone in the same company
    (visibility = 'company'
      AND company_id::text IN (
        SELECT company_id::text FROM public.profiles
        WHERE id::text = auth.uid()::text
      )
    )
    OR
    -- Space-level: any member of that space
    (visibility = 'space'
      AND space_id::text IN (
        SELECT space_id::text FROM public.clipad_space_members
        WHERE user_id::text = auth.uid()::text
      )
    )
  );

-- INSERT/UPDATE/DELETE Policy: Owner or admin
DROP POLICY IF EXISTS "imported_knowledge_manage" ON public.clipad_imported_knowledge;
CREATE POLICY "imported_knowledge_manage" ON public.clipad_imported_knowledge
  FOR ALL USING (
    connected_by_user_id = auth.uid()::text
    OR
    (SELECT role FROM public.profiles WHERE id::text = auth.uid()::text) IN ('admin', 'super_admin')
  );
