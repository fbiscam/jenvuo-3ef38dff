REVOKE EXECUTE ON FUNCTION public.mail_get_badges(text[]) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mail_directory_search(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mail_get_badges(text[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.mail_directory_search(text) TO service_role;