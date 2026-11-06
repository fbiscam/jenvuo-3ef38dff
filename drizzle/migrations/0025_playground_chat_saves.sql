CREATE TABLE public.playground_chat_saves (
  user_id uuid PRIMARY KEY,
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.playground_chat_saves TO authenticated;
GRANT ALL ON public.playground_chat_saves TO service_role;
ALTER TABLE public.playground_chat_saves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own save select" ON public.playground_chat_saves FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own save insert" ON public.playground_chat_saves FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own save update" ON public.playground_chat_saves FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own save delete" ON public.playground_chat_saves FOR DELETE TO authenticated USING (auth.uid() = user_id);