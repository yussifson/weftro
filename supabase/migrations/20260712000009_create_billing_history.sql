-- Migration: Create clipad_billing_history table
-- It stores receipt details when user upgrades or when admin upgrades a user.

CREATE TABLE IF NOT EXISTS public.clipad_billing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  receipt_number TEXT UNIQUE NOT NULL,
  amount_in_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'GHS',
  plan_id TEXT NOT NULL,
  is_admin_assigned BOOLEAN DEFAULT false,
  reference TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.clipad_billing_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Billing history access" ON public.clipad_billing_history;
CREATE POLICY "Billing history access" ON public.clipad_billing_history
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
    )
    OR auth.role() = 'service_role'
  );

GRANT ALL ON public.clipad_billing_history TO authenticated, service_role;

-- We want to capture when `company_subscriptions` is updated with a PAID plan
-- and generate a receipt automatically.

CREATE OR REPLACE FUNCTION generate_receipt_number(plan_name TEXT)
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER := 0;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN 'CLIP-' || result || '-' || upper(substring(plan_name from 1 for 3));
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_billing_receipt()
RETURNS TRIGGER AS $$
DECLARE
  v_receipt_number TEXT;
  v_amount INTEGER := 0;
  v_is_admin BOOLEAN := false;
BEGIN
  -- Only care about active, paid plans
  IF NEW.status = 'active' AND NEW.plan_id != 'free' THEN
    
    -- If it's an insert OR the plan changed from something else
    IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND NEW.plan_id IS DISTINCT FROM OLD.plan_id) THEN
      
      -- Determine if it's admin assigned based on lack of paystack customer code
      IF NEW.paystack_customer_code IS NULL OR NEW.paystack_customer_code = '' THEN
        v_is_admin := true;
      END IF;

      -- Set default amounts based on plan
      IF NEW.plan_id = 'pro' THEN
        v_amount := 10500; -- 105 GHS
      ELSIF NEW.plan_id = 'enterprise' THEN
        v_amount := 45000; -- 450 GHS
      END IF;

      v_receipt_number := generate_receipt_number(NEW.plan_id);

      INSERT INTO public.clipad_billing_history (
        company_id,
        receipt_number,
        amount_in_cents,
        currency,
        plan_id,
        is_admin_assigned,
        reference
      ) VALUES (
        NEW.company_id,
        v_receipt_number,
        v_amount,
        'GHS',
        NEW.plan_id,
        v_is_admin,
        NEW.paystack_customer_code
      ) ON CONFLICT (receipt_number) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_company_subscription_paid ON public.company_subscriptions;
CREATE TRIGGER on_company_subscription_paid
  AFTER INSERT OR UPDATE ON public.company_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_billing_receipt();
