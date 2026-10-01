-- Add market_tier column to subscription_plans
ALTER TABLE "public"."subscription_plans" ADD COLUMN IF NOT EXISTS "market_tier" text DEFAULT 'global';
