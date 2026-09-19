# OmniRoute-only AI routing fix

## Goal
Make extension analysis and normal chat use only OmniRoute, with Claude Sonnet 4.5 as primary and Claude Sonnet 4 as fallback, while removing stale multi-provider execution paths that can cause misleading failures.

## Changes
- Simplify the AI gateway to accept and call only `omniroute/*` models.
- Keep the verified model order for analysis, vision, and chat: Sonnet 4.5 first, Sonnet 4 second.
- Preserve deterministic ICT/SMC validation and fail-closed trade safeguards.
- Replace remaining active non-OmniRoute model callers with the shared OmniRoute chain.
- Report missing OmniRoute deployment credentials accurately instead of the generic Claude fallback error.
- Update and package extension version 1.9.22 using the existing stable download path.

## Verification
- Run TypeScript and extension syntax checks.
- Confirm no active chat or analysis caller references another inference provider.
- Run direct OmniRoute primary and fallback health checks.
- Exercise the extension API flow as far as available authentication permits and inspect runtime output.
