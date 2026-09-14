# Keep AI Work Off Lovable Credits

## Changes
- Make the shared AI router reject any model without an explicit external-provider prefix, preventing accidental Lovable AI Gateway usage.
- Replace remaining unprefixed OpenAI/Google fallback models with configured UnoRouter, Browser Use, Evolink, JustWoker, or BluesMinds routes.
- Remove the Lovable AI image-generation fallback; retain UnoRouter, Google AI, and the free image provider.
- Keep `LOVABLE_API_KEY` usage for connected services and managed email unchanged because those calls do not consume AI model credits.

## Verification
- Search production code for any remaining Lovable AI inference endpoints or unprefixed inference models.
- Run TypeScript checks, including confirmation that `src/lib/utils.ts` is valid.
- Validate the final diff and record completion in the roadmap.

## Technical details
- Unknown model prefixes will fail closed instead of silently routing through `ai.gateway.lovable.dev`.
- Existing external-provider fallback order remains intact wherever possible.
