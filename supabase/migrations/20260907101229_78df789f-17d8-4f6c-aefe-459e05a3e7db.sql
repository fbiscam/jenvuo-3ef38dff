CREATE TABLE IF NOT EXISTS public.telegram_alert_links (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_id text NOT NULL,
  telegram_enabled boolean NOT NULL DEFAULT false,
  verified_at timestamptz,
  verification_code text,
  code_expires_at timestamptz,
  code_attempts integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.telegram_alert_links TO authenticated;
GRANT ALL ON public.telegram_alert_links TO service_role;

ALTER TABLE public.telegram_alert_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own telegram link" ON public.telegram_alert_links;
CREATE POLICY "Users can view their own telegram link"
ON public.telegram_alert_links
FOR SELECT TO authenticated
USING (auth.uid() = user_id);