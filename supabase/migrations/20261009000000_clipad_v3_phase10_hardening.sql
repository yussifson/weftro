-- Phase 10 Hardening: Fix UUID vs TEXT mismatch in RLS policies

-- Recreating policy on clipad_v3_feature_flags (from 20261001000000_clipad_v3_foundation.sql)
DROP POLICY IF EXISTS "clipad_v3_flags_select" ON public.clipad_v3_feature_flags;
DROP POLICY IF EXISTS clipad_v3_flags_select ON public.clipad_v3_feature_flags;
CREATE POLICY clipad_v3_flags_select ON public.clipad_v3_feature_flags
  FOR SELECT USING (
    company_id::text IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    OR user_id = auth.uid()
  );

-- Recreating policy on clipad_v3_feature_flags (from 20261001000000_clipad_v3_foundation.sql)
DROP POLICY IF EXISTS "clipad_v3_flags_insert" ON public.clipad_v3_feature_flags;
DROP POLICY IF EXISTS clipad_v3_flags_insert ON public.clipad_v3_feature_flags;
CREATE POLICY clipad_v3_flags_insert ON public.clipad_v3_feature_flags
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR company_id::text IN (SELECT company_id FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
  );

-- Recreating policy on clipad_v3_feature_flags (from 20261001000000_clipad_v3_foundation.sql)
DROP POLICY IF EXISTS "clipad_v3_flags_update" ON public.clipad_v3_feature_flags;
DROP POLICY IF EXISTS clipad_v3_flags_update ON public.clipad_v3_feature_flags;
CREATE POLICY clipad_v3_flags_update ON public.clipad_v3_feature_flags
  FOR UPDATE USING (
    user_id = auth.uid()
    OR company_id::text IN (SELECT company_id FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
  );

-- Recreating policy on clipad_v3_memories (from 20261001000000_clipad_v3_foundation.sql)
DROP POLICY IF EXISTS "clipad_v3_memories_insert" ON public.clipad_v3_memories;
DROP POLICY IF EXISTS clipad_v3_memories_insert ON public.clipad_v3_memories;
CREATE POLICY clipad_v3_memories_insert ON public.clipad_v3_memories
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND company_id::text IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

-- Recreating policy on clipad_v3_events (from 20261001000000_clipad_v3_foundation.sql)
DROP POLICY IF EXISTS "clipad_v3_events_select" ON public.clipad_v3_events;
DROP POLICY IF EXISTS clipad_v3_events_select ON public.clipad_v3_events;
CREATE POLICY clipad_v3_events_select ON public.clipad_v3_events
  FOR SELECT USING (
    company_id::text IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

-- Recreating policy on clipad_v3_events (from 20261001000000_clipad_v3_foundation.sql)
DROP POLICY IF EXISTS "clipad_v3_events_insert" ON public.clipad_v3_events;
DROP POLICY IF EXISTS clipad_v3_events_insert ON public.clipad_v3_events;
CREATE POLICY clipad_v3_events_insert ON public.clipad_v3_events
  FOR INSERT WITH CHECK (
    company_id::text IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    OR user_id = auth.uid()
  );

-- Recreating policy on clipad_v3_entities (from 20261001120000_clipad_v3_phase2_organizational_memory.sql)
DROP POLICY IF EXISTS "clipad_v3_entities_select" ON public.clipad_v3_entities;
DROP POLICY IF EXISTS clipad_v3_entities_select ON public.clipad_v3_entities;
CREATE POLICY clipad_v3_entities_select ON public.clipad_v3_entities
  FOR SELECT USING (
    company_id::text IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

-- Recreating policy on clipad_v3_entities (from 20261001120000_clipad_v3_phase2_organizational_memory.sql)
DROP POLICY IF EXISTS "clipad_v3_entities_insert" ON public.clipad_v3_entities;
DROP POLICY IF EXISTS clipad_v3_entities_insert ON public.clipad_v3_entities;
CREATE POLICY clipad_v3_entities_insert ON public.clipad_v3_entities
  FOR INSERT WITH CHECK (
    company_id::text IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

-- Recreating policy on clipad_v3_entities (from 20261001120000_clipad_v3_phase2_organizational_memory.sql)
DROP POLICY IF EXISTS "clipad_v3_entities_update" ON public.clipad_v3_entities;
DROP POLICY IF EXISTS clipad_v3_entities_update ON public.clipad_v3_entities;
CREATE POLICY clipad_v3_entities_update ON public.clipad_v3_entities
  FOR UPDATE USING (
    company_id::text IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

-- Recreating policy on clipad_v3_entities (from 20261001120000_clipad_v3_phase2_organizational_memory.sql)
DROP POLICY IF EXISTS "clipad_v3_entities_delete" ON public.clipad_v3_entities;
DROP POLICY IF EXISTS clipad_v3_entities_delete ON public.clipad_v3_entities;
CREATE POLICY clipad_v3_entities_delete ON public.clipad_v3_entities
  FOR DELETE USING (
    company_id::text IN (SELECT company_id FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
  );

-- Recreating policy on clipad_v3_entity_relationships (from 20261001120000_clipad_v3_phase2_organizational_memory.sql)
DROP POLICY IF EXISTS "clipad_v3_rels_select" ON public.clipad_v3_entity_relationships;
DROP POLICY IF EXISTS clipad_v3_rels_select ON public.clipad_v3_entity_relationships;
CREATE POLICY clipad_v3_rels_select ON public.clipad_v3_entity_relationships
  FOR SELECT USING (
    company_id::text IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

-- Recreating policy on clipad_v3_entity_relationships (from 20261001120000_clipad_v3_phase2_organizational_memory.sql)
DROP POLICY IF EXISTS "clipad_v3_rels_insert" ON public.clipad_v3_entity_relationships;
DROP POLICY IF EXISTS clipad_v3_rels_insert ON public.clipad_v3_entity_relationships;
CREATE POLICY clipad_v3_rels_insert ON public.clipad_v3_entity_relationships
  FOR INSERT WITH CHECK (
    company_id::text IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

-- Recreating policy on clipad_v3_entity_relationships (from 20261001120000_clipad_v3_phase2_organizational_memory.sql)
DROP POLICY IF EXISTS "clipad_v3_rels_update" ON public.clipad_v3_entity_relationships;
DROP POLICY IF EXISTS clipad_v3_rels_update ON public.clipad_v3_entity_relationships;
CREATE POLICY clipad_v3_rels_update ON public.clipad_v3_entity_relationships
  FOR UPDATE USING (
    company_id::text IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

-- Recreating policy on clipad_v3_entity_relationships (from 20261001120000_clipad_v3_phase2_organizational_memory.sql)
DROP POLICY IF EXISTS "clipad_v3_rels_delete" ON public.clipad_v3_entity_relationships;
DROP POLICY IF EXISTS clipad_v3_rels_delete ON public.clipad_v3_entity_relationships;
CREATE POLICY clipad_v3_rels_delete ON public.clipad_v3_entity_relationships
  FOR DELETE USING (
    company_id::text IN (SELECT company_id FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
  );

-- Recreating policy on clipad_v3_memories (from 20261001120000_clipad_v3_phase2_organizational_memory.sql)
DROP POLICY IF EXISTS "clipad_v3_memories_select" ON public.clipad_v3_memories;
DROP POLICY IF EXISTS clipad_v3_memories_select ON public.clipad_v3_memories;
CREATE POLICY clipad_v3_memories_select ON public.clipad_v3_memories
  FOR SELECT USING (
    -- Multi-tenant isolation baseline
    company_id::text IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND
    (
      -- 1. Personal tier: strictly accessible only by the owning user
      (memory_tier = 'personal' AND user_id = auth.uid())
      OR
      -- 2. Team tier: strictly requires non-null team_space_id with active membership or public space status
      (memory_tier = 'team' AND team_space_id IS NOT NULL AND (
        team_space_id IN (SELECT space_id FROM public.clipad_space_members WHERE user_id = auth.uid())
        OR team_space_id IN (SELECT id FROM public.clipad_spaces WHERE is_private = false)
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
      ))
      OR
      -- 3. Organizational tier: accessible across company members UNLESS marked private in permissions_policy
      (memory_tier = 'organizational' AND (
        COALESCE((permissions_policy->>'is_private')::boolean, false) = false
        OR user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
      ))
    )
  );

-- Recreating policy on clipad_v3_memories (from 20261001120000_clipad_v3_phase2_organizational_memory.sql)
DROP POLICY IF EXISTS "clipad_v3_memories_insert" ON public.clipad_v3_memories;
DROP POLICY IF EXISTS clipad_v3_memories_insert ON public.clipad_v3_memories;
CREATE POLICY clipad_v3_memories_insert ON public.clipad_v3_memories
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND company_id::text IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND (
      memory_tier != 'team'
      OR (team_space_id IS NOT NULL AND (
        team_space_id IN (SELECT space_id FROM public.clipad_space_members WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
      ))
    )
    AND (
      COALESCE((permissions_policy->>'is_private')::boolean, false) = false
      OR memory_tier = 'personal'
      OR user_id = auth.uid()
    )
  );

-- Recreating policy on clipad_v3_smart_moments (from 20261001140000_clipad_v3_phase3_smart_moments.sql)
DROP POLICY IF EXISTS "clipad_v3_moments_select" ON public.clipad_v3_smart_moments;
DROP POLICY IF EXISTS clipad_v3_moments_select ON public.clipad_v3_smart_moments;
CREATE POLICY clipad_v3_moments_select ON public.clipad_v3_smart_moments
  FOR SELECT USING (
    company_id::text IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND (
      team_space_id IS NULL
      OR team_space_id IN (SELECT space_id FROM public.clipad_space_members WHERE user_id = auth.uid())
      OR team_space_id IN (SELECT id FROM public.clipad_spaces WHERE is_private = false OR is_private IS NULL)
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
    )
  );

-- Recreating policy on clipad_v3_smart_moments (from 20261001140000_clipad_v3_phase3_smart_moments.sql)
DROP POLICY IF EXISTS "clipad_v3_moments_insert" ON public.clipad_v3_smart_moments;
DROP POLICY IF EXISTS clipad_v3_moments_insert ON public.clipad_v3_smart_moments;
CREATE POLICY clipad_v3_moments_insert ON public.clipad_v3_smart_moments
  FOR INSERT WITH CHECK (
    company_id::text IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND (
      team_space_id IS NULL
      OR team_space_id IN (SELECT space_id FROM public.clipad_space_members WHERE user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
    )
  );

-- Recreating policy on clipad_v3_smart_moments (from 20261001140000_clipad_v3_phase3_smart_moments.sql)
DROP POLICY IF EXISTS "clipad_v3_moments_update" ON public.clipad_v3_smart_moments;
DROP POLICY IF EXISTS clipad_v3_moments_update ON public.clipad_v3_smart_moments;
CREATE POLICY clipad_v3_moments_update ON public.clipad_v3_smart_moments
  FOR UPDATE USING (
    company_id::text IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND (
      created_by = auth.uid()
      OR team_space_id IN (SELECT space_id FROM public.clipad_space_members WHERE user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
    )
  );

-- Recreating policy on clipad_v3_smart_moments (from 20261001140000_clipad_v3_phase3_smart_moments.sql)
DROP POLICY IF EXISTS "clipad_v3_moments_delete" ON public.clipad_v3_smart_moments;
DROP POLICY IF EXISTS clipad_v3_moments_delete ON public.clipad_v3_smart_moments;
CREATE POLICY clipad_v3_moments_delete ON public.clipad_v3_smart_moments
  FOR DELETE USING (
    company_id::text IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND (
      created_by = auth.uid()
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
    )
  );

-- Recreating policy on clipad_v3_query_log (from 20261001160000_clipad_v3_phase4_knowledge_graph.sql)
DROP POLICY IF EXISTS "v3_query_log_select" ON public.clipad_v3_query_log;
DROP POLICY IF EXISTS v3_query_log_select ON public.clipad_v3_query_log;
CREATE POLICY v3_query_log_select ON public.clipad_v3_query_log
  FOR SELECT USING (
    company_id::text IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND (
      user_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
    )
  );

-- Recreating policy on clipad_v3_query_log (from 20261001160000_clipad_v3_phase4_knowledge_graph.sql)
DROP POLICY IF EXISTS "v3_query_log_insert" ON public.clipad_v3_query_log;
DROP POLICY IF EXISTS v3_query_log_insert ON public.clipad_v3_query_log;
CREATE POLICY v3_query_log_insert ON public.clipad_v3_query_log
  FOR INSERT WITH CHECK (
    company_id::text IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND user_id = auth.uid()
  );

-- Recreating policy on clipad_v3_entity_aliases (from 20261001160000_clipad_v3_phase4_knowledge_graph.sql)
DROP POLICY IF EXISTS "v3_aliases_select" ON public.clipad_v3_entity_aliases;
DROP POLICY IF EXISTS v3_aliases_select ON public.clipad_v3_entity_aliases;
CREATE POLICY v3_aliases_select ON public.clipad_v3_entity_aliases
  FOR SELECT USING (
    company_id::text IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

-- Recreating policy on clipad_v3_entity_aliases (from 20261001160000_clipad_v3_phase4_knowledge_graph.sql)
DROP POLICY IF EXISTS "v3_aliases_insert" ON public.clipad_v3_entity_aliases;
DROP POLICY IF EXISTS v3_aliases_insert ON public.clipad_v3_entity_aliases;
CREATE POLICY v3_aliases_insert ON public.clipad_v3_entity_aliases
  FOR INSERT WITH CHECK (
    company_id::text IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

-- Recreating policy on clipad_v3_entity_aliases (from 20261001160000_clipad_v3_phase4_knowledge_graph.sql)
DROP POLICY IF EXISTS "v3_aliases_update" ON public.clipad_v3_entity_aliases;
DROP POLICY IF EXISTS v3_aliases_update ON public.clipad_v3_entity_aliases;
CREATE POLICY v3_aliases_update ON public.clipad_v3_entity_aliases
  FOR UPDATE USING (
    company_id::text IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
  );

-- Recreating policy on clipad_v3_entity_aliases (from 20261001160000_clipad_v3_phase4_knowledge_graph.sql)
DROP POLICY IF EXISTS "v3_aliases_delete" ON public.clipad_v3_entity_aliases;
DROP POLICY IF EXISTS v3_aliases_delete ON public.clipad_v3_entity_aliases;
CREATE POLICY v3_aliases_delete ON public.clipad_v3_entity_aliases
  FOR DELETE USING (
    company_id::text IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
  );

