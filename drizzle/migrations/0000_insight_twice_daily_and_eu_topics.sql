-- Run the insight generator twice a day (09:00 and 17:00 UTC)
SELECT cron.alter_job(
  (SELECT jobid FROM cron.job WHERE jobname = 'jenvu-generate-insight-daily'),
  schedule := '0 9,17 * * *'
);

-- Clear the stuck failure so generation resumes on the next run
UPDATE public.insight_generation_jobs
SET status = 'idle', last_error = NULL, pause_reason = NULL, locked_until = NULL, updated_at = now()
WHERE job_key = 'daily-insight';

-- Europe-focused trading + crypto keyword topics
INSERT INTO public.insight_topics (keyword, angle, category, priority) VALUES
('gold trading strategy Europe', 'London session XAU/USD playbook for EU retail and prop traders', 'Strategy', 90),
('XAU/USD London session strategy', 'Frankfurt open to London killzone execution plan', 'Strategy', 88),
('prop firm challenge gold rules', 'passing an EU prop firm challenge trading only XAU/USD', 'Risk', 86),
('best trading terminal for gold', 'what an AI trading terminal should do for XAU/USD traders', 'Education', 86),
('gold vs bitcoin as a hedge', 'how EU traders compare XAU/USD and BTC exposure', 'Macro', 84),
('crypto market structure trading', 'applying SMC market structure reading to crypto charts', 'SMC', 82),
('bitcoin liquidity sweeps explained', 'liquidity grabs on BTC compared with XAU/USD', 'SMC', 80),
('ECB rate decision gold reaction', 'how ECB policy days move XAU/USD for European traders', 'Macro', 80),
('MiCA crypto regulation for traders', 'what EU crypto rules mean for retail traders', 'Education', 78),
('goldpreis prognose handeln', 'LANG:de | XAU/USD Handelsstrategie fuer deutsche Trader', 'Gold', 78),
('stratégie trading or XAU/USD', 'LANG:fr | plan de trading session de Londres', 'Strategy', 76),
('estrategia trading oro XAU/USD', 'LANG:es | sesión de Londres y gestión de riesgo', 'Strategy', 74),
('crypto vs gold volatility', 'position sizing differences between BTC and XAU/USD', 'Risk', 74),
('AI trading analysis tools Europe', 'how AI chart analysis supports discretionary EU traders', 'AI', 72),
('ICT killzones European time', 'converting ICT killzones to CET and GMT', 'ICT', 72);
