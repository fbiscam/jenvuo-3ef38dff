REVOKE UPDATE ON public.community_posts FROM authenticated, anon;
GRANT UPDATE (body, media_urls, cashtags, attached_signal_id, deleted_at, updated_at) ON public.community_posts TO authenticated;