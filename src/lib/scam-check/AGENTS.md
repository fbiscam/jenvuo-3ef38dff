# Scam Protection

- `/jx-bot` redirects to `/scam-protection`; dashboard JX Bot/Bot Usage pages redirect to Overview: JX Bot is discontinued.
- Public report numbers come only from `scam_daily_stats` (server-only table, `bump_scam_stat` RPC via `recordScamEvent`); every checker handler records its scan, page views are counted once per IP per 30 min; rules in `scam-stats.ts` (tested): the report must never show invented numbers.
