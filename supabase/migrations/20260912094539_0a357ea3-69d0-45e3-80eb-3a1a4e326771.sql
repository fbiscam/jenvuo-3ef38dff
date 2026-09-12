GRANT SELECT ON public.founding_applications TO authenticated;

DROP POLICY IF EXISTS "Users can view their own founding application" ON public.founding_applications;
CREATE POLICY "Users can view their own founding application"
ON public.founding_applications
FOR SELECT
TO authenticated
USING (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));