CREATE OR REPLACE FUNCTION public.check_email_alias_exists(input_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  normalized TEXT;
  base_email TEXT;
  domain TEXT;
  exists_flag BOOLEAN;
BEGIN
  -- Convert input to lowercase
  input_email := lower(input_email);
  
  -- Split email into local part and domain
  base_email := split_part(input_email, '@', 1);
  domain := split_part(input_email, '@', 2);
  
  -- Remove everything after + in the local part
  base_email := split_part(base_email, '+', 1);
  
  -- Remove dots from the local part
  base_email := replace(base_email, '.', '');
  
  normalized := base_email || '@' || domain;

  -- Check if there's any user in auth.users whose normalized email matches
  -- Note: We must normalize the auth.users email the same way
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE replace(split_part(split_part(lower(email), '@', 1), '+', 1), '.', '') || '@' || split_part(lower(email), '@', 2) = normalized
  ) INTO exists_flag;

  RETURN exists_flag;
END;
$$;
