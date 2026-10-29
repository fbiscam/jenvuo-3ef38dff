CREATE OR REPLACE FUNCTION public.is_founding_member(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT (
    auth.uid() IS NULL
    OR auth.uid() = _user_id
    OR public.has_role(auth.uid(), 'admin')
  ) AND EXISTS (
    SELECT 1 FROM public.founding_applications fa
     WHERE fa.status IN ('approved','active','graduated','verified')
       AND (fa.user_id = _user_id OR lower(fa.email) = (SELECT lower(email) FROM auth.users WHERE id = _user_id))
  );
$function$;
REVOKE ALL ON FUNCTION public.is_founding_member(uuid) FROM PUBLIC, anon;