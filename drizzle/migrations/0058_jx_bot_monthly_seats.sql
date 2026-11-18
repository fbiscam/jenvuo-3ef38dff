ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS bot_included boolean NOT NULL DEFAULT true;
ALTER TABLE public.payment_orders ADD COLUMN IF NOT EXISTS with_bot boolean NOT NULL DEFAULT true;
ALTER TABLE public.payment_orders ADD COLUMN IF NOT EXISTS bot_new_seat boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS payment_orders_bot_seat_idx ON public.payment_orders (created_at) WHERE bot_new_seat;

CREATE OR REPLACE FUNCTION public.jx_bot_seats_taken()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(DISTINCT user_id)::int
  FROM public.payment_orders
  WHERE bot_new_seat
    AND created_at >= (date_trunc('month', now() AT TIME ZONE 'utc') AT TIME ZONE 'utc')
    AND (
      status = 'approved'
      OR status IN ('verifying', 'needs_review')
      OR (status = 'pending' AND expires_at > now())
    );
$$;

REVOKE ALL ON FUNCTION public.jx_bot_seats_taken() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.jx_bot_seats_taken() TO anon, authenticated, service_role;