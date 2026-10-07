-- Migration to correct Phase 5 RLS issue (clipad_team_members -> clipad_space_members)

-- Drop the incorrect policy
DROP POLICY IF EXISTS "Users can view their own personal captures" ON clipad_v3_captures;

-- Recreate it using the canonical clipad_space_members
CREATE POLICY "Users can view accessible captures"
    ON clipad_v3_captures FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
        AND (
            auth.uid() = user_id 
            OR 
            (visibility = 'ORGANIZATIONAL')
            OR
            (visibility = 'TEAM' AND EXISTS (
                SELECT 1 FROM clipad_space_members csm 
                WHERE csm.user_id = auth.uid() 
                AND csm.space_id = (permission_info->>'space_id')::uuid
            ))
        )
    );
