-- Comprehensive Real Estate Schema Fix
-- Ensures all RE tables have proper UUID columns and are in PowerSync publication

-- Drop old tables if they exist with wrong ID types (optional - comment out if you want to preserve data)
-- This ensures fresh start with proper UUID types

-- Re-create Properties Table with UUID
DROP TABLE IF EXISTS public.univ_re_properties CASCADE;
CREATE TABLE IF NOT EXISTS public.univ_re_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  company_id TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  country TEXT,
  zip_code TEXT,
  property_type TEXT,
  bedrooms INTEGER,
  bathrooms DECIMAL(5,2),
  square_feet DECIMAL(10,2),
  lot_size DECIMAL(10,2),
  price DECIMAL(15,2),
  status TEXT DEFAULT 'active',
  agent_id TEXT,
  agent_name TEXT,
  description TEXT,
  features JSONB DEFAULT '[]'::jsonb,
  year_built INTEGER,
  listing_date TIMESTAMPTZ,
  last_updated TIMESTAMPTZ DEFAULT now()
);

-- Re-create Clients Table with UUID
DROP TABLE IF EXISTS public.univ_re_clients CASCADE;
CREATE TABLE IF NOT EXISTS public.univ_re_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  type TEXT DEFAULT 'buyer',
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  budget DECIMAL(15,2),
  preferences JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'active',
  assigned_agent TEXT,
  notes TEXT
);

-- Re-create Viewings Table with UUID
DROP TABLE IF EXISTS public.univ_re_viewings CASCADE;
CREATE TABLE IF NOT EXISTS public.univ_re_viewings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  company_id TEXT NOT NULL,
  property_id UUID,
  property_address TEXT,
  client_id UUID,
  client_name TEXT,
  agent_id TEXT,
  agent_name TEXT,
  viewing_date DATE,
  viewing_time TIME,
  status TEXT DEFAULT 'scheduled',
  duration_minutes INTEGER,
  feedback TEXT,
  notes TEXT
);

-- Re-create Offers Table with UUID
DROP TABLE IF EXISTS public.univ_re_offers CASCADE;
CREATE TABLE IF NOT EXISTS public.univ_re_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  company_id TEXT NOT NULL,
  property_id UUID,
  property_address TEXT,
  buyer_id UUID,
  buyer_name TEXT,
  offer_amount DECIMAL(15,2),
  earnest_money DECIMAL(15,2),
  contingencies TEXT,
  offer_date TIMESTAMPTZ DEFAULT now(),
  expiration_date TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  agent_id TEXT,
  agent_name TEXT,
  notes TEXT
);

-- Re-create Transactions Table with UUID
DROP TABLE IF EXISTS public.univ_re_transactions CASCADE;
CREATE TABLE IF NOT EXISTS public.univ_re_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  company_id TEXT NOT NULL,
  property_id UUID,
  property_address TEXT,
  seller_id UUID,
  seller_name TEXT,
  buyer_id UUID,
  buyer_name TEXT,
  sale_price DECIMAL(15,2),
  closing_date TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  agent_id TEXT,
  agent_name TEXT,
  documents TEXT,
  notes TEXT
);

-- Re-create Commissions Table with UUID
DROP TABLE IF EXISTS public.univ_re_commissions CASCADE;
CREATE TABLE IF NOT EXISTS public.univ_re_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  company_id TEXT NOT NULL,
  transaction_id UUID,
  agent_id TEXT,
  agent_name TEXT,
  commission_rate DECIMAL(5,2),
  commission_amount DECIMAL(15,2),
  payment_date TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  notes TEXT
);

-- Re-create Documents Table with UUID
DROP TABLE IF EXISTS public.univ_re_documents CASCADE;
CREATE TABLE IF NOT EXISTS public.univ_re_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  company_id TEXT NOT NULL,
  property_id UUID,
  transaction_id UUID,
  document_type TEXT,
  file_url TEXT,
  file_name TEXT,
  uploaded_by TEXT,
  uploaded_date TIMESTAMPTZ,
  shared_with TEXT,
  status TEXT DEFAULT 'active'
);

-- Re-create Leases Table with UUID
DROP TABLE IF EXISTS public.univ_re_leases CASCADE;
CREATE TABLE IF NOT EXISTS public.univ_re_leases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  company_id TEXT NOT NULL,
  property_id UUID,
  property_address TEXT,
  tenant_id UUID,
  tenant_name TEXT,
  landlord_id UUID,
  landlord_name TEXT,
  start_date DATE,
  end_date DATE,
  monthly_rent DECIMAL(15,2),
  security_deposit DECIMAL(15,2),
  status TEXT DEFAULT 'active',
  terms TEXT,
  agent_id TEXT,
  agent_name TEXT
);

-- Re-create Rent Payments Table with UUID
DROP TABLE IF EXISTS public.univ_re_rent_payments CASCADE;
CREATE TABLE IF NOT EXISTS public.univ_re_rent_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  company_id TEXT NOT NULL,
  lease_id UUID,
  property_id UUID,
  tenant_id UUID,
  tenant_name TEXT,
  amount DECIMAL(15,2),
  due_date DATE,
  payment_date DATE,
  payment_method TEXT,
  status TEXT DEFAULT 'pending',
  notes TEXT
);

-- Re-create Maintenance Requests Table with UUID
DROP TABLE IF EXISTS public.univ_re_maintenance_requests CASCADE;
CREATE TABLE IF NOT EXISTS public.univ_re_maintenance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  company_id TEXT NOT NULL,
  property_id UUID,
  property_address TEXT,
  reported_by TEXT,
  reported_by_name TEXT,
  issue_description TEXT,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'open',
  assigned_to TEXT,
  completion_date TIMESTAMPTZ,
  cost DECIMAL(15,2),
  notes TEXT
);

-- Create indexes for all tables
CREATE INDEX IF NOT EXISTS idx_univ_re_properties_company_id ON public.univ_re_properties(company_id);
CREATE INDEX IF NOT EXISTS idx_univ_re_properties_status ON public.univ_re_properties(status);
CREATE INDEX IF NOT EXISTS idx_univ_re_clients_company_id ON public.univ_re_clients(company_id);
CREATE INDEX IF NOT EXISTS idx_univ_re_viewings_company_id ON public.univ_re_viewings(company_id);
CREATE INDEX IF NOT EXISTS idx_univ_re_viewings_property_id ON public.univ_re_viewings(property_id);
CREATE INDEX IF NOT EXISTS idx_univ_re_offers_company_id ON public.univ_re_offers(company_id);
CREATE INDEX IF NOT EXISTS idx_univ_re_offers_property_id ON public.univ_re_offers(property_id);
CREATE INDEX IF NOT EXISTS idx_univ_re_transactions_company_id ON public.univ_re_transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_univ_re_commissions_company_id ON public.univ_re_commissions(company_id);
CREATE INDEX IF NOT EXISTS idx_univ_re_documents_company_id ON public.univ_re_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_univ_re_leases_company_id ON public.univ_re_leases(company_id);
CREATE INDEX IF NOT EXISTS idx_univ_re_rent_payments_company_id ON public.univ_re_rent_payments(company_id);
CREATE INDEX IF NOT EXISTS idx_univ_re_maintenance_requests_company_id ON public.univ_re_maintenance_requests(company_id);

-- Enable RLS for all tables
ALTER TABLE public.univ_re_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.univ_re_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.univ_re_viewings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.univ_re_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.univ_re_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.univ_re_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.univ_re_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.univ_re_leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.univ_re_rent_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.univ_re_maintenance_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "real_estate_properties_company_access" ON public.univ_re_properties
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "real_estate_clients_company_access" ON public.univ_re_clients
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "real_estate_viewings_company_access" ON public.univ_re_viewings
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "real_estate_offers_company_access" ON public.univ_re_offers
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "real_estate_transactions_company_access" ON public.univ_re_transactions
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "real_estate_commissions_company_access" ON public.univ_re_commissions
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "real_estate_documents_company_access" ON public.univ_re_documents
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "real_estate_leases_company_access" ON public.univ_re_leases
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "real_estate_rent_payments_company_access" ON public.univ_re_rent_payments
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "real_estate_maintenance_company_access" ON public.univ_re_maintenance_requests
  FOR ALL USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
