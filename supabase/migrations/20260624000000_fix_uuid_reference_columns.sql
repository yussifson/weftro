-- Fix UUID reference columns that should be TEXT
-- These columns store references to other records but don't need to be strict UUIDs
-- Users often reference by property address or client name, not by UUID

-- Viewings table
ALTER TABLE public.univ_re_viewings 
  ALTER COLUMN property_id SET DATA TYPE TEXT,
  ALTER COLUMN client_id SET DATA TYPE TEXT,
  ALTER COLUMN agent_id SET DATA TYPE TEXT;

-- Offers table  
ALTER TABLE public.univ_re_offers
  ALTER COLUMN property_id SET DATA TYPE TEXT,
  ALTER COLUMN buyer_id SET DATA TYPE TEXT,
  ALTER COLUMN agent_id SET DATA TYPE TEXT;

-- Transactions table
ALTER TABLE public.univ_re_transactions
  ALTER COLUMN property_id SET DATA TYPE TEXT,
  ALTER COLUMN seller_id SET DATA TYPE TEXT,
  ALTER COLUMN buyer_id SET DATA TYPE TEXT,
  ALTER COLUMN agent_id SET DATA TYPE TEXT;

-- Commissions table (transaction_id, no property_id)
ALTER TABLE public.univ_re_commissions
  ALTER COLUMN transaction_id SET DATA TYPE TEXT,
  ALTER COLUMN agent_id SET DATA TYPE TEXT;

-- Leases table
ALTER TABLE public.univ_re_leases
  ALTER COLUMN property_id SET DATA TYPE TEXT,
  ALTER COLUMN tenant_id SET DATA TYPE TEXT,
  ALTER COLUMN landlord_id SET DATA TYPE TEXT,
  ALTER COLUMN agent_id SET DATA TYPE TEXT;

-- Rent Payments table
ALTER TABLE public.univ_re_rent_payments
  ALTER COLUMN property_id SET DATA TYPE TEXT,
  ALTER COLUMN lease_id SET DATA TYPE TEXT,
  ALTER COLUMN tenant_id SET DATA TYPE TEXT;

-- Maintenance Requests table
ALTER TABLE public.univ_re_maintenance_requests
  ALTER COLUMN property_id SET DATA TYPE TEXT;
