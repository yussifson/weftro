ALTER TABLE public.univ_referrals ADD COLUMN IF NOT EXISTS patient_id TEXT;
ALTER TABLE public.univ_referrals ADD COLUMN IF NOT EXISTS referring_doctor TEXT;
ALTER TABLE public.univ_referrals ADD COLUMN IF NOT EXISTS referred_to TEXT;
ALTER TABLE public.univ_referrals ADD COLUMN IF NOT EXISTS specialty TEXT;
ALTER TABLE public.univ_referrals ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE public.univ_referrals ADD COLUMN IF NOT EXISTS referral_date TEXT;
ALTER TABLE public.univ_referrals ADD COLUMN IF NOT EXISTS status TEXT;
