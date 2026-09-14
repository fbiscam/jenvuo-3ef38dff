# Finish the Usage page

## Changes
- Remove the outer framed container and let the Usage sections align directly with the dashboard page edges.
- Keep section dividers for structure while avoiding a boxed page-within-page look.
- Make the project control, grouping control, all four usage tabs, sidebar tabs, refresh, export, monthly-spend settings, and usage rows perform useful actions.
- Preserve the existing date and API-key filters, live data, chart, token/request totals, and CSV export.
- Add clear empty states where a selected usage category has no data rather than leaving controls inert.

## Verification
- Test every visible control on the Usage page and confirm its selected state or navigation/result.
- Check desktop and mobile layouts for overflow and detached sections.
- Run the TypeScript check and confirm the stale `src/lib/utils.ts` diagnostic is absent.
