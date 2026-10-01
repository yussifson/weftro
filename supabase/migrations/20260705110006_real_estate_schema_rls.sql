-- Fix Real Estate Schema & RLS

DO $$
BEGIN

    -- univ_re_properties
    BEGIN
        ALTER TABLE IF EXISTS univ_re_properties ADD COLUMN IF NOT EXISTS company_id UUID;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        ALTER TABLE IF EXISTS univ_re_properties ENABLE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Enable ALL for users based on company_id" ON univ_re_properties;
        CREATE POLICY "Enable ALL for users based on company_id" ON univ_re_properties 
        AS PERMISSIVE FOR ALL 
        TO public 
        USING (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text)) 
        WITH CHECK (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text));
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Allow full access for service role" ON univ_re_properties;
        CREATE POLICY "Allow full access for service role" ON univ_re_properties 
        AS PERMISSIVE FOR ALL 
        TO service_role 
        USING (true) 
        WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        ALTER PUBLICATION powersync ADD TABLE univ_re_properties;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- univ_re_clients
    BEGIN
        ALTER TABLE IF EXISTS univ_re_clients ADD COLUMN IF NOT EXISTS company_id UUID;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        ALTER TABLE IF EXISTS univ_re_clients ENABLE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Enable ALL for users based on company_id" ON univ_re_clients;
        CREATE POLICY "Enable ALL for users based on company_id" ON univ_re_clients 
        AS PERMISSIVE FOR ALL 
        TO public 
        USING (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text)) 
        WITH CHECK (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text));
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Allow full access for service role" ON univ_re_clients;
        CREATE POLICY "Allow full access for service role" ON univ_re_clients 
        AS PERMISSIVE FOR ALL 
        TO service_role 
        USING (true) 
        WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        ALTER PUBLICATION powersync ADD TABLE univ_re_clients;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- univ_re_viewings
    BEGIN
        ALTER TABLE IF EXISTS univ_re_viewings ADD COLUMN IF NOT EXISTS company_id UUID;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        ALTER TABLE IF EXISTS univ_re_viewings ENABLE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Enable ALL for users based on company_id" ON univ_re_viewings;
        CREATE POLICY "Enable ALL for users based on company_id" ON univ_re_viewings 
        AS PERMISSIVE FOR ALL 
        TO public 
        USING (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text)) 
        WITH CHECK (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text));
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Allow full access for service role" ON univ_re_viewings;
        CREATE POLICY "Allow full access for service role" ON univ_re_viewings 
        AS PERMISSIVE FOR ALL 
        TO service_role 
        USING (true) 
        WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        ALTER PUBLICATION powersync ADD TABLE univ_re_viewings;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- univ_re_offers
    BEGIN
        ALTER TABLE IF EXISTS univ_re_offers ADD COLUMN IF NOT EXISTS company_id UUID;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        ALTER TABLE IF EXISTS univ_re_offers ENABLE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Enable ALL for users based on company_id" ON univ_re_offers;
        CREATE POLICY "Enable ALL for users based on company_id" ON univ_re_offers 
        AS PERMISSIVE FOR ALL 
        TO public 
        USING (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text)) 
        WITH CHECK (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text));
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Allow full access for service role" ON univ_re_offers;
        CREATE POLICY "Allow full access for service role" ON univ_re_offers 
        AS PERMISSIVE FOR ALL 
        TO service_role 
        USING (true) 
        WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        ALTER PUBLICATION powersync ADD TABLE univ_re_offers;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- univ_re_transactions
    BEGIN
        ALTER TABLE IF EXISTS univ_re_transactions ADD COLUMN IF NOT EXISTS company_id UUID;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        ALTER TABLE IF EXISTS univ_re_transactions ENABLE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Enable ALL for users based on company_id" ON univ_re_transactions;
        CREATE POLICY "Enable ALL for users based on company_id" ON univ_re_transactions 
        AS PERMISSIVE FOR ALL 
        TO public 
        USING (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text)) 
        WITH CHECK (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text));
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Allow full access for service role" ON univ_re_transactions;
        CREATE POLICY "Allow full access for service role" ON univ_re_transactions 
        AS PERMISSIVE FOR ALL 
        TO service_role 
        USING (true) 
        WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        ALTER PUBLICATION powersync ADD TABLE univ_re_transactions;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- univ_re_commissions
    BEGIN
        ALTER TABLE IF EXISTS univ_re_commissions ADD COLUMN IF NOT EXISTS company_id UUID;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        ALTER TABLE IF EXISTS univ_re_commissions ENABLE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Enable ALL for users based on company_id" ON univ_re_commissions;
        CREATE POLICY "Enable ALL for users based on company_id" ON univ_re_commissions 
        AS PERMISSIVE FOR ALL 
        TO public 
        USING (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text)) 
        WITH CHECK (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text));
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Allow full access for service role" ON univ_re_commissions;
        CREATE POLICY "Allow full access for service role" ON univ_re_commissions 
        AS PERMISSIVE FOR ALL 
        TO service_role 
        USING (true) 
        WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        ALTER PUBLICATION powersync ADD TABLE univ_re_commissions;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- univ_re_documents
    BEGIN
        ALTER TABLE IF EXISTS univ_re_documents ADD COLUMN IF NOT EXISTS company_id UUID;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        ALTER TABLE IF EXISTS univ_re_documents ENABLE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Enable ALL for users based on company_id" ON univ_re_documents;
        CREATE POLICY "Enable ALL for users based on company_id" ON univ_re_documents 
        AS PERMISSIVE FOR ALL 
        TO public 
        USING (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text)) 
        WITH CHECK (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text));
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Allow full access for service role" ON univ_re_documents;
        CREATE POLICY "Allow full access for service role" ON univ_re_documents 
        AS PERMISSIVE FOR ALL 
        TO service_role 
        USING (true) 
        WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        ALTER PUBLICATION powersync ADD TABLE univ_re_documents;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- univ_re_leases
    BEGIN
        ALTER TABLE IF EXISTS univ_re_leases ADD COLUMN IF NOT EXISTS company_id UUID;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        ALTER TABLE IF EXISTS univ_re_leases ENABLE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Enable ALL for users based on company_id" ON univ_re_leases;
        CREATE POLICY "Enable ALL for users based on company_id" ON univ_re_leases 
        AS PERMISSIVE FOR ALL 
        TO public 
        USING (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text)) 
        WITH CHECK (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text));
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Allow full access for service role" ON univ_re_leases;
        CREATE POLICY "Allow full access for service role" ON univ_re_leases 
        AS PERMISSIVE FOR ALL 
        TO service_role 
        USING (true) 
        WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        ALTER PUBLICATION powersync ADD TABLE univ_re_leases;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- univ_re_rent_payments
    BEGIN
        ALTER TABLE IF EXISTS univ_re_rent_payments ADD COLUMN IF NOT EXISTS company_id UUID;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        ALTER TABLE IF EXISTS univ_re_rent_payments ENABLE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Enable ALL for users based on company_id" ON univ_re_rent_payments;
        CREATE POLICY "Enable ALL for users based on company_id" ON univ_re_rent_payments 
        AS PERMISSIVE FOR ALL 
        TO public 
        USING (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text)) 
        WITH CHECK (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text));
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Allow full access for service role" ON univ_re_rent_payments;
        CREATE POLICY "Allow full access for service role" ON univ_re_rent_payments 
        AS PERMISSIVE FOR ALL 
        TO service_role 
        USING (true) 
        WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        ALTER PUBLICATION powersync ADD TABLE univ_re_rent_payments;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- univ_re_maintenance_requests
    BEGIN
        ALTER TABLE IF EXISTS univ_re_maintenance_requests ADD COLUMN IF NOT EXISTS company_id UUID;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        ALTER TABLE IF EXISTS univ_re_maintenance_requests ENABLE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Enable ALL for users based on company_id" ON univ_re_maintenance_requests;
        CREATE POLICY "Enable ALL for users based on company_id" ON univ_re_maintenance_requests 
        AS PERMISSIVE FOR ALL 
        TO public 
        USING (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text)) 
        WITH CHECK (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text));
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Allow full access for service role" ON univ_re_maintenance_requests;
        CREATE POLICY "Allow full access for service role" ON univ_re_maintenance_requests 
        AS PERMISSIVE FOR ALL 
        TO service_role 
        USING (true) 
        WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        ALTER PUBLICATION powersync ADD TABLE univ_re_maintenance_requests;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- univ_re_trust_accounts
    BEGIN
        ALTER TABLE IF EXISTS univ_re_trust_accounts ADD COLUMN IF NOT EXISTS company_id UUID;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        ALTER TABLE IF EXISTS univ_re_trust_accounts ENABLE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Enable ALL for users based on company_id" ON univ_re_trust_accounts;
        CREATE POLICY "Enable ALL for users based on company_id" ON univ_re_trust_accounts 
        AS PERMISSIVE FOR ALL 
        TO public 
        USING (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text)) 
        WITH CHECK (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text));
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Allow full access for service role" ON univ_re_trust_accounts;
        CREATE POLICY "Allow full access for service role" ON univ_re_trust_accounts 
        AS PERMISSIVE FOR ALL 
        TO service_role 
        USING (true) 
        WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        ALTER PUBLICATION powersync ADD TABLE univ_re_trust_accounts;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- univ_re_trust_ledger
    BEGIN
        ALTER TABLE IF EXISTS univ_re_trust_ledger ADD COLUMN IF NOT EXISTS company_id UUID;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        ALTER TABLE IF EXISTS univ_re_trust_ledger ENABLE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Enable ALL for users based on company_id" ON univ_re_trust_ledger;
        CREATE POLICY "Enable ALL for users based on company_id" ON univ_re_trust_ledger 
        AS PERMISSIVE FOR ALL 
        TO public 
        USING (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text)) 
        WITH CHECK (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text));
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Allow full access for service role" ON univ_re_trust_ledger;
        CREATE POLICY "Allow full access for service role" ON univ_re_trust_ledger 
        AS PERMISSIVE FOR ALL 
        TO service_role 
        USING (true) 
        WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        ALTER PUBLICATION powersync ADD TABLE univ_re_trust_ledger;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- univ_re_escrow_accounts
    BEGIN
        ALTER TABLE IF EXISTS univ_re_escrow_accounts ADD COLUMN IF NOT EXISTS company_id UUID;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        ALTER TABLE IF EXISTS univ_re_escrow_accounts ENABLE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Enable ALL for users based on company_id" ON univ_re_escrow_accounts;
        CREATE POLICY "Enable ALL for users based on company_id" ON univ_re_escrow_accounts 
        AS PERMISSIVE FOR ALL 
        TO public 
        USING (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text)) 
        WITH CHECK (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text));
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Allow full access for service role" ON univ_re_escrow_accounts;
        CREATE POLICY "Allow full access for service role" ON univ_re_escrow_accounts 
        AS PERMISSIVE FOR ALL 
        TO service_role 
        USING (true) 
        WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        ALTER PUBLICATION powersync ADD TABLE univ_re_escrow_accounts;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- univ_re_document_templates
    BEGIN
        ALTER TABLE IF EXISTS univ_re_document_templates ADD COLUMN IF NOT EXISTS company_id UUID;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        ALTER TABLE IF EXISTS univ_re_document_templates ENABLE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Enable ALL for users based on company_id" ON univ_re_document_templates;
        CREATE POLICY "Enable ALL for users based on company_id" ON univ_re_document_templates 
        AS PERMISSIVE FOR ALL 
        TO public 
        USING (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text)) 
        WITH CHECK (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text));
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Allow full access for service role" ON univ_re_document_templates;
        CREATE POLICY "Allow full access for service role" ON univ_re_document_templates 
        AS PERMISSIVE FOR ALL 
        TO service_role 
        USING (true) 
        WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        ALTER PUBLICATION powersync ADD TABLE univ_re_document_templates;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- univ_re_e_signatures
    BEGIN
        ALTER TABLE IF EXISTS univ_re_e_signatures ADD COLUMN IF NOT EXISTS company_id UUID;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        ALTER TABLE IF EXISTS univ_re_e_signatures ENABLE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Enable ALL for users based on company_id" ON univ_re_e_signatures;
        CREATE POLICY "Enable ALL for users based on company_id" ON univ_re_e_signatures 
        AS PERMISSIVE FOR ALL 
        TO public 
        USING (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text)) 
        WITH CHECK (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text));
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Allow full access for service role" ON univ_re_e_signatures;
        CREATE POLICY "Allow full access for service role" ON univ_re_e_signatures 
        AS PERMISSIVE FOR ALL 
        TO service_role 
        USING (true) 
        WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        ALTER PUBLICATION powersync ADD TABLE univ_re_e_signatures;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- univ_re_counter_offers
    BEGIN
        ALTER TABLE IF EXISTS univ_re_counter_offers ADD COLUMN IF NOT EXISTS company_id UUID;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        ALTER TABLE IF EXISTS univ_re_counter_offers ENABLE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Enable ALL for users based on company_id" ON univ_re_counter_offers;
        CREATE POLICY "Enable ALL for users based on company_id" ON univ_re_counter_offers 
        AS PERMISSIVE FOR ALL 
        TO public 
        USING (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text)) 
        WITH CHECK (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text));
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Allow full access for service role" ON univ_re_counter_offers;
        CREATE POLICY "Allow full access for service role" ON univ_re_counter_offers 
        AS PERMISSIVE FOR ALL 
        TO service_role 
        USING (true) 
        WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        ALTER PUBLICATION powersync ADD TABLE univ_re_counter_offers;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- univ_re_commission_rules
    BEGIN
        ALTER TABLE IF EXISTS univ_re_commission_rules ADD COLUMN IF NOT EXISTS company_id UUID;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        ALTER TABLE IF EXISTS univ_re_commission_rules ENABLE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Enable ALL for users based on company_id" ON univ_re_commission_rules;
        CREATE POLICY "Enable ALL for users based on company_id" ON univ_re_commission_rules 
        AS PERMISSIVE FOR ALL 
        TO public 
        USING (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text)) 
        WITH CHECK (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text));
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Allow full access for service role" ON univ_re_commission_rules;
        CREATE POLICY "Allow full access for service role" ON univ_re_commission_rules 
        AS PERMISSIVE FOR ALL 
        TO service_role 
        USING (true) 
        WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        ALTER PUBLICATION powersync ADD TABLE univ_re_commission_rules;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- univ_re_commission_details
    BEGIN
        ALTER TABLE IF EXISTS univ_re_commission_details ADD COLUMN IF NOT EXISTS company_id UUID;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        ALTER TABLE IF EXISTS univ_re_commission_details ENABLE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Enable ALL for users based on company_id" ON univ_re_commission_details;
        CREATE POLICY "Enable ALL for users based on company_id" ON univ_re_commission_details 
        AS PERMISSIVE FOR ALL 
        TO public 
        USING (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text)) 
        WITH CHECK (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text));
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Allow full access for service role" ON univ_re_commission_details;
        CREATE POLICY "Allow full access for service role" ON univ_re_commission_details 
        AS PERMISSIVE FOR ALL 
        TO service_role 
        USING (true) 
        WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        ALTER PUBLICATION powersync ADD TABLE univ_re_commission_details;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- univ_re_contractors
    BEGIN
        ALTER TABLE IF EXISTS univ_re_contractors ADD COLUMN IF NOT EXISTS company_id UUID;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        ALTER TABLE IF EXISTS univ_re_contractors ENABLE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Enable ALL for users based on company_id" ON univ_re_contractors;
        CREATE POLICY "Enable ALL for users based on company_id" ON univ_re_contractors 
        AS PERMISSIVE FOR ALL 
        TO public 
        USING (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text)) 
        WITH CHECK (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text));
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Allow full access for service role" ON univ_re_contractors;
        CREATE POLICY "Allow full access for service role" ON univ_re_contractors 
        AS PERMISSIVE FOR ALL 
        TO service_role 
        USING (true) 
        WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        ALTER PUBLICATION powersync ADD TABLE univ_re_contractors;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- univ_re_contractor_reviews
    BEGIN
        ALTER TABLE IF EXISTS univ_re_contractor_reviews ADD COLUMN IF NOT EXISTS company_id UUID;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        ALTER TABLE IF EXISTS univ_re_contractor_reviews ENABLE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Enable ALL for users based on company_id" ON univ_re_contractor_reviews;
        CREATE POLICY "Enable ALL for users based on company_id" ON univ_re_contractor_reviews 
        AS PERMISSIVE FOR ALL 
        TO public 
        USING (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text)) 
        WITH CHECK (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text));
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Allow full access for service role" ON univ_re_contractor_reviews;
        CREATE POLICY "Allow full access for service role" ON univ_re_contractor_reviews 
        AS PERMISSIVE FOR ALL 
        TO service_role 
        USING (true) 
        WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        ALTER PUBLICATION powersync ADD TABLE univ_re_contractor_reviews;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- univ_re_lease_renewals
    BEGIN
        ALTER TABLE IF EXISTS univ_re_lease_renewals ADD COLUMN IF NOT EXISTS company_id UUID;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        ALTER TABLE IF EXISTS univ_re_lease_renewals ENABLE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Enable ALL for users based on company_id" ON univ_re_lease_renewals;
        CREATE POLICY "Enable ALL for users based on company_id" ON univ_re_lease_renewals 
        AS PERMISSIVE FOR ALL 
        TO public 
        USING (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text)) 
        WITH CHECK (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text));
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Allow full access for service role" ON univ_re_lease_renewals;
        CREATE POLICY "Allow full access for service role" ON univ_re_lease_renewals 
        AS PERMISSIVE FOR ALL 
        TO service_role 
        USING (true) 
        WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        ALTER PUBLICATION powersync ADD TABLE univ_re_lease_renewals;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- univ_re_rent_payment_schedules
    BEGIN
        ALTER TABLE IF EXISTS univ_re_rent_payment_schedules ADD COLUMN IF NOT EXISTS company_id UUID;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        ALTER TABLE IF EXISTS univ_re_rent_payment_schedules ENABLE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Enable ALL for users based on company_id" ON univ_re_rent_payment_schedules;
        CREATE POLICY "Enable ALL for users based on company_id" ON univ_re_rent_payment_schedules 
        AS PERMISSIVE FOR ALL 
        TO public 
        USING (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text)) 
        WITH CHECK (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text));
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Allow full access for service role" ON univ_re_rent_payment_schedules;
        CREATE POLICY "Allow full access for service role" ON univ_re_rent_payment_schedules 
        AS PERMISSIVE FOR ALL 
        TO service_role 
        USING (true) 
        WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        ALTER PUBLICATION powersync ADD TABLE univ_re_rent_payment_schedules;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- univ_re_rent_payment_history
    BEGIN
        ALTER TABLE IF EXISTS univ_re_rent_payment_history ADD COLUMN IF NOT EXISTS company_id UUID;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        ALTER TABLE IF EXISTS univ_re_rent_payment_history ENABLE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Enable ALL for users based on company_id" ON univ_re_rent_payment_history;
        CREATE POLICY "Enable ALL for users based on company_id" ON univ_re_rent_payment_history 
        AS PERMISSIVE FOR ALL 
        TO public 
        USING (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text)) 
        WITH CHECK (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text));
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Allow full access for service role" ON univ_re_rent_payment_history;
        CREATE POLICY "Allow full access for service role" ON univ_re_rent_payment_history 
        AS PERMISSIVE FOR ALL 
        TO service_role 
        USING (true) 
        WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        ALTER PUBLICATION powersync ADD TABLE univ_re_rent_payment_history;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- univ_re_market_data
    BEGIN
        ALTER TABLE IF EXISTS univ_re_market_data ADD COLUMN IF NOT EXISTS company_id UUID;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        ALTER TABLE IF EXISTS univ_re_market_data ENABLE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Enable ALL for users based on company_id" ON univ_re_market_data;
        CREATE POLICY "Enable ALL for users based on company_id" ON univ_re_market_data 
        AS PERMISSIVE FOR ALL 
        TO public 
        USING (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text)) 
        WITH CHECK (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text));
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Allow full access for service role" ON univ_re_market_data;
        CREATE POLICY "Allow full access for service role" ON univ_re_market_data 
        AS PERMISSIVE FOR ALL 
        TO service_role 
        USING (true) 
        WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        ALTER PUBLICATION powersync ADD TABLE univ_re_market_data;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- univ_re_comparable_properties
    BEGIN
        ALTER TABLE IF EXISTS univ_re_comparable_properties ADD COLUMN IF NOT EXISTS company_id UUID;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        ALTER TABLE IF EXISTS univ_re_comparable_properties ENABLE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Enable ALL for users based on company_id" ON univ_re_comparable_properties;
        CREATE POLICY "Enable ALL for users based on company_id" ON univ_re_comparable_properties 
        AS PERMISSIVE FOR ALL 
        TO public 
        USING (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text)) 
        WITH CHECK (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text));
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Allow full access for service role" ON univ_re_comparable_properties;
        CREATE POLICY "Allow full access for service role" ON univ_re_comparable_properties 
        AS PERMISSIVE FOR ALL 
        TO service_role 
        USING (true) 
        WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        ALTER PUBLICATION powersync ADD TABLE univ_re_comparable_properties;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- univ_re_agent_metrics
    BEGIN
        ALTER TABLE IF EXISTS univ_re_agent_metrics ADD COLUMN IF NOT EXISTS company_id UUID;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        ALTER TABLE IF EXISTS univ_re_agent_metrics ENABLE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Enable ALL for users based on company_id" ON univ_re_agent_metrics;
        CREATE POLICY "Enable ALL for users based on company_id" ON univ_re_agent_metrics 
        AS PERMISSIVE FOR ALL 
        TO public 
        USING (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text)) 
        WITH CHECK (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text));
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Allow full access for service role" ON univ_re_agent_metrics;
        CREATE POLICY "Allow full access for service role" ON univ_re_agent_metrics 
        AS PERMISSIVE FOR ALL 
        TO service_role 
        USING (true) 
        WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        ALTER PUBLICATION powersync ADD TABLE univ_re_agent_metrics;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- univ_re_client_scoring
    BEGIN
        ALTER TABLE IF EXISTS univ_re_client_scoring ADD COLUMN IF NOT EXISTS company_id UUID;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        ALTER TABLE IF EXISTS univ_re_client_scoring ENABLE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Enable ALL for users based on company_id" ON univ_re_client_scoring;
        CREATE POLICY "Enable ALL for users based on company_id" ON univ_re_client_scoring 
        AS PERMISSIVE FOR ALL 
        TO public 
        USING (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text)) 
        WITH CHECK (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text));
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Allow full access for service role" ON univ_re_client_scoring;
        CREATE POLICY "Allow full access for service role" ON univ_re_client_scoring 
        AS PERMISSIVE FOR ALL 
        TO service_role 
        USING (true) 
        WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        ALTER PUBLICATION powersync ADD TABLE univ_re_client_scoring;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- univ_re_agent_recommendations
    BEGIN
        ALTER TABLE IF EXISTS univ_re_agent_recommendations ADD COLUMN IF NOT EXISTS company_id UUID;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        ALTER TABLE IF EXISTS univ_re_agent_recommendations ENABLE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Enable ALL for users based on company_id" ON univ_re_agent_recommendations;
        CREATE POLICY "Enable ALL for users based on company_id" ON univ_re_agent_recommendations 
        AS PERMISSIVE FOR ALL 
        TO public 
        USING (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text)) 
        WITH CHECK (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text));
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Allow full access for service role" ON univ_re_agent_recommendations;
        CREATE POLICY "Allow full access for service role" ON univ_re_agent_recommendations 
        AS PERMISSIVE FOR ALL 
        TO service_role 
        USING (true) 
        WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        ALTER PUBLICATION powersync ADD TABLE univ_re_agent_recommendations;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- univ_re_audit_log
    BEGIN
        ALTER TABLE IF EXISTS univ_re_audit_log ADD COLUMN IF NOT EXISTS company_id UUID;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        ALTER TABLE IF EXISTS univ_re_audit_log ENABLE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Enable ALL for users based on company_id" ON univ_re_audit_log;
        CREATE POLICY "Enable ALL for users based on company_id" ON univ_re_audit_log 
        AS PERMISSIVE FOR ALL 
        TO public 
        USING (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text)) 
        WITH CHECK (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text));
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Allow full access for service role" ON univ_re_audit_log;
        CREATE POLICY "Allow full access for service role" ON univ_re_audit_log 
        AS PERMISSIVE FOR ALL 
        TO service_role 
        USING (true) 
        WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        ALTER PUBLICATION powersync ADD TABLE univ_re_audit_log;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- univ_re_team_members
    BEGIN
        ALTER TABLE IF EXISTS univ_re_team_members ADD COLUMN IF NOT EXISTS company_id UUID;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        ALTER TABLE IF EXISTS univ_re_team_members ENABLE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Enable ALL for users based on company_id" ON univ_re_team_members;
        CREATE POLICY "Enable ALL for users based on company_id" ON univ_re_team_members 
        AS PERMISSIVE FOR ALL 
        TO public 
        USING (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text)) 
        WITH CHECK (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text));
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Allow full access for service role" ON univ_re_team_members;
        CREATE POLICY "Allow full access for service role" ON univ_re_team_members 
        AS PERMISSIVE FOR ALL 
        TO service_role 
        USING (true) 
        WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        ALTER PUBLICATION powersync ADD TABLE univ_re_team_members;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- univ_re_mls_listings
    BEGIN
        ALTER TABLE IF EXISTS univ_re_mls_listings ADD COLUMN IF NOT EXISTS company_id UUID;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        ALTER TABLE IF EXISTS univ_re_mls_listings ENABLE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Enable ALL for users based on company_id" ON univ_re_mls_listings;
        CREATE POLICY "Enable ALL for users based on company_id" ON univ_re_mls_listings 
        AS PERMISSIVE FOR ALL 
        TO public 
        USING (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text)) 
        WITH CHECK (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text));
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Allow full access for service role" ON univ_re_mls_listings;
        CREATE POLICY "Allow full access for service role" ON univ_re_mls_listings 
        AS PERMISSIVE FOR ALL 
        TO service_role 
        USING (true) 
        WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        ALTER PUBLICATION powersync ADD TABLE univ_re_mls_listings;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- univ_re_comparable_analysis
    BEGIN
        ALTER TABLE IF EXISTS univ_re_comparable_analysis ADD COLUMN IF NOT EXISTS company_id UUID;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        ALTER TABLE IF EXISTS univ_re_comparable_analysis ENABLE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Enable ALL for users based on company_id" ON univ_re_comparable_analysis;
        CREATE POLICY "Enable ALL for users based on company_id" ON univ_re_comparable_analysis 
        AS PERMISSIVE FOR ALL 
        TO public 
        USING (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text)) 
        WITH CHECK (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text));
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Allow full access for service role" ON univ_re_comparable_analysis;
        CREATE POLICY "Allow full access for service role" ON univ_re_comparable_analysis 
        AS PERMISSIVE FOR ALL 
        TO service_role 
        USING (true) 
        WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        ALTER PUBLICATION powersync ADD TABLE univ_re_comparable_analysis;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- univ_re_market_trends
    BEGIN
        ALTER TABLE IF EXISTS univ_re_market_trends ADD COLUMN IF NOT EXISTS company_id UUID;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        ALTER TABLE IF EXISTS univ_re_market_trends ENABLE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Enable ALL for users based on company_id" ON univ_re_market_trends;
        CREATE POLICY "Enable ALL for users based on company_id" ON univ_re_market_trends 
        AS PERMISSIVE FOR ALL 
        TO public 
        USING (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text)) 
        WITH CHECK (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text));
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Allow full access for service role" ON univ_re_market_trends;
        CREATE POLICY "Allow full access for service role" ON univ_re_market_trends 
        AS PERMISSIVE FOR ALL 
        TO service_role 
        USING (true) 
        WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        ALTER PUBLICATION powersync ADD TABLE univ_re_market_trends;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- univ_re_leads
    BEGIN
        ALTER TABLE IF EXISTS univ_re_leads ADD COLUMN IF NOT EXISTS company_id UUID;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        ALTER TABLE IF EXISTS univ_re_leads ENABLE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Enable ALL for users based on company_id" ON univ_re_leads;
        CREATE POLICY "Enable ALL for users based on company_id" ON univ_re_leads 
        AS PERMISSIVE FOR ALL 
        TO public 
        USING (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text)) 
        WITH CHECK (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text));
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Allow full access for service role" ON univ_re_leads;
        CREATE POLICY "Allow full access for service role" ON univ_re_leads 
        AS PERMISSIVE FOR ALL 
        TO service_role 
        USING (true) 
        WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        ALTER PUBLICATION powersync ADD TABLE univ_re_leads;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- univ_re_lead_activities
    BEGIN
        ALTER TABLE IF EXISTS univ_re_lead_activities ADD COLUMN IF NOT EXISTS company_id UUID;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        ALTER TABLE IF EXISTS univ_re_lead_activities ENABLE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Enable ALL for users based on company_id" ON univ_re_lead_activities;
        CREATE POLICY "Enable ALL for users based on company_id" ON univ_re_lead_activities 
        AS PERMISSIVE FOR ALL 
        TO public 
        USING (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text)) 
        WITH CHECK (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text));
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Allow full access for service role" ON univ_re_lead_activities;
        CREATE POLICY "Allow full access for service role" ON univ_re_lead_activities 
        AS PERMISSIVE FOR ALL 
        TO service_role 
        USING (true) 
        WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        ALTER PUBLICATION powersync ADD TABLE univ_re_lead_activities;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- univ_re_agentic_conversations
    BEGIN
        ALTER TABLE IF EXISTS univ_re_agentic_conversations ADD COLUMN IF NOT EXISTS company_id UUID;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        ALTER TABLE IF EXISTS univ_re_agentic_conversations ENABLE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Enable ALL for users based on company_id" ON univ_re_agentic_conversations;
        CREATE POLICY "Enable ALL for users based on company_id" ON univ_re_agentic_conversations 
        AS PERMISSIVE FOR ALL 
        TO public 
        USING (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text)) 
        WITH CHECK (company_id::text = ((auth.jwt() -> 'user_metadata'::text) ->> 'company_id'::text));
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        DROP POLICY IF EXISTS "Allow full access for service role" ON univ_re_agentic_conversations;
        CREATE POLICY "Allow full access for service role" ON univ_re_agentic_conversations 
        AS PERMISSIVE FOR ALL 
        TO service_role 
        USING (true) 
        WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        ALTER PUBLICATION powersync ADD TABLE univ_re_agentic_conversations;
    EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;
