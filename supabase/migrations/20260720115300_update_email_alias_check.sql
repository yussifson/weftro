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
  
  -- Remove ALL non-alphanumeric characters from the local part
  base_email := regexp_replace(base_email, '[^a-z0-9]', '', 'g');
  
  normalized := base_email || '@' || domain;

  -- Check if there's any user in auth.users whose normalized email matches
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE regexp_replace(split_part(split_part(lower(email), '@', 1), '+', 1), '[^a-z0-9]', '', 'g') || '@' || split_part(lower(email), '@', 2) = normalized
  ) INTO exists_flag;

  RETURN exists_flag;
END;
$$;
