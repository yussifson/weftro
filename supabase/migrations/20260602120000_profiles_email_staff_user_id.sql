-- Add email to profiles for chat/lookup; link staff to auth users when invited
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

ALTER TABLE public.staff_records ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_company_email ON public.profiles (company_id, email);
CREATE INDEX IF NOT EXISTS idx_staff_records_user_id ON public.staff_records (user_id);

-- Backfill profile emails from auth.users where possible
UPDATE public.profiles p
SET email = lower(u.email)
FROM auth.users u
WHERE p.id = u.id AND (p.email IS NULL OR p.email = '');
