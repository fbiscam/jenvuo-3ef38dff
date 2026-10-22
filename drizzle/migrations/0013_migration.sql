ALTER TABLE public.account_devices ADD COLUMN IF NOT EXISTS hw_fingerprint text;
CREATE INDEX IF NOT EXISTS account_devices_hw_idx ON public.account_devices(hw_fingerprint);

CREATE TABLE IF NOT EXISTS public.login_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ip text,
  country text,
  city text,
  user_agent text,
  fingerprint text,
  is_new boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS login_events_user_idx ON public.login_events(user_id, created_at DESC);
GRANT ALL ON public.login_events TO service_role;
ALTER TABLE public.login_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role only" ON public.login_events FOR ALL USING (false) WITH CHECK (false);