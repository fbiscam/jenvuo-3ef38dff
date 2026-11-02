CREATE TABLE public.chat_jobs (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'running',
  result jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.chat_jobs TO authenticated;
GRANT ALL ON public.chat_jobs TO service_role;
ALTER TABLE public.chat_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own chat jobs" ON public.chat_jobs FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users start own chat jobs" ON public.chat_jobs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status = 'running' AND result IS NULL);
CREATE POLICY "Users stop own chat jobs" ON public.chat_jobs FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND status = 'stopped');
CREATE INDEX chat_jobs_user_idx ON public.chat_jobs (user_id, created_at DESC);