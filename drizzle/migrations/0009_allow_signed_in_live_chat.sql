-- Live chat works for guests (anon) already; signed-in visitors run as
-- "authenticated" and need the same EXECUTE rights. Each function is scoped
-- by the caller's own session token, so this exposes nothing extra.
GRANT EXECUTE ON FUNCTION public.create_chat_session(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.post_guest_message(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_guest_messages(uuid) TO authenticated;