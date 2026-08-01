## Goal
`/signal` aur voice analyzer ko "25+ years ICT/SMC veteran" ki tarah analyze karne wala banao, aur server-side itna reliable karo ke har account pe bina baar-baar issue ke chalta rahe.

## Model choice — Max Accuracy tier

Abhi 3 stages sab `google/gemini-3.5-flash` par hain (fast lekin reasoning depth kam). Naya layout:

| Stage | Kaam | Model | Kyun |
|---|---|---|---|
| Voice intent detect | "analyze XAU/USD" jaise short phrase samajhna | `google/gemini-3.1-flash-lite` | Cheap + fast, sirf classification |
| Chart narration (Stage 1) | HTF/LTF story, key levels, confluences JSON | `openai/gpt-5.4` + `service_tier: "priority"` | Deep ICT/SMC reasoning, priority tier = fast latency |
| Senior trader review (Stage 2) | Veto / Confirm / Downgrade veteran opinion | `openai/gpt-5.5` + `service_tier: "priority"` | Best reasoning model — yehi "25-year trader" wali quality deta hai |

Deterministic price math (entry/SL/TP/score) code me hi rahega — models sirf narrate + veto karte hain, hallucinate nahi karte.

## Reliability layer (server pe set-and-forget)

Ek shared helper `src/lib/ai-gateway.server.ts` banayenge jo har AI call ko wrap karega:

1. **Auto retry** — 429 (rate limit) aur 5xx par exponential backoff (500ms → 1s → 2s), max 3 tries.
2. **Model fallback chain** — agar primary model 3 baar fail ho, next model try karo:
   - Stage 1: `gpt-5.4` → `gpt-5.4-mini` → `gemini-3.5-flash`
   - Stage 2: `gpt-5.5` → `gpt-5.4` → skip (Stage 1 grade stands)
3. **Timeout guard** — Stage 1: 25s, Stage 2: 20s. Timeout par fallback trigger.
4. **Per-symbol cache** — same pair + timeframe agar 3 min ke andar dobara analyze ho, cached plan return. Credits bachega + user ko instant response.
5. **Credit / 402 handling** — clear message user ko: "AI credits khatam, workspace me top-up karein" — silent fail nahi.
6. **Per-user rate limit** — 1 user ko max 20 analyze / hour (abuse aur runaway credit burn se bachao).
7. **Health telemetry** — har fail (model+status+latency) `ai_gateway_log` table me likha jayega taake baad me pattern dekh sako.

## Files to change

- `src/lib/ai-gateway.server.ts` (new) — `callAiWithRetryAndFallback()` helper, model chains, backoff, timeout.
- `src/lib/gold-analysis.functions.ts` — 3 direct `fetch()` calls (lines 644, 1685, 1925) replace with helper. Stage 1 model → `openai/gpt-5.4` priority, Stage 2 → `openai/gpt-5.5` priority.
- `src/lib/signal-agent.functions.ts` — voice intent model → `google/gemini-3.1-flash-lite` via same helper.
- `src/lib/signal-cache.functions.ts` (new) — in-memory + optional DB-backed cache keyed on `userId:symbol:timeframe`.
- `src/lib/rate-limit.server.ts` (new) — per-user token bucket (20/hour analyze).
- Migration: `ai_gateway_log` table (model, status, latency_ms, user_id, created_at) with RLS + service_role write.

## Trade-offs — bata dena zaroori hai

- **Credits**: Har full `/signal` analyze abhi ~3 credits. Naye setup me `gpt-5.4` + `gpt-5.5` priority ke sath ~8–12 credits per analyze. Cache aur rate-limit se average kam rahega, but heavy users ka usage 3–4x badhega.
- **Latency**: Priority tier ke saath Stage 1+2 combined ~4–7s (currently ~3–5s with gemini-flash).
- **First failure recovery**: user ko dikhega bhi nahi — helper chup-chap fallback model use karega.

## Technical notes

- Gateway calls: `https://ai.gateway.lovable.dev/v1/chat/completions`, header `Authorization: Bearer ${LOVABLE_API_KEY}`, body `service_tier: "priority"` sirf ✓ models pe (gpt-5.4, gpt-5.5, gpt-5.4-mini) — Gemini pe nahi.
- Structured JSON: `response_format: { type: "json_object" }` bracket + regex repair already handle karta hai; strict schema nahi lagayenge (OpenAI strict `json_schema` bade schemas pe fail hota hai).
- Retry gate: sirf 429/5xx/timeout retry-able. 400 (bad request) aur 402 (no credits) terminal — turant surface karo.
- Cache TTL: 3 min default; user "Re-analyze" button dabaye to bypass.

## Post-build verification

1. `/signal?symbol=XAUUSD` khol ke Stage 1 (`gpt-5.4`) latency + confidence check.
2. Ek non-existent model force karke fallback chain trigger — user ko success dikhna chahiye.
3. 21 requests in 1 hour → 21st request pe polite rate-limit message.
4. Same pair 2 min me dobara analyze → "cached" response instant.
5. AI Gateway logs me `gpt-5.4` + `gpt-5.5` calls dikh rahe hain, priority tier billing confirm.