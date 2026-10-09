CREATE TABLE clipad_automations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  space_id uuid REFERENCES clipad_spaces(id) ON DELETE CASCADE,
  trigger_type text NOT NULL,
  action_type text NOT NULL,
  config jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE clipad_automations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view automations for their spaces" ON clipad_automations;
CREATE POLICY "Users can view automations for their spaces" ON clipad_automations FOR SELECT USING (
  space_id IN (SELECT space_id FROM clipad_space_members WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can insert automations for their spaces" ON clipad_automations;
CREATE POLICY "Users can insert automations for their spaces" ON clipad_automations FOR INSERT WITH CHECK (
  space_id IN (SELECT space_id FROM clipad_space_members WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can update automations for their spaces" ON clipad_automations;
CREATE POLICY "Users can update automations for their spaces" ON clipad_automations FOR UPDATE USING (
  space_id IN (SELECT space_id FROM clipad_space_members WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can delete automations for their spaces" ON clipad_automations;
CREATE POLICY "Users can delete automations for their spaces" ON clipad_automations FOR DELETE USING (
  space_id IN (SELECT space_id FROM clipad_space_members WHERE user_id = auth.uid())
);