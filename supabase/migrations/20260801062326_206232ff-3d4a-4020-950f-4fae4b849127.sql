CREATE TABLE public.tool_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  display_name text,
  credits numeric NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz
);
GRANT ALL ON public.tool_users TO service_role;
ALTER TABLE public.tool_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tool_users admin read" ON public.tool_users FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.tool_user_credit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_user_id uuid NOT NULL REFERENCES public.tool_users(id) ON DELETE CASCADE,
  delta numeric NOT NULL,
  reason text NOT NULL,
  balance_after numeric NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.tool_user_credit_log TO service_role;
ALTER TABLE public.tool_user_credit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tool_credit_log admin read" ON public.tool_user_credit_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.tool_lead_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_user_id uuid REFERENCES public.tool_users(id) ON DELETE SET NULL,
  query text NOT NULL,
  results_count integer NOT NULL DEFAULT 0,
  credits_spent numeric NOT NULL DEFAULT 0,
  enriched boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.tool_lead_searches TO service_role;
ALTER TABLE public.tool_lead_searches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tool_lead_searches admin read" ON public.tool_lead_searches FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_tool_lead_searches_user ON public.tool_lead_searches(tool_user_id, created_at DESC);
CREATE INDEX idx_tool_credit_log_user ON public.tool_user_credit_log(tool_user_id, created_at DESC);

INSERT INTO public.tool_users (username, password_hash, display_name, credits)
VALUES ('haseeb', 'pbkdf2$100000$b3ded2419411f14caf33b2f66bdd1e4b$679f789ce7442071b5d97f4c651388ece4325144202be731f7f854543d3c658d', 'Haseeb', 1000);