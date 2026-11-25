CREATE TABLE public.structure_alert_sends (
  alert_key text PRIMARY KEY,
  asset text NOT NULL,
  timeframe text NOT NULL,
  label text NOT NULL,
  price double precision NOT NULL,
  swing_at timestamptz NOT NULL,
  price_action text,
  sweep text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.structure_alert_sends TO authenticated;
GRANT ALL ON public.structure_alert_sends TO service_role;
ALTER TABLE public.structure_alert_sends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view structure alerts" ON public.structure_alert_sends FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));