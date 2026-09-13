# AgentRouter AI migration

## Goal
Move extension chat and chart analysis to AgentRouter GPT-6 Astra, require AgentRouter Claude Opus 5 for senior review, and align billing and visible model details.

## Changes
- Add and live-test the AgentRouter connection and supported model IDs before enabling routing.
- Route normal chat and primary chart analysis through GPT-6 Astra; route eligible senior review through Claude Opus 5 while preserving the existing hard review gate.
- Charge a fixed $0.03 for simple chat or primary-only chart analysis, and $0.20 when a completed senior review is included; retain request-level duplicate-charge protection.
- Update token-rate metadata from AgentRouter’s published pricing when available.
- Show the active provider/model badges in usage and spend history, and update pricing/model descriptions throughout the product.
- Rebuild the extension package and verify live model calls, billing paths, TypeScript, and the reported `utils.ts` diagnostic.

## Technical notes
- Keep API credentials encrypted and server-only.
- Do not enable untested model IDs or expose an analysis without its required senior review.
- If AgentRouter does not expose authoritative token rates, fixed request charges remain authoritative and token cost is recorded as informational only.
