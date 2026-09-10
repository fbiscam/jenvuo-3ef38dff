# Cloudflare-style public pages

## Goal
Bring Pricing and the remaining public content pages into the same white, orange, Cloudflare-inspired visual system already established on the homepage and dashboard, without changing business logic.

## Changes
- Create a shared public-page visual shell with the current Jenvu header/footer, white canvas, orange accent, dotted side rails, restrained borders, compact typography, and responsive spacing.
- Restyle Pricing to match the Cloudflare reference: centered compact intro, clean segmented billing control, flat plan columns, orange selected emphasis, and a precise comparison table.
- Apply the shared visual system to informational/legal pages that use the common page shell, including About, Founder, Contact, Terms, Privacy, Refund, Cancellation, Disclaimer, Development, and Language Model pages.
- Align custom public experiences such as Insights, Help, Downloads, Broadcasts, and Killzones through their top-level page surfaces while preserving their existing content and interactions.
- Keep authenticated dashboard/admin pages, Leads, authentication flows, data fetching, billing rules, and backend behavior unchanged.

## Technical details
- Replace raw page colors with existing semantic design tokens and add only the shared homepage accent/surface tokens needed for this treatment.
- Reuse shared navigation/footer components instead of duplicating page chrome.
- Preserve each route’s metadata, links, forms, filters, pricing state, and API calls.
- Verify representative desktop/mobile pages, run the TypeScript check, and confirm `src/lib/utils.ts` remains clean.
