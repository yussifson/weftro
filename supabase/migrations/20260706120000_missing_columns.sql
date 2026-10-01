-- Fix missing columns in Supabase tables that cause PowerSync sync failures
-- Error: "Could not find the 'X' column of 'Y' in the schema cache"

-- 1. univ_re_contractors: missing 'license_name'
ALTER TABLE univ_re_contractors ADD COLUMN IF NOT EXISTS license_name TEXT;

-- 2. univ_re_contractor_reviews: missing 'updated_at'
ALTER TABLE univ_re_contractor_reviews ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. univ_re_document_templates: missing 'description'
ALTER TABLE univ_re_document_templates ADD COLUMN IF NOT EXISTS description TEXT;

-- 4. univ_re_e_signatures: missing 'require_timestamp'
ALTER TABLE univ_re_e_signatures ADD COLUMN IF NOT EXISTS require_timestamp BOOLEAN DEFAULT FALSE;
ALTER TABLE univ_re_e_signatures ADD COLUMN IF NOT EXISTS require_initials BOOLEAN DEFAULT FALSE;

-- 5. univ_re_comparable_properties: missing 'updated_at'
ALTER TABLE univ_re_comparable_properties ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 6. univ_re_agent_recommendations: missing 'updated_at'
ALTER TABLE univ_re_agent_recommendations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 7. univ_re_lease_renewals: missing 'updated_at'
ALTER TABLE univ_re_lease_renewals ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 8. univ_re_rent_payment_schedules: missing 'updated_at'
ALTER TABLE univ_re_rent_payment_schedules ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 9. univ_re_commission_rules: missing 'updated_at'
ALTER TABLE univ_re_commission_rules ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 10. univ_re_escrow_accounts: missing 'updated_at'
ALTER TABLE univ_re_escrow_accounts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 11. univ_re_counter_offers: missing 'updated_at'
ALTER TABLE univ_re_counter_offers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 12. univ_re_market_data: missing 'updated_at'
ALTER TABLE univ_re_market_data ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
