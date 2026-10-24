CREATE TABLE public.mt5_licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  license_key text NOT NULL UNIQUE,
  mt5_account text,
  plan_id text NOT NULL DEFAULT 'pro',
  revoked_at timestamptz,
  last_validated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX mt5_licenses_user_idx ON public.mt5_licenses(user_id);
GRANT SELECT ON public.mt5_licenses TO authenticated;
GRANT ALL ON public.mt5_licenses TO service_role;
ALTER TABLE public.mt5_licenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own licenses" ON public.mt5_licenses FOR SELECT TO authenticated USING (auth.uid() = user_id);