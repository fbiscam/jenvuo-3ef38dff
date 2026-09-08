CREATE TABLE public.extension_api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Extension key',
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX extension_api_keys_user_idx ON public.extension_api_keys(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.extension_api_keys TO authenticated;
GRANT ALL ON public.extension_api_keys TO service_role;
ALTER TABLE public.extension_api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own extension keys" ON public.extension_api_keys FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);