-- ID-verified Founding members who never received their plan credit get it now (once per Founding period).
SELECT public.release_founding_credit(a.user_id)
FROM public.founding_applications a
WHERE a.document_status = 'verified' AND a.user_id IS NOT NULL
  AND a.status IN ('approved','active');