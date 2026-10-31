CREATE TABLE public.site_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL DEFAULT 'update' CHECK (kind IN ('update','bot','issue','maintenance')),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  body text CHECK (body IS NULL OR char_length(body) <= 400),
  link_url text CHECK (link_url IS NULL OR char_length(link_url) <= 300),
  link_label text CHECK (link_label IS NULL OR char_length(link_label) <= 40),
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_announcements TO authenticated;
GRANT ALL ON public.site_announcements TO service_role;
ALTER TABLE public.site_announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users read active announcements" ON public.site_announcements
  FOR SELECT TO authenticated USING (active OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert announcements" ON public.site_announcements
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update announcements" ON public.site_announcements
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete announcements" ON public.site_announcements
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.announcement_dismissals (
  user_id uuid NOT NULL,
  announcement_id uuid NOT NULL REFERENCES public.site_announcements(id) ON DELETE CASCADE,
  dismissed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, announcement_id)
);
GRANT SELECT, INSERT ON public.announcement_dismissals TO authenticated;
GRANT ALL ON public.announcement_dismissals TO service_role;
ALTER TABLE public.announcement_dismissals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own dismissals" ON public.announcement_dismissals
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users add own dismissals" ON public.announcement_dismissals
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

INSERT INTO public.site_announcements (kind, title, body, link_url, link_label)
VALUES ('bot', 'New JX Bot update', 'JX Bot v26.5 is ready with safer trading hours and entry checks. Download it again and load the new settings file.', '/dashboard/jx-bot', 'Get update');