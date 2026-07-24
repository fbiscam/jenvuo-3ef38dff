-- Restrict RLS policies from `public` role to `authenticated` for defense in depth.

DROP POLICY IF EXISTS "Users manage own consent" ON public.cookie_consents;
CREATE POLICY "Users manage own consent" ON public.cookie_consents
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own signal locks" ON public.signal_locks;
CREATE POLICY "Users manage own signal locks" ON public.signal_locks
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own setup links" ON public.trade_setup_links;
CREATE POLICY "own setup links" ON public.trade_setup_links
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own risk settings" ON public.user_risk_settings;
CREATE POLICY "Users manage own risk settings" ON public.user_risk_settings
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);