
## Diagnosis — kyun har dafa "WAIT" aur A+ almost kabhi nahi

Code trace karne ke baad `src/lib/analysis/engine.ts` → `buildTrade` aur `scoreSetup` me 4 hard gates milay jo mostly WAIT force karte hain:

### 1) Zone me pehle se ghusna zaroori hai
```ts
const ok = dir === "BUY"
  ? f.kind === "bullish" && lastPrice >= f.priceLow
  : f.kind === "bearish" && lastPrice <= f.priceHigh;
```
Agar live price fresh OB/FVG ke andar nahi ghusa, candidate hi drop → "No fresh zone" → WAIT.

### 2) Actionable window bohot tight
```ts
entryWindowPct: crypto 0.25%, metal 0.09%, forex 0.06%
```
Yani BTC pe zone 0.3% door ho toh bhi WAIT. Practically kabhi tap nahi hota exact moment pe.

### 3) `maxDistPct` bhi tight
Metal 0.6%, forex 0.4%. Real zones aksar 1-2% door hote hain — engine chase nahi karta, seedha WAIT.

### 4) A+ threshold + veto stacking
- A+ ≥ 88 score, A ≥ 75.
- Har veto -15 points.
- `no_sweep` veto non-crypto pe almost hamesha fire hota hai kyun ki sweep detection sirf recent 6-24 candles pe hoti hai — most setups score ~55-70 → grade B → alert nahi fire hota (cron threshold `score >= 80` bhi hai).

Net result: 90%+ scans "WAIT" ya "B" grade → user ko A+ signal kabhi nahi milta.

---

## Fix Plan

### A) `src/lib/analysis/engine.ts` → `buildTrade` — PENDING limit entries add karo

Abhi engine sirf "tap ho chuka" market entries deta hai. Change:

1. **Zone filter loosen** — dono taraf ka POI accept karo (price zone ke aage ho toh limit order):
   ```ts
   const ok = dir === "BUY" ? f.kind === "bullish" : f.kind === "bearish";
   ```
   Distance-based ranking pehle se hai.

2. **Execution modes**:
   - Agar `lastPrice` zone ke andar → `MARKET` entry at `lastPrice` (current behavior).
   - Agar zone thoda door hai lekin `maxDistPct` ke andar → `LIMIT` entry at zone midpoint, direction "BUY LIMIT" / "SELL LIMIT". `BuiltTrade` me `entryType: "MARKET" | "LIMIT"` field add karo.
   - Agar `maxDistPct` se bhi door → WAIT (real chase avoid).

3. **`maxDistPct` widen** per asset:
   - crypto 1.2% → 2.5%
   - metal 0.6% → 1.5%
   - forex 0.4% → 0.9%
   - index 0.6% → 1.5%
   - stock 0.6% → 2.0%

4. **`entryWindowPct` sirf MARKET mode ke liye use karo** — LIMIT mode ke liye zone width pe tap ka intezaar router karega.

5. **Fallback POI** — agar koi fresh unmitigated OB/FVG nahi mila, HTF equilibrium/OTE (62-79%) zone ko synthetic POI banao (BUY discount side, SELL premium side). Isse trend clear ho toh WAIT ki jagah pending idea milega.

### B) `scoreSetup` — softer vetos + smarter grading

1. **Single veto = -8 (not -15).** Multi-veto (≥2) = -15 each. Genuine sirf tab downgrade jab 2+ red flags ho.
2. **`no_sweep` ko soft factor banao, veto nahi** — score me weight pehle se hai. Non-crypto ke liye hard veto hatao, sirf `sweep` factor fail count ho.
3. **Grade thresholds slightly relaxed**: A+ ≥ 85 (was 88), A ≥ 72 (was 75), B ≥ 55 (was 60).
4. **LIMIT entries pe `zone` factor bonus** — pending order zone tap wait karta hai, execution quality actually better hoti hai. Iska pass=true if zone unmitigated.

### C) `src/routes/api/public/hooks/scan-signals.ts` — alert threshold realistic

Current:
```ts
if (!acceptableGrades.includes(grade) || plan.setupScore < 80)
```
Change:
- Accept A+/A grades with `setupScore >= 72` (aligned with new A threshold).
- Direction WAIT still skipped.
- Dedupe window shorten 2h → 90m taaki mid-session naya A+ ban jaye toh miss na ho.

### D) `computeSignalPlan` (signal-agent context) — no change to prompt

LLM narration already `trade.direction` aur `entryType` use karega automatically once engine exposes it. Bas `SignalCard` UI me "LIMIT @ price" ya "MARKET" label add karna hoga (chota render change).

### E) UI touch — `src/components/SignalCard.tsx`

Sirf presentation: agar `trade.entryType === "LIMIT"`, label pe "PENDING LIMIT" badge dikhao aur reason line me "Waiting for tap at zone" show karo. No logic change.

---

## Files to change

- `src/lib/analysis/engine.ts` — `buildTrade` (entry modes, widened distances, synthetic OTE fallback), `scoreSetup` (soft veto, grade thresholds), `BuiltTrade` type (`entryType` field).
- `src/routes/api/public/hooks/scan-signals.ts` — threshold + dedupe window.
- `src/components/SignalCard.tsx` — small badge for LIMIT vs MARKET.

## Not changing

- Live price fetching, candle cache, LLM prompts, DB schema, credits, email templates.
- Per-asset RISK_PROFILE core (SL buffer, min/max risk) — sirf `maxDistPct` widen.

## Expected result

- 60-70% scans me actionable signal (MARKET ya LIMIT) — WAIT sirf true HTF/LTF conflict pe.
- A+ realistic frequency: 1-3 per pair per day during killzone.
- Entry/SL/TP clean: MARKET = live price ke around, LIMIT = zone midpoint ke exact, SL/TP formulas unchanged.
- Alerts cron zyada bar fire hoga bina noise ke (grade A/A+ sirf).

Approve karo, main implement kar deta hoon.
