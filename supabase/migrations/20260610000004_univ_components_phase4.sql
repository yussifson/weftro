-- ==========================================
-- Phase 4: Business & HR Expansions Data Layer
-- Execute this script in your Supabase SQL Editor
-- ==========================================

-- 6. Contacts (univ_contacts)
CREATE TABLE IF NOT EXISTS public.univ_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    organization TEXT,
    type TEXT DEFAULT 'Customer', -- Customer, Vendor, Partner
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.univ_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their company's contacts" ON public.univ_contacts;
CREATE POLICY "Users can manage their company's contacts" ON public.univ_contacts FOR ALL USING (auth.uid() IS NOT NULL);

-- 7. Payments (univ_payments)
CREATE TABLE IF NOT EXISTS public.univ_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'USD',
    method TEXT DEFAULT 'Credit Card',
    status TEXT DEFAULT 'Completed', -- Pending, Completed, Failed, Refunded
    reference_id TEXT,
    customer_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.univ_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their company's payments" ON public.univ_payments;
CREATE POLICY "Users can manage their company's payments" ON public.univ_payments FOR ALL USING (auth.uid() IS NOT NULL);

-- 8. Subscriptions (univ_subscriptions)
CREATE TABLE IF NOT EXISTS public.univ_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    plan_name TEXT NOT NULL,
    customer_name TEXT,
    status TEXT DEFAULT 'Active', -- Active, Canceled, Past Due
    billing_cycle TEXT DEFAULT 'Monthly',
    amount NUMERIC NOT NULL,
    next_billing_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.univ_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their company's subscriptions" ON public.univ_subscriptions;
DROP POLICY IF EXISTS "Users can manage their company's subscriptions" ON public.univ_subscriptions;
DROP POLICY IF EXISTS "Users can manage their company's subscriptions" ON public.univ_subscriptions;
CREATE POLICY "Users can manage their company's subscriptions" ON public.univ_subscriptions FOR ALL USING (auth.uid() IS NOT NULL);

-- 9. Assets (univ_assets)
CREATE TABLE IF NOT EXISTS public.univ_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    name TEXT NOT NULL,
    category TEXT, -- Equipment, Vehicle, Building
    status TEXT DEFAULT 'Active', -- Active, Under Maintenance, Retired
    purchase_date DATE,
    purchase_value NUMERIC,
    assigned_to UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.univ_assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their company's assets" ON public.univ_assets;
CREATE POLICY "Users can manage their company's assets" ON public.univ_assets FOR ALL USING (auth.uid() IS NOT NULL);

-- 10. Procurement (univ_procurement)
CREATE TABLE IF NOT EXISTS public.univ_procurement (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    po_number TEXT NOT NULL,
    supplier TEXT NOT NULL,
    total_amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'Pending', -- Pending, Approved, Received, Canceled
    order_date DATE,
    expected_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.univ_procurement ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their company's procurement" ON public.univ_procurement;
CREATE POLICY "Users can manage their company's procurement" ON public.univ_procurement FOR ALL USING (auth.uid() IS NOT NULL);

-- 11. POS (univ_pos)
CREATE TABLE IF NOT EXISTS public.univ_pos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    receipt_number TEXT NOT NULL,
    total_amount NUMERIC NOT NULL,
    payment_method TEXT,
    cashier_id UUID,
    items JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.univ_pos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their company's pos" ON public.univ_pos;
CREATE POLICY "Users can manage their company's pos" ON public.univ_pos FOR ALL USING (auth.uid() IS NOT NULL);

-- 12. Attendance (univ_attendance)
CREATE TABLE IF NOT EXISTS public.univ_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    date DATE NOT NULL,
    check_in TIMESTAMPTZ,
    check_out TIMESTAMPTZ,
    status TEXT DEFAULT 'Present', -- Present, Absent, Half Day, Late
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.univ_attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their company's attendance" ON public.univ_attendance;
CREATE POLICY "Users can manage their company's attendance" ON public.univ_attendance FOR ALL USING (auth.uid() IS NOT NULL);

-- 13. Payroll (univ_payroll)
CREATE TABLE IF NOT EXISTS public.univ_payroll (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    base_salary NUMERIC NOT NULL,
    bonuses NUMERIC DEFAULT 0,
    deductions NUMERIC DEFAULT 0,
    net_pay NUMERIC NOT NULL,
    status TEXT DEFAULT 'Draft', -- Draft, Processed, Paid
    payment_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.univ_payroll ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their company's payroll" ON public.univ_payroll;
CREATE POLICY "Users can manage their company's payroll" ON public.univ_payroll FOR ALL USING (auth.uid() IS NOT NULL);

-- 14. Recruitment (univ_recruitment)
CREATE TABLE IF NOT EXISTS public.univ_recruitment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    job_title TEXT NOT NULL,
    applicant_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    stage TEXT DEFAULT 'Applied', -- Applied, Interviewing, Offered, Rejected, Hired
    resume_url TEXT,
    rating INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.univ_recruitment ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their company's recruitment" ON public.univ_recruitment;
CREATE POLICY "Users can manage their company's recruitment" ON public.univ_recruitment FOR ALL USING (auth.uid() IS NOT NULL);

-- 15. Leave Management (univ_leave_management)
CREATE TABLE IF NOT EXISTS public.univ_leave_management (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    leave_type TEXT NOT NULL, -- Annual, Sick, Maternity, Unpaid
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT DEFAULT 'Pending', -- Pending, Approved, Rejected
    reason TEXT,
    approved_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.univ_leave_management ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their company's leaves" ON public.univ_leave_management;
CREATE POLICY "Users can manage their company's leaves" ON public.univ_leave_management FOR ALL USING (auth.uid() IS NOT NULL);

-- Add triggers to auto-update updated_at for all Phase 4 tables
DROP TRIGGER IF EXISTS update_univ_contacts_modtime ON public.univ_contacts;
CREATE TRIGGER update_univ_contacts_modtime BEFORE UPDATE ON public.univ_contacts FOR EACH ROW EXECUTE PROCEDURE update_univ_updated_at_column();

DROP TRIGGER IF EXISTS update_univ_payments_modtime ON public.univ_payments;
CREATE TRIGGER update_univ_payments_modtime BEFORE UPDATE ON public.univ_payments FOR EACH ROW EXECUTE PROCEDURE update_univ_updated_at_column();

DROP TRIGGER IF EXISTS update_univ_subscriptions_modtime ON public.univ_subscriptions;
CREATE TRIGGER update_univ_subscriptions_modtime BEFORE UPDATE ON public.univ_subscriptions FOR EACH ROW EXECUTE PROCEDURE update_univ_updated_at_column();

DROP TRIGGER IF EXISTS update_univ_assets_modtime ON public.univ_assets;
CREATE TRIGGER update_univ_assets_modtime BEFORE UPDATE ON public.univ_assets FOR EACH ROW EXECUTE PROCEDURE update_univ_updated_at_column();

DROP TRIGGER IF EXISTS update_univ_procurement_modtime ON public.univ_procurement;
CREATE TRIGGER update_univ_procurement_modtime BEFORE UPDATE ON public.univ_procurement FOR EACH ROW EXECUTE PROCEDURE update_univ_updated_at_column();

DROP TRIGGER IF EXISTS update_univ_pos_modtime ON public.univ_pos;
CREATE TRIGGER update_univ_pos_modtime BEFORE UPDATE ON public.univ_pos FOR EACH ROW EXECUTE PROCEDURE update_univ_updated_at_column();

DROP TRIGGER IF EXISTS update_univ_attendance_modtime ON public.univ_attendance;
CREATE TRIGGER update_univ_attendance_modtime BEFORE UPDATE ON public.univ_attendance FOR EACH ROW EXECUTE PROCEDURE update_univ_updated_at_column();

DROP TRIGGER IF EXISTS update_univ_payroll_modtime ON public.univ_payroll;
CREATE TRIGGER update_univ_payroll_modtime BEFORE UPDATE ON public.univ_payroll FOR EACH ROW EXECUTE PROCEDURE update_univ_updated_at_column();

DROP TRIGGER IF EXISTS update_univ_recruitment_modtime ON public.univ_recruitment;
CREATE TRIGGER update_univ_recruitment_modtime BEFORE UPDATE ON public.univ_recruitment FOR EACH ROW EXECUTE PROCEDURE update_univ_updated_at_column();

DROP TRIGGER IF EXISTS update_univ_leave_management_modtime ON public.univ_leave_management;
CREATE TRIGGER update_univ_leave_management_modtime BEFORE UPDATE ON public.univ_leave_management FOR EACH ROW EXECUTE PROCEDURE update_univ_updated_at_column();
