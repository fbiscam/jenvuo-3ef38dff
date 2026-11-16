ALTER TABLE public.custom_auth_otps DROP CONSTRAINT IF EXISTS custom_auth_otps_purpose_check;
ALTER TABLE public.custom_auth_otps ADD CONSTRAINT custom_auth_otps_purpose_check
  CHECK (purpose = ANY (ARRAY['signup'::text, 'recovery'::text, 'login'::text, 'second_step'::text, 'email_2fa_setup'::text]));

CREATE TABLE public.account_email_2fa (
  user_id uuid PRIMARY KEY,
  enabled_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.account_email_2fa TO authenticated;
GRANT ALL ON public.account_email_2fa TO service_role;
ALTER TABLE public.account_email_2fa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read their own email two-step setting"
  ON public.account_email_2fa FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE public.email_2fa_sessions (
  session_id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX email_2fa_sessions_user_idx ON public.email_2fa_sessions (user_id);
GRANT ALL ON public.email_2fa_sessions TO service_role;
ALTER TABLE public.email_2fa_sessions ENABLE ROW LEVEL SECURITY;