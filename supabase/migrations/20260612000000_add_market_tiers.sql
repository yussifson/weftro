-- Add market_tier and capacity limit tracking to companies table

-- Safely create the market_tier enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'market_tier') THEN
        CREATE TYPE market_tier AS ENUM ('global', 'emerging', 'community', 'education');
    END IF;
END$$;

-- Add new columns to companies table
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS market_tier market_tier DEFAULT 'global',
ADD COLUMN IF NOT EXISTS max_internal_users INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS storage_gb_limit INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS ai_tokens_limit INTEGER DEFAULT 0;

-- Optionally, we can create a trigger or function later to auto-update
-- these capacity limits based on the subscription_plan. For now, we will 
-- manage them manually via the application logic or Paystack webhooks.
