-- ============================================================
-- COMPREHENSIVE FIX: PHARMACY + REAL ESTATE VERTICALS
-- Migration: 20260627000000_fix_pharmacy_realestate.sql
-- ============================================================
-- ROOT CAUSE OF ALL ERRORS:
-- Pharmacy RLS policies used: auth.jwt()->>'company_id'
-- But company_id is NOT stored in the Supabase JWT claims!
-- It is only in the profiles table.
--
-- CORRECT PATTERN (what the working tables use):
-- (SELECT company_id FROM public.profiles WHERE id = auth.uid())
--
-- FIXES:
-- 1. Adds company_id to sync_errors (already exists, no company_id column)
-- 2. Creates univ_re_agentic_conversations (Agentic.jsx uses it, never created)
-- 3. Adds missing columns referenced in code but absent from DB
-- 4. Replaces ALL broken pharmacy RLS policies
-- 5. Ensures ALL real estate RLS policies use correct pattern
-- 6. Adds all tables to PowerSync publication
-- 7. Fixes quantity_available generated column in pharmacy_inventory
-- 8. Grants proper permissions to authenticated + service_role
--
-- SAFE TO RUN: Uses IF NOT EXISTS, DROP POLICY IF EXISTS, DO blocks
-- ============================================================

-- ============================================================
-- SECTION 1: FIX SYNC_ERRORS TABLE
-- Already exists from migration 20260613220000 but WITHOUT company_id
-- We just add company_id safely and fix its RLS
-- ============================================================

ALTER TABLE public.sync_errors ADD COLUMN IF NOT EXISTS company_id TEXT;

ALTER TABLE public.sync_errors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.sync_errors;
DROP POLICY IF EXISTS "sync_errors_company_access" ON public.sync_errors;
DROP POLICY IF EXISTS "sync_errors_all_access" ON public.sync_errors;
CREATE POLICY "sync_errors_all_access" ON public.sync_errors
  FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON public.sync_errors TO authenticated, service_role;

-- ============================================================
-- SECTION 2: CREATE MISSING REAL ESTATE TABLES
-- ============================================================

-- Agentic Conversations (Agentic.jsx queries this but was never created)
CREATE TABLE IF NOT EXISTS public.univ_re_agentic_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  title TEXT,
  messages JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'active',
  context JSONB DEFAULT '{}'::jsonb,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_re_agentic_company ON public.univ_re_agentic_conversations(company_id);

-- ============================================================
-- SECTION 3: ADD MISSING COLUMNS (conditional, safe)
-- ============================================================

-- Properties: Analytics.jsx uses listing_price; DB only has 'price'
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='univ_re_properties' AND column_name='listing_price'
  ) THEN
    ALTER TABLE public.univ_re_properties ADD COLUMN listing_price DECIMAL(15,2);
    UPDATE public.univ_re_properties SET listing_price = price WHERE listing_price IS NULL;
  END IF;
END $$;

-- Transactions: Analytics.jsx uses transaction_amount; DB only has sale_price
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='univ_re_transactions' AND column_name='transaction_amount'
  ) THEN
    ALTER TABLE public.univ_re_transactions ADD COLUMN transaction_amount DECIMAL(15,2);
    UPDATE public.univ_re_transactions SET transaction_amount = sale_price WHERE transaction_amount IS NULL;
  END IF;
END $$;

-- Trust ledger: AppSchema uses trust_account_id
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='univ_re_trust_ledger' AND column_name='trust_account_id') THEN
    ALTER TABLE public.univ_re_trust_ledger ADD COLUMN trust_account_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='univ_re_trust_ledger' AND column_name='account_id') THEN
    ALTER TABLE public.univ_re_trust_ledger ADD COLUMN account_id UUID;
  END IF;
END $$;

-- Document templates: AppSchema has extra columns
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='univ_re_document_templates' AND column_name='document_category') THEN
    ALTER TABLE public.univ_re_document_templates ADD COLUMN document_category TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='univ_re_document_templates' AND column_name='template_variables') THEN
    ALTER TABLE public.univ_re_document_templates ADD COLUMN template_variables JSONB DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='univ_re_document_templates' AND column_name='required_signatures') THEN
    ALTER TABLE public.univ_re_document_templates ADD COLUMN required_signatures INTEGER DEFAULT 1;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='univ_re_document_templates' AND column_name='created_by') THEN
    ALTER TABLE public.univ_re_document_templates ADD COLUMN created_by TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='univ_re_document_templates' AND column_name='version') THEN
    ALTER TABLE public.univ_re_document_templates ADD COLUMN version INTEGER DEFAULT 1;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='univ_re_document_templates' AND column_name='updated_at') THEN
    ALTER TABLE public.univ_re_document_templates ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

-- E-signatures: AppSchema has extra columns
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='univ_re_e_signatures' AND column_name='signer_id') THEN
    ALTER TABLE public.univ_re_e_signatures ADD COLUMN signer_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='univ_re_e_signatures' AND column_name='signer_name') THEN
    ALTER TABLE public.univ_re_e_signatures ADD COLUMN signer_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='univ_re_e_signatures' AND column_name='signer_phone') THEN
    ALTER TABLE public.univ_re_e_signatures ADD COLUMN signer_phone TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='univ_re_e_signatures' AND column_name='signature_date') THEN
    ALTER TABLE public.univ_re_e_signatures ADD COLUMN signature_date TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='univ_re_e_signatures' AND column_name='signature_url') THEN
    ALTER TABLE public.univ_re_e_signatures ADD COLUMN signature_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='univ_re_e_signatures' AND column_name='signing_ip_address') THEN
    ALTER TABLE public.univ_re_e_signatures ADD COLUMN signing_ip_address TEXT;
  END IF;
END $$;

-- Trust accounts: missing metadata + updated_at
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='univ_re_trust_accounts' AND column_name='metadata') THEN
    ALTER TABLE public.univ_re_trust_accounts ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='univ_re_trust_accounts' AND column_name='updated_at') THEN
    ALTER TABLE public.univ_re_trust_accounts ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

-- Audit log: AppSchema uses resource_type, resource_id, changes, ip_address, user_agent
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='univ_re_audit_log' AND column_name='resource_type') THEN
    ALTER TABLE public.univ_re_audit_log ADD COLUMN resource_type TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='univ_re_audit_log' AND column_name='resource_id') THEN
    ALTER TABLE public.univ_re_audit_log ADD COLUMN resource_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='univ_re_audit_log' AND column_name='changes') THEN
    ALTER TABLE public.univ_re_audit_log ADD COLUMN changes JSONB;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='univ_re_audit_log' AND column_name='ip_address') THEN
    ALTER TABLE public.univ_re_audit_log ADD COLUMN ip_address TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='univ_re_audit_log' AND column_name='user_agent') THEN
    ALTER TABLE public.univ_re_audit_log ADD COLUMN user_agent TEXT;
  END IF;
END $$;

-- ============================================================
-- SECTION 4: FIX PHARMACY INVENTORY GENERATED COLUMN
-- quantity_available was GENERATED ALWAYS AS but PowerSync can't
-- write to generated columns. Convert to regular column with trigger.
-- ============================================================

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public'
    AND table_name='univ_pharmacy_inventory'
    AND column_name='quantity_available'
    AND is_generated='ALWAYS'
  ) THEN
    ALTER TABLE public.univ_pharmacy_inventory DROP COLUMN quantity_available;
    ALTER TABLE public.univ_pharmacy_inventory ADD COLUMN quantity_available INTEGER DEFAULT 0;
    UPDATE public.univ_pharmacy_inventory
    SET quantity_available = COALESCE(quantity_in_stock, 0) - COALESCE(quantity_reserved, 0);
    RAISE NOTICE 'Converted quantity_available from GENERATED to regular column';
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='univ_pharmacy_inventory' AND column_name='quantity_available'
  ) THEN
    ALTER TABLE public.univ_pharmacy_inventory ADD COLUMN quantity_available INTEGER DEFAULT 0;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION update_pharmacy_quantity_available()
RETURNS TRIGGER AS $trig$
BEGIN
  NEW.quantity_available := COALESCE(NEW.quantity_in_stock, 0) - COALESCE(NEW.quantity_reserved, 0);
  RETURN NEW;
END;
$trig$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pharmacy_qty_available ON public.univ_pharmacy_inventory;
CREATE TRIGGER trg_pharmacy_qty_available
  BEFORE INSERT OR UPDATE ON public.univ_pharmacy_inventory
  FOR EACH ROW EXECUTE FUNCTION update_pharmacy_quantity_available();

-- ============================================================
-- SECTION 5: PHARMACY - FIX ALL RLS POLICIES
-- OLD (BROKEN): auth.jwt()->>'company_id'  (not in JWT token)
-- NEW (CORRECT): (SELECT company_id FROM public.profiles WHERE id = auth.uid())
-- ============================================================

ALTER TABLE public.univ_pharmacy_drugs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pharmacy_drugs_read" ON public.univ_pharmacy_drugs;
DROP POLICY IF EXISTS "pharmacy_drugs_write" ON public.univ_pharmacy_drugs;
DROP POLICY IF EXISTS "pharmacy_drugs_update" ON public.univ_pharmacy_drugs;
DROP POLICY IF EXISTS "pharmacy_drugs_read_v2" ON public.univ_pharmacy_drugs;
DROP POLICY IF EXISTS "pharmacy_drugs_insert_v2" ON public.univ_pharmacy_drugs;
DROP POLICY IF EXISTS "pharmacy_drugs_update_v2" ON public.univ_pharmacy_drugs;
DROP POLICY IF EXISTS "pharmacy_drugs_all_access" ON public.univ_pharmacy_drugs;
CREATE POLICY "pharmacy_drugs_all_access" ON public.univ_pharmacy_drugs
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

ALTER TABLE public.univ_pharmacy_inventory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pharmacy_inventory_read" ON public.univ_pharmacy_inventory;
DROP POLICY IF EXISTS "pharmacy_inventory_write" ON public.univ_pharmacy_inventory;
DROP POLICY IF EXISTS "pharmacy_inventory_update" ON public.univ_pharmacy_inventory;
DROP POLICY IF EXISTS "pharmacy_inventory_read_v2" ON public.univ_pharmacy_inventory;
DROP POLICY IF EXISTS "pharmacy_inventory_insert_v2" ON public.univ_pharmacy_inventory;
DROP POLICY IF EXISTS "pharmacy_inventory_update_v2" ON public.univ_pharmacy_inventory;
DROP POLICY IF EXISTS "pharmacy_inventory_all_access" ON public.univ_pharmacy_inventory;
CREATE POLICY "pharmacy_inventory_all_access" ON public.univ_pharmacy_inventory
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

ALTER TABLE public.univ_pharmacy_customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pharmacy_customers_read" ON public.univ_pharmacy_customers;
DROP POLICY IF EXISTS "pharmacy_customers_write" ON public.univ_pharmacy_customers;
DROP POLICY IF EXISTS "pharmacy_customers_read_v2" ON public.univ_pharmacy_customers;
DROP POLICY IF EXISTS "pharmacy_customers_insert_v2" ON public.univ_pharmacy_customers;
DROP POLICY IF EXISTS "pharmacy_customers_all_access" ON public.univ_pharmacy_customers;
CREATE POLICY "pharmacy_customers_all_access" ON public.univ_pharmacy_customers
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

ALTER TABLE public.univ_pharmacy_sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pharmacy_sales_read" ON public.univ_pharmacy_sales;
DROP POLICY IF EXISTS "pharmacy_sales_write" ON public.univ_pharmacy_sales;
DROP POLICY IF EXISTS "pharmacy_sales_update" ON public.univ_pharmacy_sales;
DROP POLICY IF EXISTS "pharmacy_sales_read_v2" ON public.univ_pharmacy_sales;
DROP POLICY IF EXISTS "pharmacy_sales_insert_v2" ON public.univ_pharmacy_sales;
DROP POLICY IF EXISTS "pharmacy_sales_update_v2" ON public.univ_pharmacy_sales;
DROP POLICY IF EXISTS "pharmacy_sales_all_access" ON public.univ_pharmacy_sales;
CREATE POLICY "pharmacy_sales_all_access" ON public.univ_pharmacy_sales
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

ALTER TABLE public.univ_pharmacy_sale_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pharmacy_sale_items_read" ON public.univ_pharmacy_sale_items;
DROP POLICY IF EXISTS "pharmacy_sale_items_write" ON public.univ_pharmacy_sale_items;
DROP POLICY IF EXISTS "pharmacy_sale_items_read_v2" ON public.univ_pharmacy_sale_items;
DROP POLICY IF EXISTS "pharmacy_sale_items_insert_v2" ON public.univ_pharmacy_sale_items;
DROP POLICY IF EXISTS "pharmacy_sale_items_all_access" ON public.univ_pharmacy_sale_items;
CREATE POLICY "pharmacy_sale_items_all_access" ON public.univ_pharmacy_sale_items
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

ALTER TABLE public.univ_pharmacy_prescriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pharmacy_prescriptions_read" ON public.univ_pharmacy_prescriptions;
DROP POLICY IF EXISTS "pharmacy_prescriptions_write" ON public.univ_pharmacy_prescriptions;
DROP POLICY IF EXISTS "pharmacy_prescriptions_read_v2" ON public.univ_pharmacy_prescriptions;
DROP POLICY IF EXISTS "pharmacy_prescriptions_insert_v2" ON public.univ_pharmacy_prescriptions;
DROP POLICY IF EXISTS "pharmacy_prescriptions_all_access" ON public.univ_pharmacy_prescriptions;
CREATE POLICY "pharmacy_prescriptions_all_access" ON public.univ_pharmacy_prescriptions
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

ALTER TABLE public.univ_pharmacy_suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pharmacy_suppliers_read" ON public.univ_pharmacy_suppliers;
DROP POLICY IF EXISTS "pharmacy_suppliers_write" ON public.univ_pharmacy_suppliers;
DROP POLICY IF EXISTS "pharmacy_suppliers_read_v2" ON public.univ_pharmacy_suppliers;
DROP POLICY IF EXISTS "pharmacy_suppliers_insert_v2" ON public.univ_pharmacy_suppliers;
DROP POLICY IF EXISTS "pharmacy_suppliers_all_access" ON public.univ_pharmacy_suppliers;
CREATE POLICY "pharmacy_suppliers_all_access" ON public.univ_pharmacy_suppliers
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

ALTER TABLE public.univ_pharmacy_purchase_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pharmacy_po_read" ON public.univ_pharmacy_purchase_orders;
DROP POLICY IF EXISTS "pharmacy_po_write" ON public.univ_pharmacy_purchase_orders;
DROP POLICY IF EXISTS "pharmacy_po_read_v2" ON public.univ_pharmacy_purchase_orders;
DROP POLICY IF EXISTS "pharmacy_po_insert_v2" ON public.univ_pharmacy_purchase_orders;
DROP POLICY IF EXISTS "pharmacy_purchase_orders_all_access" ON public.univ_pharmacy_purchase_orders;
CREATE POLICY "pharmacy_purchase_orders_all_access" ON public.univ_pharmacy_purchase_orders
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

ALTER TABLE public.univ_pharmacy_insurance_claims ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pharmacy_claims_read" ON public.univ_pharmacy_insurance_claims;
DROP POLICY IF EXISTS "pharmacy_claims_write" ON public.univ_pharmacy_insurance_claims;
DROP POLICY IF EXISTS "pharmacy_claims_read_v2" ON public.univ_pharmacy_insurance_claims;
DROP POLICY IF EXISTS "pharmacy_claims_insert_v2" ON public.univ_pharmacy_insurance_claims;
DROP POLICY IF EXISTS "pharmacy_insurance_claims_all_access" ON public.univ_pharmacy_insurance_claims;
CREATE POLICY "pharmacy_insurance_claims_all_access" ON public.univ_pharmacy_insurance_claims
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

ALTER TABLE public.univ_pharmacy_controlled_substances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pharmacy_controlled_read" ON public.univ_pharmacy_controlled_substances;
DROP POLICY IF EXISTS "pharmacy_controlled_write" ON public.univ_pharmacy_controlled_substances;
DROP POLICY IF EXISTS "pharmacy_controlled_read_v2" ON public.univ_pharmacy_controlled_substances;
DROP POLICY IF EXISTS "pharmacy_controlled_insert_v2" ON public.univ_pharmacy_controlled_substances;
DROP POLICY IF EXISTS "pharmacy_controlled_substances_all_access" ON public.univ_pharmacy_controlled_substances;
CREATE POLICY "pharmacy_controlled_substances_all_access" ON public.univ_pharmacy_controlled_substances
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

ALTER TABLE public.univ_pharmacy_shifts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pharmacy_shifts_read" ON public.univ_pharmacy_shifts;
DROP POLICY IF EXISTS "pharmacy_shifts_write" ON public.univ_pharmacy_shifts;
DROP POLICY IF EXISTS "pharmacy_shifts_read_v2" ON public.univ_pharmacy_shifts;
DROP POLICY IF EXISTS "pharmacy_shifts_insert_v2" ON public.univ_pharmacy_shifts;
DROP POLICY IF EXISTS "pharmacy_shifts_all_access" ON public.univ_pharmacy_shifts;
CREATE POLICY "pharmacy_shifts_all_access" ON public.univ_pharmacy_shifts
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

ALTER TABLE public.univ_pharmacy_reconciliations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pharmacy_reconciliations_read" ON public.univ_pharmacy_reconciliations;
DROP POLICY IF EXISTS "pharmacy_reconciliations_write" ON public.univ_pharmacy_reconciliations;
DROP POLICY IF EXISTS "pharmacy_reconciliations_read_v2" ON public.univ_pharmacy_reconciliations;
DROP POLICY IF EXISTS "pharmacy_reconciliations_insert_v2" ON public.univ_pharmacy_reconciliations;
DROP POLICY IF EXISTS "pharmacy_reconciliations_all_access" ON public.univ_pharmacy_reconciliations;
CREATE POLICY "pharmacy_reconciliations_all_access" ON public.univ_pharmacy_reconciliations
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

ALTER TABLE public.univ_pharmacy_expiry_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pharmacy_expiry_read" ON public.univ_pharmacy_expiry_alerts;
DROP POLICY IF EXISTS "pharmacy_expiry_write" ON public.univ_pharmacy_expiry_alerts;
DROP POLICY IF EXISTS "pharmacy_expiry_read_v2" ON public.univ_pharmacy_expiry_alerts;
DROP POLICY IF EXISTS "pharmacy_expiry_insert_v2" ON public.univ_pharmacy_expiry_alerts;
DROP POLICY IF EXISTS "pharmacy_expiry_alerts_all_access" ON public.univ_pharmacy_expiry_alerts;
CREATE POLICY "pharmacy_expiry_alerts_all_access" ON public.univ_pharmacy_expiry_alerts
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

ALTER TABLE public.univ_pharmacy_analytics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pharmacy_analytics_read" ON public.univ_pharmacy_analytics;
DROP POLICY IF EXISTS "pharmacy_analytics_write" ON public.univ_pharmacy_analytics;
DROP POLICY IF EXISTS "pharmacy_analytics_read_v2" ON public.univ_pharmacy_analytics;
DROP POLICY IF EXISTS "pharmacy_analytics_insert_v2" ON public.univ_pharmacy_analytics;
DROP POLICY IF EXISTS "pharmacy_analytics_all_access" ON public.univ_pharmacy_analytics;
CREATE POLICY "pharmacy_analytics_all_access" ON public.univ_pharmacy_analytics
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

ALTER TABLE public.univ_pharmacy_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pharmacy_audit_read" ON public.univ_pharmacy_audit_log;
DROP POLICY IF EXISTS "pharmacy_audit_write" ON public.univ_pharmacy_audit_log;
DROP POLICY IF EXISTS "pharmacy_audit_read_v2" ON public.univ_pharmacy_audit_log;
DROP POLICY IF EXISTS "pharmacy_audit_insert_v2" ON public.univ_pharmacy_audit_log;
DROP POLICY IF EXISTS "pharmacy_audit_log_all_access" ON public.univ_pharmacy_audit_log;
CREATE POLICY "pharmacy_audit_log_all_access" ON public.univ_pharmacy_audit_log
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- ============================================================
-- SECTION 6: REAL ESTATE - FIX / ENSURE ALL RLS POLICIES
-- ============================================================

ALTER TABLE public.univ_re_properties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "real_estate_properties_company_access" ON public.univ_re_properties;
DROP POLICY IF EXISTS "re_properties_all_access" ON public.univ_re_properties;
CREATE POLICY "re_properties_all_access" ON public.univ_re_properties
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

ALTER TABLE public.univ_re_clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "real_estate_clients_company_access" ON public.univ_re_clients;
DROP POLICY IF EXISTS "re_clients_all_access" ON public.univ_re_clients;
CREATE POLICY "re_clients_all_access" ON public.univ_re_clients
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

ALTER TABLE public.univ_re_viewings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "real_estate_viewings_company_access" ON public.univ_re_viewings;
DROP POLICY IF EXISTS "re_viewings_all_access" ON public.univ_re_viewings;
CREATE POLICY "re_viewings_all_access" ON public.univ_re_viewings
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

ALTER TABLE public.univ_re_offers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "real_estate_offers_company_access" ON public.univ_re_offers;
DROP POLICY IF EXISTS "re_offers_all_access" ON public.univ_re_offers;
CREATE POLICY "re_offers_all_access" ON public.univ_re_offers
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

ALTER TABLE public.univ_re_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "real_estate_transactions_company_access" ON public.univ_re_transactions;
DROP POLICY IF EXISTS "re_transactions_all_access" ON public.univ_re_transactions;
CREATE POLICY "re_transactions_all_access" ON public.univ_re_transactions
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

ALTER TABLE public.univ_re_commissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "real_estate_commissions_company_access" ON public.univ_re_commissions;
DROP POLICY IF EXISTS "re_commissions_all_access" ON public.univ_re_commissions;
CREATE POLICY "re_commissions_all_access" ON public.univ_re_commissions
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

ALTER TABLE public.univ_re_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "real_estate_documents_company_access" ON public.univ_re_documents;
DROP POLICY IF EXISTS "re_documents_all_access" ON public.univ_re_documents;
CREATE POLICY "re_documents_all_access" ON public.univ_re_documents
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

ALTER TABLE public.univ_re_leases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "real_estate_leases_company_access" ON public.univ_re_leases;
DROP POLICY IF EXISTS "re_leases_all_access" ON public.univ_re_leases;
CREATE POLICY "re_leases_all_access" ON public.univ_re_leases
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

ALTER TABLE public.univ_re_rent_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "real_estate_rent_payments_company_access" ON public.univ_re_rent_payments;
DROP POLICY IF EXISTS "re_rent_payments_all_access" ON public.univ_re_rent_payments;
CREATE POLICY "re_rent_payments_all_access" ON public.univ_re_rent_payments
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

ALTER TABLE public.univ_re_maintenance_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "real_estate_maintenance_company_access" ON public.univ_re_maintenance_requests;
DROP POLICY IF EXISTS "re_maintenance_requests_all_access" ON public.univ_re_maintenance_requests;
CREATE POLICY "re_maintenance_requests_all_access" ON public.univ_re_maintenance_requests
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

ALTER TABLE public.univ_re_trust_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "re_trust_accounts_company_access" ON public.univ_re_trust_accounts;
DROP POLICY IF EXISTS "re_trust_accounts_all_access" ON public.univ_re_trust_accounts;
CREATE POLICY "re_trust_accounts_all_access" ON public.univ_re_trust_accounts
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

ALTER TABLE public.univ_re_trust_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "re_trust_ledger_company_access" ON public.univ_re_trust_ledger;
DROP POLICY IF EXISTS "re_trust_ledger_all_access" ON public.univ_re_trust_ledger;
CREATE POLICY "re_trust_ledger_all_access" ON public.univ_re_trust_ledger
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

ALTER TABLE public.univ_re_escrow_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "re_escrow_accounts_company_access" ON public.univ_re_escrow_accounts;
DROP POLICY IF EXISTS "re_escrow_accounts_all_access" ON public.univ_re_escrow_accounts;
CREATE POLICY "re_escrow_accounts_all_access" ON public.univ_re_escrow_accounts
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

ALTER TABLE public.univ_re_document_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "re_document_templates_company_access" ON public.univ_re_document_templates;
DROP POLICY IF EXISTS "re_document_templates_all_access" ON public.univ_re_document_templates;
CREATE POLICY "re_document_templates_all_access" ON public.univ_re_document_templates
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

ALTER TABLE public.univ_re_e_signatures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "re_e_signatures_company_access" ON public.univ_re_e_signatures;
DROP POLICY IF EXISTS "re_e_signatures_all_access" ON public.univ_re_e_signatures;
CREATE POLICY "re_e_signatures_all_access" ON public.univ_re_e_signatures
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

ALTER TABLE public.univ_re_counter_offers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "re_counter_offers_company_access" ON public.univ_re_counter_offers;
DROP POLICY IF EXISTS "re_counter_offers_all_access" ON public.univ_re_counter_offers;
CREATE POLICY "re_counter_offers_all_access" ON public.univ_re_counter_offers
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

ALTER TABLE public.univ_re_commission_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "re_commission_rules_company_access" ON public.univ_re_commission_rules;
DROP POLICY IF EXISTS "re_commission_rules_all_access" ON public.univ_re_commission_rules;
CREATE POLICY "re_commission_rules_all_access" ON public.univ_re_commission_rules
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

ALTER TABLE public.univ_re_commission_details ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "re_commission_details_company_access" ON public.univ_re_commission_details;
DROP POLICY IF EXISTS "re_commission_details_all_access" ON public.univ_re_commission_details;
CREATE POLICY "re_commission_details_all_access" ON public.univ_re_commission_details
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

ALTER TABLE public.univ_re_contractors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "re_contractors_company_access" ON public.univ_re_contractors;
DROP POLICY IF EXISTS "re_contractors_all_access" ON public.univ_re_contractors;
CREATE POLICY "re_contractors_all_access" ON public.univ_re_contractors
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

ALTER TABLE public.univ_re_contractor_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "re_contractor_reviews_company_access" ON public.univ_re_contractor_reviews;
DROP POLICY IF EXISTS "re_contractor_reviews_all_access" ON public.univ_re_contractor_reviews;
CREATE POLICY "re_contractor_reviews_all_access" ON public.univ_re_contractor_reviews
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

ALTER TABLE public.univ_re_lease_renewals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "re_lease_renewals_company_access" ON public.univ_re_lease_renewals;
DROP POLICY IF EXISTS "re_lease_renewals_all_access" ON public.univ_re_lease_renewals;
CREATE POLICY "re_lease_renewals_all_access" ON public.univ_re_lease_renewals
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

ALTER TABLE public.univ_re_rent_payment_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "re_rent_payment_schedules_company_access" ON public.univ_re_rent_payment_schedules;
DROP POLICY IF EXISTS "re_rent_payment_schedules_all_access" ON public.univ_re_rent_payment_schedules;
CREATE POLICY "re_rent_payment_schedules_all_access" ON public.univ_re_rent_payment_schedules
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

ALTER TABLE public.univ_re_rent_payment_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "re_rent_payment_history_company_access" ON public.univ_re_rent_payment_history;
DROP POLICY IF EXISTS "re_rent_payment_history_all_access" ON public.univ_re_rent_payment_history;
CREATE POLICY "re_rent_payment_history_all_access" ON public.univ_re_rent_payment_history
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

ALTER TABLE public.univ_re_market_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "re_market_data_company_access" ON public.univ_re_market_data;
DROP POLICY IF EXISTS "re_market_data_all_access" ON public.univ_re_market_data;
CREATE POLICY "re_market_data_all_access" ON public.univ_re_market_data
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

ALTER TABLE public.univ_re_comparable_properties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "re_comparable_properties_company_access" ON public.univ_re_comparable_properties;
DROP POLICY IF EXISTS "re_comparable_properties_all_access" ON public.univ_re_comparable_properties;
CREATE POLICY "re_comparable_properties_all_access" ON public.univ_re_comparable_properties
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

ALTER TABLE public.univ_re_agent_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "re_agent_metrics_company_access" ON public.univ_re_agent_metrics;
DROP POLICY IF EXISTS "re_agent_metrics_all_access" ON public.univ_re_agent_metrics;
CREATE POLICY "re_agent_metrics_all_access" ON public.univ_re_agent_metrics
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

ALTER TABLE public.univ_re_client_scoring ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "re_client_scoring_company_access" ON public.univ_re_client_scoring;
DROP POLICY IF EXISTS "re_client_scoring_all_access" ON public.univ_re_client_scoring;
CREATE POLICY "re_client_scoring_all_access" ON public.univ_re_client_scoring
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

ALTER TABLE public.univ_re_agent_recommendations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "re_agent_recommendations_company_access" ON public.univ_re_agent_recommendations;
DROP POLICY IF EXISTS "re_agent_recommendations_all_access" ON public.univ_re_agent_recommendations;
CREATE POLICY "re_agent_recommendations_all_access" ON public.univ_re_agent_recommendations
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

ALTER TABLE public.univ_re_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "re_audit_log_company_access" ON public.univ_re_audit_log;
DROP POLICY IF EXISTS "re_audit_log_all_access" ON public.univ_re_audit_log;
CREATE POLICY "re_audit_log_all_access" ON public.univ_re_audit_log
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

ALTER TABLE public.univ_re_agentic_conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "re_agentic_conversations_access" ON public.univ_re_agentic_conversations;
CREATE POLICY "re_agentic_conversations_access" ON public.univ_re_agentic_conversations
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- ============================================================
-- SECTION 7: GRANT PERMISSIONS
-- ============================================================

GRANT ALL ON public.univ_pharmacy_drugs TO authenticated, service_role;
GRANT ALL ON public.univ_pharmacy_inventory TO authenticated, service_role;
GRANT ALL ON public.univ_pharmacy_customers TO authenticated, service_role;
GRANT ALL ON public.univ_pharmacy_sales TO authenticated, service_role;
GRANT ALL ON public.univ_pharmacy_sale_items TO authenticated, service_role;
GRANT ALL ON public.univ_pharmacy_prescriptions TO authenticated, service_role;
GRANT ALL ON public.univ_pharmacy_suppliers TO authenticated, service_role;
GRANT ALL ON public.univ_pharmacy_purchase_orders TO authenticated, service_role;
GRANT ALL ON public.univ_pharmacy_insurance_claims TO authenticated, service_role;
GRANT ALL ON public.univ_pharmacy_controlled_substances TO authenticated, service_role;
GRANT ALL ON public.univ_pharmacy_shifts TO authenticated, service_role;
GRANT ALL ON public.univ_pharmacy_reconciliations TO authenticated, service_role;
GRANT ALL ON public.univ_pharmacy_expiry_alerts TO authenticated, service_role;
GRANT ALL ON public.univ_pharmacy_analytics TO authenticated, service_role;
GRANT ALL ON public.univ_pharmacy_audit_log TO authenticated, service_role;

GRANT ALL ON public.univ_re_properties TO authenticated, service_role;
GRANT ALL ON public.univ_re_clients TO authenticated, service_role;
GRANT ALL ON public.univ_re_viewings TO authenticated, service_role;
GRANT ALL ON public.univ_re_offers TO authenticated, service_role;
GRANT ALL ON public.univ_re_transactions TO authenticated, service_role;
GRANT ALL ON public.univ_re_commissions TO authenticated, service_role;
GRANT ALL ON public.univ_re_documents TO authenticated, service_role;
GRANT ALL ON public.univ_re_leases TO authenticated, service_role;
GRANT ALL ON public.univ_re_rent_payments TO authenticated, service_role;
GRANT ALL ON public.univ_re_maintenance_requests TO authenticated, service_role;
GRANT ALL ON public.univ_re_trust_accounts TO authenticated, service_role;
GRANT ALL ON public.univ_re_trust_ledger TO authenticated, service_role;
GRANT ALL ON public.univ_re_escrow_accounts TO authenticated, service_role;
GRANT ALL ON public.univ_re_document_templates TO authenticated, service_role;
GRANT ALL ON public.univ_re_e_signatures TO authenticated, service_role;
GRANT ALL ON public.univ_re_counter_offers TO authenticated, service_role;
GRANT ALL ON public.univ_re_commission_rules TO authenticated, service_role;
GRANT ALL ON public.univ_re_commission_details TO authenticated, service_role;
GRANT ALL ON public.univ_re_contractors TO authenticated, service_role;
GRANT ALL ON public.univ_re_contractor_reviews TO authenticated, service_role;
GRANT ALL ON public.univ_re_lease_renewals TO authenticated, service_role;
GRANT ALL ON public.univ_re_rent_payment_schedules TO authenticated, service_role;
GRANT ALL ON public.univ_re_rent_payment_history TO authenticated, service_role;
GRANT ALL ON public.univ_re_market_data TO authenticated, service_role;
GRANT ALL ON public.univ_re_comparable_properties TO authenticated, service_role;
GRANT ALL ON public.univ_re_agent_metrics TO authenticated, service_role;
GRANT ALL ON public.univ_re_client_scoring TO authenticated, service_role;
GRANT ALL ON public.univ_re_agent_recommendations TO authenticated, service_role;
GRANT ALL ON public.univ_re_audit_log TO authenticated, service_role;
GRANT ALL ON public.univ_re_agentic_conversations TO authenticated, service_role;

-- ============================================================
-- SECTION 8: ADD ALL TABLES TO POWERSYNC PUBLICATION
-- ============================================================

DO $pub$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'univ_pharmacy_drugs','univ_pharmacy_inventory','univ_pharmacy_customers',
    'univ_pharmacy_sales','univ_pharmacy_sale_items','univ_pharmacy_prescriptions',
    'univ_pharmacy_suppliers','univ_pharmacy_purchase_orders','univ_pharmacy_insurance_claims',
    'univ_pharmacy_controlled_substances','univ_pharmacy_shifts','univ_pharmacy_reconciliations',
    'univ_pharmacy_expiry_alerts','univ_pharmacy_analytics','univ_pharmacy_audit_log',
    'univ_re_properties','univ_re_clients','univ_re_viewings','univ_re_offers',
    'univ_re_transactions','univ_re_commissions','univ_re_documents','univ_re_leases',
    'univ_re_rent_payments','univ_re_maintenance_requests','univ_re_trust_accounts',
    'univ_re_trust_ledger','univ_re_escrow_accounts','univ_re_document_templates',
    'univ_re_e_signatures','univ_re_counter_offers','univ_re_commission_rules',
    'univ_re_commission_details','univ_re_contractors','univ_re_contractor_reviews',
    'univ_re_lease_renewals','univ_re_rent_payment_schedules','univ_re_rent_payment_history',
    'univ_re_market_data','univ_re_comparable_properties','univ_re_agent_metrics',
    'univ_re_client_scoring','univ_re_agent_recommendations','univ_re_audit_log',
    'univ_re_agentic_conversations','sync_errors'
  ];
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'powersync') THEN
    FOREACH t IN ARRAY tables LOOP
      BEGIN
        EXECUTE format('ALTER PUBLICATION powersync ADD TABLE public.%I', t);
      EXCEPTION
        WHEN duplicate_object THEN NULL;
        WHEN OTHERS THEN RAISE NOTICE 'Skip % from powersync: %', t, SQLERRM;
      END;
    END LOOP;
    RAISE NOTICE 'PowerSync publication updated';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH t IN ARRAY tables LOOP
      BEGIN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
    END LOOP;
    RAISE NOTICE 'supabase_realtime publication updated';
  END IF;
END $pub$;
