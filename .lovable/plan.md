# Plan: Align Signal Alert Page Section Titles

## Goal
Move the section titles on the signal alert page (`/dashboard/alerts`) slightly to the right so they flush-align with the rest of the content, matching the recent adjustment made to the "Recent alerts" heading.

## Current State
- `src/routes/_authenticated/dashboard.alerts.tsx` contains five section headings:
  - `Recent alerts` (already has `pl-3`)
  - `Delivery channels` (`pl-2`)
  - `Conviction filter` (`pl-2`)
  - `Alert filters` (`pl-2`)
  - `Quiet hours` (`pl-2`)
- The inconsistency makes the first heading look offset while the others remain left-shifted.

## Proposed Change
1. Normalize all section `h2` headings on `/dashboard/alerts` to use the same left padding value (`pl-3`) so the titles align flush with their content.
2. Keep the existing text styles unchanged (`text-base font-semibold text-black normal-case`).

## Verification
- Visual check in the preview to confirm all five headings line up vertically.
- No functional changes expected; only a layout adjustment.
