CREATE OR REPLACE FUNCTION public.get_user_workspaces_by_email(lookup_email TEXT)
RETURNS TABLE (
  company_id UUID,
  company_name TEXT,
  salted_email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as company_id,
    c.name as company_name,
    p.email as salted_email
  FROM public.profiles p
  JOIN public.companies c ON p.company_id::text = c.id::text
  WHERE 
    p.email = lookup_email
    OR p.email LIKE (split_part(lookup_email, '@', 1) || '+firm%@' || split_part(lookup_email, '@', 2));
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_workspaces_by_email(TEXT) TO anon, authenticated, service_role;

