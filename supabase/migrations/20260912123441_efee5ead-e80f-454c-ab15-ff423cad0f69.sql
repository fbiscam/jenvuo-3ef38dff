-- 1. Tighten community media read policy
DROP POLICY IF EXISTS community_media_read ON storage.objects;
CREATE POLICY community_media_read ON storage.objects
FOR SELECT
USING (
  bucket_id = 'community-media'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR EXISTS (
      SELECT 1
      FROM public.community_posts p,
           LATERAL unnest(p.media_urls) u(u)
      WHERE p.deleted_at IS NULL
        AND (storage.foldername(objects.name))[1] = (p.author_id)::text
        AND (
          u.u = objects.name
          OR u.u = '/community-media/' || objects.name
          OR u.u LIKE '%/community-media/' || objects.name
        )
        AND NOT EXISTS (
          SELECT 1 FROM public.community_blocks b
          WHERE (b.blocker_id = auth.uid() AND b.blocked_id = p.author_id)
             OR (b.blocker_id = p.author_id AND b.blocked_id = auth.uid())
        )
    )
  )
);

-- 2. Founding documents: require the application to already belong to the caller
DROP POLICY IF EXISTS "Users can insert own documents" ON public.founding_documents;
CREATE POLICY "Users can insert own documents" ON public.founding_documents
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.founding_applications fa
    WHERE fa.id = founding_documents.application_id
      AND fa.user_id = auth.uid()
  )
);

-- 3. Mail messages: no post-delivery tampering
DROP POLICY IF EXISTS "Sender can update own messages" ON public.mail_messages;
REVOKE UPDATE ON public.mail_messages FROM authenticated;