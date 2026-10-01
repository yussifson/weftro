-- Fix sync_frequency CHECK constraint to accept both legacy values and new UI label values
-- Also add missing ai_risks column to clipad_imported_knowledge

-- ─── Fix 1: Update sync_frequency constraint ──────────────────────────────────
-- Drop the old restrictive constraint
ALTER TABLE public.clipad_integrations 
  DROP CONSTRAINT IF EXISTS clipad_integrations_sync_frequency_check;

-- Re-add constraint allowing all UI label values + legacy values
ALTER TABLE public.clipad_integrations
  ADD CONSTRAINT clipad_integrations_sync_frequency_check
  CHECK (
    sync_frequency IN (
      -- UI label values (from IntegrationsHub dropdown)
      'Manual', '15 Minutes', 'Hourly', 'Daily', 'Weekly',
      -- Legacy values (from old cron config)
      'manual', '6h', '12h', '24h'
    )
  );

-- ─── Fix 2: Add missing ai_risks column ───────────────────────────────────────
ALTER TABLE public.clipad_imported_knowledge
  ADD COLUMN IF NOT EXISTS ai_risks JSONB DEFAULT NULL;

-- ─── Fix 3: Add missing ai_keywords column (if not exists) ────────────────────
ALTER TABLE public.clipad_imported_knowledge
  ADD COLUMN IF NOT EXISTS ai_keywords JSONB DEFAULT NULL;

-- ─── Fix 4: Add missing ai_action_items column (if not exists) ────────────────
ALTER TABLE public.clipad_imported_knowledge
  ADD COLUMN IF NOT EXISTS ai_action_items JSONB DEFAULT NULL;

-- ─── Fix 5: Add missing ai_entities column (if not exists) ────────────────────
ALTER TABLE public.clipad_imported_knowledge
  ADD COLUMN IF NOT EXISTS ai_entities JSONB DEFAULT NULL;
