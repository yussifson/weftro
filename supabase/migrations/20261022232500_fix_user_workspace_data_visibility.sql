-- Data Visibility & Profile Workspace Alignment Fix
-- Ensures users with invalid/deprecated company_ids or orphaned profile mappings are realigned to their primary company workspace.

-- 1. Realign specified team members to Optavel Technologies
UPDATE public.profiles
SET company_id = 'ae9b333e-138a-48c3-9c51-97ad8e7e9999',
    company_name = 'Optavel Technologies'
WHERE email = 'yussifabduljalil641@gmail.com'
  AND company_id != 'ae9b333e-138a-48c3-9c51-97ad8e7e9999';

UPDATE public.profiles
SET company_id = 'ae9b333e-138a-48c3-9c51-97ad8e7e9999',
    company_name = 'Optavel Technologies',
    role = 'Support'
WHERE email = 'intern.hakeem@optavel.com'
  AND company_id != 'ae9b333e-138a-48c3-9c51-97ad8e7e9999';

-- 2. Remove orphaned duplicate profiles without a matching auth.users record
DELETE FROM public.profiles p
WHERE p.email = 'intern.hakeem@optavel.com'
  AND NOT EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = p.id
  );
