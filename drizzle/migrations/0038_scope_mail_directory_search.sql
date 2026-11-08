-- Mail directory search is scoped to the caller: their own addresses and people they have
-- exchanged mail with. A full exact address can still be confirmed (address only, no name),
-- so the directory can no longer be browsed by partial queries.
CREATE OR REPLACE FUNCTION public.mail_directory_search(_q text)
 RETURNS TABLE(address text, full_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH me AS (SELECT auth.uid() AS uid),
  q AS (SELECT lower(trim(coalesce(_q, ''))) AS v),
  contacts AS (
    SELECT m.recipient_id AS uid FROM public.mail_messages m, me WHERE m.sender_id = me.uid
    UNION
    SELECT m.sender_id FROM public.mail_messages m, me WHERE m.recipient_id = me.uid
    UNION
    SELECT me.uid FROM me
  ),
  scoped AS (
    SELECT ma.address, p.full_name
    FROM public.mail_addresses ma
    JOIN contacts c ON c.uid = ma.user_id
    LEFT JOIN public.profiles p ON p.id = ma.user_id, q
    WHERE length(q.v) >= 2
      AND (ma.address ILIKE '%' || q.v || '%' OR coalesce(p.full_name, '') ILIKE '%' || q.v || '%')
  ),
  exact AS (
    SELECT ma.address, NULL::text AS full_name
    FROM public.mail_addresses ma, q
    WHERE ma.address = q.v
  )
  SELECT s.address, max(s.full_name) AS full_name
  FROM (SELECT * FROM scoped UNION ALL SELECT * FROM exact) s, me
  WHERE me.uid IS NOT NULL
  GROUP BY s.address
  ORDER BY s.address
  LIMIT 20;
$function$;

REVOKE EXECUTE ON FUNCTION public.mail_directory_search(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mail_directory_search(text) TO authenticated;