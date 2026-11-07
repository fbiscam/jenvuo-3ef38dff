CREATE TABLE public.admin_sent_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sent_by uuid NOT NULL,
  from_box text NOT NULL CHECK (from_box IN ('support','sales')),
  to_email text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  error text,
  contact_message_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.admin_sent_emails TO authenticated;
GRANT ALL ON public.admin_sent_emails TO service_role;
ALTER TABLE public.admin_sent_emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read sent emails" ON public.admin_sent_emails FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert sent emails" ON public.admin_sent_emails FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') AND sent_by = auth.uid());
CREATE INDEX admin_sent_emails_created_idx ON public.admin_sent_emails (created_at DESC);