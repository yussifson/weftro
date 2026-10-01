CREATE OR REPLACE FUNCTION public.check_invite_alias_collision(input_email TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  normalized TEXT;
  base_email TEXT;
  domain TEXT;
  exact_match BOOLEAN := false;
  alias_collision BOOLEAN := false;
BEGIN
  -- Convert input to lowercase
  input_email := lower(input_email);
  
  -- 1. Check for exact match first
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE lower(email) = input_email
  ) INTO exact_match;

  -- 2. Check for alias collision
  -- Split email into local part and domain
  base_email := split_part(input_email, '@', 1);
  domain := split_part(input_email, '@', 2);
  
  -- Remove everything after + in the local part
  base_email := split_part(base_email, '+', 1);
  
  -- Remove ALL non-alphanumeric characters from the local part
  base_email := regexp_replace(base_email, '[^a-z0-9]', '', 'g');
  
  normalized := base_email || '@' || domain;

  -- Check if there's any user in auth.users whose normalized email matches the input's normalized email
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE regexp_replace(split_part(split_part(lower(email), '@', 1), '+', 1), '[^a-z0-9]', '', 'g') || '@' || split_part(lower(email), '@', 2) = normalized
  ) INTO alias_collision;

  RETURN jsonb_build_object(
    'exactMatch', exact_match,
    'aliasCollision', alias_collision
  );
END;
$$;
