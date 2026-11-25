CREATE TABLE public.swing_audits (
  swing_key text PRIMARY KEY,
  asset text NOT NULL,
  timeframe text NOT NULL,
  label text NOT NULL,
  kind text NOT NULL,
  price numeric NOT NULL,
  swing_at timestamptz NOT NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  sweep text,
  sweep_strong boolean NOT NULL DEFAULT false,
  price_action text,
  price_action_strong boolean NOT NULL DEFAULT false,
  confluence text NOT NULL DEFAULT 'none',
  repainted boolean NOT NULL DEFAULT false,
  locked boolean NOT NULL DEFAULT false,
  entry numeric,
  target numeric,
  outcome text NOT NULL DEFAULT 'open',
  reached_next_swing boolean,
  mfe_pips numeric NOT NULL DEFAULT 0,
  mae_pips numeric NOT NULL DEFAULT 0,
  bars_tracked integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX swing_audits_swing_at_idx ON public.swing_audits (asset, timeframe, swing_at DESC);
GRANT SELECT ON public.swing_audits TO authenticated;
GRANT ALL ON public.swing_audits TO service_role;
ALTER TABLE public.swing_audits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read swing audits" ON public.swing_audits FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));