# Shared business rules

- Customer-facing JX Bot daily target and drawdown copy must interpolate DAILY_TARGET_PCT and DAILY_DRAWDOWN_PCT from mt5-licenses.ts, not duplicate rates or display legacy fixed-dollar daily targets: keeps pricing, guides and AI knowledge aligned with server enforcement.
- Founding JX Bot access is decided by DB `founding_bot_check()` (hourly `process_founding_bot_milestones()`), mirrored in `founding-bot.ts` (tested): one lock rule for the EA validator and dashboard.
