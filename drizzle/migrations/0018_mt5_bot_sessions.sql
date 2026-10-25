CREATE TABLE public.mt5_bot_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id uuid NOT NULL,
  user_id uuid NOT NULL,
  mt5_account text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  end_reason text
);
CREATE INDEX mt5_bot_sessions_license ON public.mt5_bot_sessions (license_id, started_at DESC);
CREATE INDEX mt5_bot_sessions_user ON public.mt5_bot_sessions (user_id, started_at DESC);
GRANT SELECT ON public.mt5_bot_sessions TO authenticated;
GRANT ALL ON public.mt5_bot_sessions TO service_role;
ALTER TABLE public.mt5_bot_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read their bot sessions" ON public.mt5_bot_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);