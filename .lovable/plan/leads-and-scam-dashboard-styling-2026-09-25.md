# Leads and Scam Dashboard Styling

## Goal
Make the Leads workspace and both Scam tools feel visually consistent with the existing Jenvu Dashboard, without changing their working logic.

## Changes
- Restyle the Leads shell to match the Dashboard’s sidebar width, logo sizing, typography, active navigation treatment, borders, page spacing, and white/zinc surfaces.
- Keep the Leads sidebar exclusive to `/leads/*`; it will not appear on Scam Tool or Scam Check.
- Keep the complete Leads navigation on desktop and make the mobile navigation easy to open and close rather than reducing it to icons only.
- Restyle all Leads pages through their shared shell and shared cards/buttons so Maps, People, Enrich, Import, Lists, Activity, Account, and Admin remain visually consistent.
- Restyle `/scam-tool` and `/scam-check` with the Dashboard’s page width, header hierarchy, compact cards, tabs, inputs, buttons, and result panels, but without adding a sidebar.
- Preserve all searches, checks, results, account gates, credits, and existing links.

## Verification
- Check Leads overview plus representative inner Leads pages on desktop and mobile.
- Check both Scam pages, tab switching, input states, and available result flow on desktop and mobile.
- Confirm routes retain unique page metadata.
- Confirm the current code check and preview build are clean; `src/lib/utils.ts` is currently six valid lines, so the reported line-8 number error will only be changed if a fresh check reproduces it elsewhere.

## Technical details
- Reuse the existing Google Sans/Jenvu dashboard visual language and semantic theme classes where possible.
- Use the existing Leads parent layout so the sidebar stays scoped to `/leads/*`.
- Use existing design-system buttons for updated interactive controls where compatible, while preserving form behavior.
