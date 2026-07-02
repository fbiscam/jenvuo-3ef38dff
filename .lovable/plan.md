
## Diagnosis

Aap ne 3 real issues report kiye hain — main ne code trace kiya, teeno ka pakka root cause mil gaya:

### 1) Price live nahi update hoti
`computeSignalPlan` sirf cached 15m candles use karta hai (candle cache TTL = 60s, `fetchInstrumentCandles`). `last.c` (last candle close) hi `lastPrice` banta hai — jo aakhri 15m candle band hone tak stale rehta hai. Kabhi 5–15 min tak real market 120$ hota hai jab code me 110$ dikhata hai. Live tick endpoint (`getLiveTick`) already exists lekin plan use hi nahi karta.

### 2) Har pair pe same ~40% confidence
`scoreSetup` me hard-veto gates hain (`no_sweep`, `rr_low < 1.8`, `mitigated`, `bias_conflict`, `news`). Jaise hi koi ek fire ho — score forcibly `Math.min(score, 40)` ho jata hai. Real world me:
- `no_sweep` almost hamesha fire hota hai — HTF Swing High/Low pools `swept: false` hard-coded hain, aur off-hours pe PDH/PDL sweep detect nahi hota → veto → 40 cap.
- `rr_low` bhi common — engine TP ko 2R–3R me clamp karta hai, buffer widening ke baad RR aksar 1.5–1.9 aa jata hai → veto → 40 cap.
- Unknown factors (SMT null, DXY null, structureQuality null) `pass=false` count hote hain, denominator me weight rehta hai → score aur ghat jata hai.

Result: crypto/forex/stocks sab me score 38–42 → grade "C" → confidence 40%.

### 3) Entry aur SL/TP galat prices pe
Same stale-price bug ka side effect. `buildTrade(htfA, ltfA, pools, last.c, ...)` me `lastPrice = last.c` (stale). Zone filter `f.priceHigh <= lastPrice` stale price ke against check karta hai — isliye zone select hota hai jo real market se 10–15$ door hai. Entry midpoint bhi is stale zone ka hai. Jab UI live tick dikhata hai (real $120), engine ka entry/SL/TP stale $110 world me calculate hua hota hai.

---

## Fix Plan

### A) `src/lib/gold-analysis.functions.ts` → `computeSignalPlan`

1. Fresh live tick fetch karo parallel me:
   ```
   const liveTick = inst.binanceSymbols?.length
     ? await fetchBinanceQuote(inst.binanceSymbols)
     : inst.yahooSymbols?.length
       ? await fetchYahooQuote(inst.yahooSymbols)
       : null;
   const livePrice = liveTick?.price ?? last.c;
   ```
2. Har jagah jahan `last.c` use hota tha as "current price", `livePrice` use karo:
   - `buildTrade(htfA, ltfA, pools, livePrice, atr, inst.kind)`
   - `zoneMitigated` check aur `dxyConfirms` calc me
   - Final `plan.currentPrice = livePrice`
3. Candle cache TTL shorten karo — 60s → 20s (LTF freshness ke liye), aur last candle ko `livePrice` se overwrite karo tail me taaki analysis mid-candle sahi ho.

### B) `src/lib/analysis/engine.ts` → `scoreSetup` (soft-veto refactor)

1. **Hard-cap ki jagah per-veto deduction** — 40 me pin karna galat hai. Change:
   ```
   if (vetos.length > 0) score = Math.max(30, score - vetos.length * 15);
   ```
   Multiple vetoes hone pe hi grade C rahe, single veto sirf downgrade kare.
2. **`no_sweep` veto ko sirf metal/forex/index tak limit karo** — crypto 24/7 hai, HTF Swing High/Low sweep detection unreliable hai. Crypto ke liye skip.
3. **`rr_low` threshold 1.8 → 1.5** — engine already 2R floor karta hai, 1.8 se strict double-penalty hai.
4. **Unknown factors ko fail count na karo** — jab `smtDivergence == null` ya `dxyConfirms == null` ya `structureQuality == null` ho, us factor ko `f` list me push hi na karo (weight se drop). Denominator natural re-normalize ho jayega.
5. Score floor grade thresholds waise hi rahenge (A+ ≥ 88, A ≥ 75, B ≥ 60).

### C) `src/lib/analysis/engine.ts` → `buildLiquidityPools`

HTF Swing High/Low pools ko dynamic swept check do (currently hard-coded `swept: false`):
```
swept: ltf.slice(-12).some(c => c.h >= sh - tol),  // for high
swept: ltf.slice(-12).some(c => c.l <= sl + tol),  // for low
```
Isse `no_sweep` veto sirf actually-unswept setups pe hi fire hoga.

---

## Files to change

- `src/lib/gold-analysis.functions.ts` — inject live tick into `computeSignalPlan`, propagate `livePrice`, shorten candle cache TTL.
- `src/lib/analysis/engine.ts` — soften veto scoring, drop unknown factors from denominator, dynamic swept flags on HTF swing pools.

## Not changing

- UI (`signal.tsx`, `SignalCard`) — koi visual change nahi, sirf sahi numbers milenge.
- `buildTrade` core logic (SL/TP formulas, per-asset risk profile) — already sahi hai, sirf sahi `lastPrice` chahiye.
- Database, credits, AI narration prompts — untouched.

## Expected result

- Signal me price real live market ke andar 1–3 seconds fresh hoga.
- Confidence har pair pe alag alag aayega — good setups 70–90%, weak setups 45–65%, only true rejects 30–40%.
- Entry/SL/TP live price ke around calculate honge, stale $10–$15 offset khatam.

Approve karo, ma implement karta ho.
