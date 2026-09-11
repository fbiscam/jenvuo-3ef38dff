# Usage page mobile and graph fix

## Changes
- Align the graph plotting area and value axis directly beneath the Total Spend summary on desktop and mobile.
- Make the Usage header controls, dropdowns, chart, tabs, cards, wallet, token/request summaries, and API-key rows fit cleanly on small screens.
- Keep all existing usage data, filters, export, refresh, and live updates working.
- Trace the reported `src/lib/utils.ts(8,7)` error, clear stale generated diagnostics if applicable, and verify the current project type-checks.

## Verification
- Test the Usage page at desktop and mobile viewport sizes, including opening both dropdowns and switching both tabs.
- Confirm no horizontal overflow, clipped controls, overlapping text, or chart collapse.
- Run the TypeScript check and verify the reported error is absent.
