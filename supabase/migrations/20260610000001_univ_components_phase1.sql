-- ==========================================
-- Phase 1: Universal Components Data Layer
-- Execute this script in your Supabase SQL Editor
-- ==========================================

-- 1. CRM Leads (univ_crm_leads)
CREATE TABLE IF NOT EXISTS public.univ_crm_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    status TEXT DEFAULT 'New', -- New, Contacted, Qualified, Proposal, Won, Lost
    value NUMERIC DEFAULT 0,
    source TEXT,
    notes TEXT,
    assigned_to UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.univ_crm_leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their company's CRM leads" ON public.univ_crm_leads;
CREATE POLICY "Users can manage their company's CRM leads" 
ON public.univ_crm_leads FOR ALL 
USING (auth.uid() IS NOT NULL);

-- 2. Invoices (univ_invoices)
CREATE TABLE IF NOT EXISTS public.univ_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    client_name TEXT NOT NULL,
    client_email TEXT,
    invoice_number TEXT NOT NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    status TEXT DEFAULT 'Draft', -- Draft, Sent, Paid, Overdue, Cancelled
    due_date DATE,
    items JSONB DEFAULT '[]'::jsonb, -- Array of line items
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.univ_invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their company's invoices" ON public.univ_invoices;
CREATE POLICY "Users can manage their company's invoices" 
ON public.univ_invoices FOR ALL 
USING (auth.uid() IS NOT NULL);

-- 3. Appointments (univ_appointments)
CREATE TABLE IF NOT EXISTS public.univ_appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    attendee_name TEXT NOT NULL,
    attendee_email TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'Scheduled', -- Scheduled, Completed, Cancelled, No-Show
    location TEXT,
    assigned_staff UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.univ_appointments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their company's appointments" ON public.univ_appointments;
CREATE POLICY "Users can manage their company's appointments" 
ON public.univ_appointments FOR ALL 
USING (auth.uid() IS NOT NULL);

-- 4. Inventory (univ_inventory)
CREATE TABLE IF NOT EXISTS public.univ_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    item_name TEXT NOT NULL,
    sku TEXT,
    category TEXT,
    quantity INTEGER DEFAULT 0,
    unit_price NUMERIC DEFAULT 0,
    supplier TEXT,
    status TEXT DEFAULT 'In Stock', -- In Stock, Low Stock, Out of Stock
    reorder_level INTEGER DEFAULT 5,
    location TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.univ_inventory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their company's inventory" ON public.univ_inventory;
CREATE POLICY "Users can manage their company's inventory" 
ON public.univ_inventory FOR ALL 
USING (auth.uid() IS NOT NULL);

-- 5. HR Employees (univ_hr_employees)
CREATE TABLE IF NOT EXISTS public.univ_hr_employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    department TEXT,
    role_title TEXT,
    status TEXT DEFAULT 'Active', -- Active, On Leave, Terminated, Onboarding
    hire_date DATE,
    salary NUMERIC,
    manager_id UUID,
    user_id UUID, -- If they have an account
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.univ_hr_employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their company's HR employees" ON public.univ_hr_employees;
CREATE POLICY "Users can manage their company's HR employees" 
ON public.univ_hr_employees FOR ALL 
USING (auth.uid() IS NOT NULL);

-- Add triggers to auto-update updated_at for all
CREATE OR REPLACE FUNCTION update_univ_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_univ_crm_leads_modtime ON public.univ_crm_leads;
CREATE TRIGGER update_univ_crm_leads_modtime BEFORE UPDATE ON public.univ_crm_leads FOR EACH ROW EXECUTE PROCEDURE update_univ_updated_at_column();
DROP TRIGGER IF EXISTS update_univ_invoices_modtime ON public.univ_invoices;
CREATE TRIGGER update_univ_invoices_modtime BEFORE UPDATE ON public.univ_invoices FOR EACH ROW EXECUTE PROCEDURE update_univ_updated_at_column();
DROP TRIGGER IF EXISTS update_univ_appointments_modtime ON public.univ_appointments;
CREATE TRIGGER update_univ_appointments_modtime BEFORE UPDATE ON public.univ_appointments FOR EACH ROW EXECUTE PROCEDURE update_univ_updated_at_column();
DROP TRIGGER IF EXISTS update_univ_inventory_modtime ON public.univ_inventory;
CREATE TRIGGER update_univ_inventory_modtime BEFORE UPDATE ON public.univ_inventory FOR EACH ROW EXECUTE PROCEDURE update_univ_updated_at_column();
DROP TRIGGER IF EXISTS update_univ_hr_employees_modtime ON public.univ_hr_employees;
CREATE TRIGGER update_univ_hr_employees_modtime BEFORE UPDATE ON public.univ_hr_employees FOR EACH ROW EXECUTE PROCEDURE update_univ_updated_at_column();
