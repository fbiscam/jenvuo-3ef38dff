-- Aggregate-only email health: no addresses, templates or errors leave this function.
CREATE OR REPLACE FUNCTION public.email_delivery_state()
 RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
 WITH latest AS (
  SELECT DISTINCT ON (COALESCE(message_id, id::text)) status, created_at
  FROM public.email_send_log
  WHERE created_at > now() - interval '7 days' AND status IN ('sent','failed','dlq')
  ORDER BY COALESCE(message_id, id::text), created_at DESC
 ), newest AS (SELECT status FROM latest ORDER BY created_at DESC LIMIT 1)
 SELECT CASE
  WHEN NOT EXISTS (SELECT 1 FROM newest) THEN 'unknown'
  WHEN (SELECT status FROM newest) IN ('failed','dlq') THEN 'unavailable'
  WHEN EXISTS (SELECT 1 FROM latest WHERE status IN ('failed','dlq') AND created_at > now() - interval '24 hours') THEN 'degraded'
  ELSE 'operational' END
$$;
REVOKE ALL ON FUNCTION public.email_delivery_state() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.email_delivery_state() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.monitor_service_status()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE p record; r record; s text; body jsonb; quote_time timestamptz; req bigint; last_candle jsonb;
BEGIN
 FOR p IN SELECT * FROM public.service_status_probe_requests ORDER BY requested_at LIMIT 100 LOOP
  SELECT status_code, timed_out, content INTO r FROM net._http_response WHERE id = p.request_id;
  IF FOUND OR p.requested_at < now() - interval '1 hour' THEN
   s := 'unknown';
   IF p.service = 'keys' THEN
    IF r.status_code = 401 THEN
     BEGIN
      body := r.content::jsonb;
      IF body->'error'->>'type' = 'invalid_request_error' THEN s := 'operational'; ELSE s := 'degraded'; END IF;
     EXCEPTION WHEN OTHERS THEN s := 'degraded'; END;
    ELSIF r.status_code >= 500 OR COALESCE(r.timed_out, false) THEN s := 'unavailable';
    ELSIF r.status_code IS NOT NULL THEN s := 'degraded'; END IF;
   ELSIF r.status_code >= 200 AND r.status_code < 400 AND NOT COALESCE(r.timed_out, false) THEN
    s := 'operational';
    IF p.service IN ('api','licensing','reports','gold','candles','email_dns') THEN
     BEGIN
      body := r.content::jsonb;
      IF p.service = 'api' AND (body->>'object' <> 'list' OR jsonb_array_length(body->'data') = 0) THEN s := 'degraded'; END IF;
      IF p.service IN ('licensing','reports') AND body->>'reason' IS DISTINCT FROM 'malformed' THEN s := 'degraded'; END IF;
      IF p.service = 'email_dns' THEN
       IF (body->>'Status')::int = 3 OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(body->'Answer','[]'::jsonb)) a WHERE (a->>'type')::int = 2) THEN s := 'unavailable';
       ELSIF (body->>'Status')::int <> 0 THEN s := 'degraded'; END IF;
      END IF;
      IF p.service = 'candles' THEN
       last_candle := body->(jsonb_array_length(body)-1);
       quote_time := to_timestamp((last_candle->>'t')::double precision);
       IF quote_time IS NULL OR (last_candle->>'c')::numeric <= 0 THEN s := 'unknown';
       ELSIF quote_time < p.requested_at - interval '5 minutes' OR quote_time > p.requested_at + interval '1 minute' THEN
        IF extract(isodow FROM p.requested_at AT TIME ZONE 'UTC') IN (6,7) THEN s := 'unknown'; ELSE s := 'degraded'; END IF;
       END IF;
      END IF;
      IF p.service = 'gold' THEN
       quote_time := (body->>'updatedAt')::timestamptz;
       IF quote_time IS NULL OR (body->>'price')::numeric <= 0 THEN s := 'unknown';
       ELSIF quote_time < p.requested_at - interval '2 minutes' OR quote_time > p.requested_at + interval '1 minute' THEN
        IF extract(isodow FROM p.requested_at AT TIME ZONE 'UTC') IN (6,7) THEN s := 'unknown'; ELSE s := 'degraded'; END IF;
       END IF;
      END IF;
     EXCEPTION WHEN OTHERS THEN s := 'unknown'; END;
    END IF;
   ELSIF p.service IN ('candles','email_dns') THEN s := 'unknown';
   ELSIF r.status_code IS NOT NULL OR COALESCE(r.timed_out, false) THEN s := 'unavailable'; END IF;
   INSERT INTO public.service_status_samples(service,checked_at,state) VALUES (p.service,p.requested_at,s) ON CONFLICT DO NOTHING;
   DELETE FROM public.service_status_probe_requests WHERE request_id=p.request_id;
  END IF;
 END LOOP;
 FOR p IN SELECT * FROM (VALUES
 ('website','https://jenvu.com/'), ('dashboard','https://dash.jenvu.com/overview'),
 ('auth','https://auth.jenvu.com/sign-in'), ('docs','https://jenvu.com/docs'),
 ('api','https://jenvu.com/api/public/v1/models'), ('licensing','https://jenvu.com/api/public/licenses/validate'),
 ('gold','https://api.gold-api.com/price/XAU'),
 ('keys','https://jenvu.com/api/public/v1/chat/completions'),
 ('terminal','https://dash.jenvu.com/terminal'), ('chat','https://dash.jenvu.com/chat'),
 ('payments','https://dash.jenvu.com/billing'),
 ('candles','https://api.gateio.ws/api/v4/futures/usdt/candlesticks?contract=XAU_USDT&interval=1m&limit=1'),
 ('reports','https://jenvu.com/api/public/licenses/report'),
 ('keys_console','https://dash.jenvu.com/api'), ('payment_page','https://dash.jenvu.com/payment'),
 ('email_dns','https://cloudflare-dns.com/dns-query?name=notify.jenvu.com&type=NS')) AS probes(service,url) LOOP
  IF p.service IN ('licensing','keys') THEN
   req := net.http_post(url := p.url, body := '{}'::jsonb, timeout_milliseconds := 10000);
  ELSIF p.service = 'reports' THEN
   req := net.http_post(url := p.url, body := '"x"'::jsonb, timeout_milliseconds := 10000);
  ELSIF p.service = 'email_dns' THEN
   req := net.http_get(url := p.url, headers := '{"accept":"application/dns-json"}'::jsonb, timeout_milliseconds := 10000);
  ELSE req := net.http_get(url := p.url, timeout_milliseconds := 10000); END IF;
  INSERT INTO public.service_status_probe_requests(request_id,service) VALUES(req,p.service);
 END LOOP;
 INSERT INTO public.service_status_samples(service,checked_at,state) VALUES ('email_delivery', now(), public.email_delivery_state()) ON CONFLICT DO NOTHING;
 DELETE FROM public.service_status_samples WHERE checked_at < now() - interval '91 days';
END;
$function$;