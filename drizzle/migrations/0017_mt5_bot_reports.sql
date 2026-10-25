CREATE TABLE public.mt5_bot_reports (
  license_id uuid NOT NULL,
  day date NOT NULL,
  user_id uuid NOT NULL,
  mt5_account text NOT NULL,
  symbol text NOT NULL DEFAULT '',
  balance numeric NOT NULL DEFAULT 0,
  equity numeric NOT NULL DEFAULT 0,
  today_profit numeric NOT NULL DEFAULT 0,
  trades_today integer NOT NULL DEFAULT 0,
  open_trades integer NOT NULL DEFAULT 0,
  open_lots numeric NOT NULL DEFAULT 0,
  target_hit boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (license_id, day)
);
CREATE INDEX mt5_bot_reports_user_day ON public.mt5_bot_reports (user_id, day);
GRANT SELECT ON public.mt5_bot_reports TO authenticated;
GRANT ALL ON public.mt5_bot_reports TO service_role;
ALTER TABLE public.mt5_bot_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read their bot reports" ON public.mt5_bot_reports FOR SELECT TO authenticated USING (auth.uid() = user_id);