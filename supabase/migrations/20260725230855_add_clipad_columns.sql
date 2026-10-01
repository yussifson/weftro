ALTER TABLE clipad_blockers ADD COLUMN IF NOT EXISTS severity TEXT;
ALTER TABLE clipad_decisions ADD COLUMN IF NOT EXISTS rationale TEXT;
