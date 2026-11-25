ALTER TABLE public.swing_audits ADD COLUMN backfilled boolean NOT NULL DEFAULT false;
UPDATE public.swing_audits SET backfilled = true WHERE first_seen_at < now();