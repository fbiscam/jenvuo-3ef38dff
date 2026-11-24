DROP POLICY IF EXISTS posts_insert_own ON public.community_posts;
CREATE POLICY posts_insert_own ON public.community_posts FOR INSERT TO authenticated WITH CHECK (
  author_id = auth.uid() AND like_count = 0 AND reply_count = 0 AND repost_count = 0 AND bookmark_count = 0 AND view_count = 0
);
REVOKE EXECUTE ON FUNCTION public.log_error(text,text,text,text,text,text,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_error(text,text,text,text,text,text,text,jsonb) TO service_role;