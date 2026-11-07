ALTER TABLE public.founding_applications DROP CONSTRAINT IF EXISTS founding_applications_document_status_check;
ALTER TABLE public.founding_applications ADD CONSTRAINT founding_applications_document_status_check
  CHECK (document_status = ANY (ARRAY['not_submitted','received','pending','verified','rejected','needs_info']));

-- Members can no longer delete, read or register their submitted ID files directly; the server does it.
DROP POLICY IF EXISTS "Users can delete own documents" ON public.founding_documents;
CREATE POLICY "Admins can delete documents" ON public.founding_documents
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "Users can view own documents" ON public.founding_documents;
CREATE POLICY "Admins can view documents" ON public.founding_documents
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "Users can insert own documents" ON public.founding_documents;

DROP POLICY IF EXISTS "Users delete own founding docs" ON storage.objects;
CREATE POLICY "Admins delete founding docs" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'founding-docs' AND public.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "Users read own founding docs" ON storage.objects;
CREATE POLICY "Admins read founding docs" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'founding-docs' AND public.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "Users upload own founding docs" ON storage.objects;
CREATE POLICY "Users upload own founding docs" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'founding-docs'
    AND (storage.foldername(name))[1] = (auth.uid())::text
    AND EXISTS (
      SELECT 1 FROM public.founding_applications fa
      WHERE fa.user_id = auth.uid()
        AND fa.document_status IN ('not_submitted','rejected','needs_info')
    )
  );