ALTER TABLE public.mt5_bot_reports ADD COLUMN IF NOT EXISTS start_balance numeric;

-- Backfill: each UTC day starts at the previous reported day's closing balance, so the broker's midnight reset can't wipe a day's profit.
WITH s AS (
  SELECT license_id, day,
    COALESCE(lag(balance) OVER (PARTITION BY user_id, mt5_account ORDER BY day, updated_at), equity - today_profit) AS sb
  FROM public.mt5_bot_reports
)
UPDATE public.mt5_bot_reports r
SET start_balance = s.sb, today_profit = round(r.balance - s.sb, 2)
FROM s
WHERE r.license_id = s.license_id AND r.day = s.day;