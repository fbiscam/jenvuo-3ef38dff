-- lovable-cron-fallback-reviewed: 96 runs/day; XAU/USD market scans require timed external price checks, and a 15-minute cadence caps signal detection delay at 15 minutes.
CREATE OR REPLACE FUNCTION public.get_live_scanner_status()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH latest AS (
    SELECT started_at, finished_at, skip_reason, error, results
    FROM public.auto_scan_runs
    WHERE mode = 'auto'
    ORDER BY started_at DESC
    LIMIT 1
  ), enabled_setting AS (
    SELECT COALESCE((value ->> 'enabled')::boolean, true) AS enabled
    FROM public.system_settings
    WHERE key = 'auto_scan_enabled'
  )
  SELECT jsonb_build_object(
    'enabled', COALESCE((SELECT enabled FROM enabled_setting), true),
    'lastScanAt', COALESCE((SELECT finished_at FROM latest), (SELECT started_at FROM latest)),
    'lastScanState', CASE
      WHEN NOT COALESCE((SELECT enabled FROM enabled_setting), true) THEN 'skipped'
      WHEN (SELECT error FROM latest) IS NOT NULL THEN 'attention'
      WHEN (SELECT skip_reason FROM latest) IS NOT NULL THEN 'skipped'
      WHEN EXISTS (SELECT 1 FROM latest) THEN 'healthy'
      ELSE 'waiting'
    END,
    'lastScanMessage', CASE
      WHEN NOT COALESCE((SELECT enabled FROM enabled_setting), true) THEN 'Automated scanning is paused'
      WHEN (SELECT error FROM latest) IS NOT NULL THEN 'The last scan needs attention'
      WHEN (SELECT skip_reason FROM latest) = 'market_closed' THEN 'Gold market is closed'
      WHEN (SELECT skip_reason FROM latest) = 'news_pause' THEN 'Paused for high-impact news'
      WHEN (SELECT skip_reason FROM latest) = 'daily_cap' THEN 'Daily signal limit reached'
      WHEN (SELECT skip_reason FROM latest) IS NOT NULL THEN 'Scan completed without publication'
      WHEN EXISTS (
        SELECT 1 FROM latest, jsonb_array_elements(COALESCE(latest.results, '[]'::jsonb)) item
        WHERE item ->> 'action' = 'broadcast'
      ) THEN 'Qualified signal published'
      WHEN EXISTS (SELECT 1 FROM latest) THEN 'Scan completed — no qualified setup'
      ELSE 'Waiting for the next scheduled scan'
    END
  );
$$;

REVOKE ALL ON FUNCTION public.get_live_scanner_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_live_scanner_status() TO authenticated;

DO $$
DECLARE
  existing_command text;
BEGIN
  SELECT command INTO existing_command
  FROM cron.job
  WHERE jobname IN ('auto-scan-15min', 'auto-scan-5min')
  ORDER BY CASE WHEN jobname = 'auto-scan-15min' THEN 0 ELSE 1 END
  LIMIT 1;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-scan-5min') THEN
    PERFORM cron.unschedule('auto-scan-5min');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-scan-15min') THEN
    PERFORM cron.unschedule('auto-scan-15min');
  END IF;

  IF existing_command IS NOT NULL THEN
    PERFORM cron.schedule('auto-scan-15min', '*/15 * * * 1-5', existing_command);
  END IF;
END $$;