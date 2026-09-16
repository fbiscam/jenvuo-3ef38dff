# Complete the XAU/USD Live Signals Scanner

## Goal
Build the previously requested professional Live Signals experience around the existing Gold-only signal infrastructure. The scanner will run without an open browser, analyze XAU/USD every 15 minutes, require a senior AI review, and publish only reviewed setups at 75% confidence or higher.

## What will change

### Automated scanner
- Reuse the existing XAU/USD candle feed and deterministic ICT/SMC engine for multi-timeframe structure, liquidity sweeps, BOS/CHoCH, FVGs, order blocks, premium/discount, killzones, displacement, risk, and targets.
- Change the scheduled cadence and user-facing status from 5 minutes to 15 minutes.
- Add a mandatory senior AI review stage before publication, using the configured reliable OmniRoute senior chain.
- Combine the rules-engine confidence with the senior verdict and reject vetoed, incomplete, stale, or sub-75% setups.
- Preserve market-hours, high-impact-news, duplicate, cooldown, open-trade, entry-freshness, and minimum risk/reward safeguards.
- Store scan/review details and actual models used for auditability.

### Live Signals page
- Evolve the existing Signal Alerts page into a polished XAU/USD Live Signals page that matches the dashboard styling.
- Show scanner health, last scan, next 15-minute scan, Gold market/session status, and the 75% publication threshold.
- Present the latest qualified setup prominently with BUY/SELL, confidence, entry, stop loss, take-profit levels, risk/reward, session, and review state.
- Keep a responsive signal history with timestamps, model/review details, position sizing, and the existing Trade Done workflow.
- Keep alert preferences and connected delivery channels intact.

### Reliability and security
- Keep the public scheduler endpoint protected by the cron secret.
- Make failures visible in scan audit records without publishing partial or unreviewed signals.
- Ensure the database access policies and grants remain aligned with authenticated read access and service-only scanning writes.
- Update the existing scheduler configuration to the 15-minute interval.

### Validation
- Confirm `src/lib/utils.ts` remains the valid six-line helper; the reported line-8 type error is stale unless a fresh typecheck identifies a new source.
- Run focused TypeScript and scanner tests.
- Verify the Live Signals page at desktop and mobile sizes, including empty, loading, live, and history states.
- Exercise the protected scan endpoint and confirm only senior-approved 75%+ signals can be published.

## Technical details
- Extend the current `/api/public/hooks/auto-scan` worker rather than introducing a second competing scanner.
- Use the existing `signal_alerts`, `auto_scan_runs`, scanner state, notification, and paper-trade records where possible; add a migration only for missing review/audit fields and the 15-minute schedule.
- Keep XAU/USD as the only supported instrument throughout the scanner and page.
