-- Create Billing & Subscription Tables

-- 1. Subscription Plans
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    paystack_plan_code TEXT UNIQUE,
    price_monthly NUMERIC DEFAULT 0,
    price_yearly NUMERIC DEFAULT 0,
    features JSONB DEFAULT '{}'::jsonb,
    limits JSONB DEFAULT '{"ai_credits_monthly": 0, "users": 1, "storage_gb": 1}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Company Subscriptions
CREATE TABLE IF NOT EXISTS public.company_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE UNIQUE NOT NULL,
    plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
    paystack_customer_code TEXT,
    paystack_subscription_code TEXT,
    status TEXT DEFAULT 'trialing', -- active, past_due, canceled, trialing
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Usage Metrics
CREATE TABLE IF NOT EXISTS public.usage_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    metric_name TEXT NOT NULL, -- e.g., 'ai_credits', 'storage_gb', 'users'
    used_amount NUMERIC DEFAULT 0,
    period_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    period_end TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, metric_name, period_start)
);

-- 4. Transaction & Invoice Logs
CREATE TABLE IF NOT EXISTS public.billing_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    paystack_reference TEXT UNIQUE,
    amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'USD',
    status TEXT DEFAULT 'pending', -- success, failed, pending
    transaction_type TEXT DEFAULT 'subscription', -- subscription, one_off, refund
    description TEXT,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies

-- Subscription Plans (Read by all authenticated, Write by super_admin)
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Plans are viewable by everyone" ON public.subscription_plans FOR SELECT USING (true);
CREATE POLICY "Plans insertable by super admin" ON public.subscription_plans FOR INSERT WITH CHECK (auth.uid() IN (SELECT id::uuid FROM profiles WHERE role = 'super_admin'));
CREATE POLICY "Plans updatable by super admin" ON public.subscription_plans FOR UPDATE USING (auth.uid() IN (SELECT id::uuid FROM profiles WHERE role = 'super_admin'));

-- Company Subscriptions (Read by company members, Write by super_admin / webhooks)
ALTER TABLE public.company_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their company subscription" ON public.company_subscriptions FOR SELECT USING (
    company_id IN (SELECT company_id::uuid FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "Super admins can manage all subscriptions" ON public.company_subscriptions FOR ALL USING (
    auth.uid() IN (SELECT id::uuid FROM profiles WHERE role = 'super_admin')
);

-- Usage Metrics (Read by company members, Write by system/functions)
ALTER TABLE public.usage_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their usage" ON public.usage_metrics FOR SELECT USING (
    company_id IN (SELECT company_id::uuid FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "Users can update their usage" ON public.usage_metrics FOR UPDATE USING (
    company_id IN (SELECT company_id::uuid FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "Users can insert their usage" ON public.usage_metrics FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id::uuid FROM profiles WHERE id = auth.uid())
);

-- Billing Transactions
ALTER TABLE public.billing_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their company transactions" ON public.billing_transactions FOR SELECT USING (
    company_id IN (SELECT company_id::uuid FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "Super admins can manage all transactions" ON public.billing_transactions FOR ALL USING (
    auth.uid() IN (SELECT id::uuid FROM profiles WHERE role = 'super_admin')
);

-- Function to handle new company creation trigger (give them default plan/trial)
-- We assume there's a trigger for company creation. If not, we handle via application logic.
-- For now, application logic or an edge function will handle this.
