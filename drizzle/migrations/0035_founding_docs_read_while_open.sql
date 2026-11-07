-- Upload needs to read back the new object; allow only while the member's documents are still open for upload.
CREATE POLICY "Users read own founding docs while open" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'founding-docs'
    AND (storage.foldername(name))[1] = (auth.uid())::text
    AND EXISTS (
      SELECT 1 FROM public.founding_applications fa
      WHERE fa.user_id = auth.uid()
        AND fa.document_status IN ('not_submitted','rejected','needs_info')
    )
  );