# Signal Accuracy Upgrade Plan — Target 85% Win Rate

Goal: **85% accuracy** — yani sirf woh setups broadcast hon jo historically 85 mein se 85 nahi, par 85/100 baar jeetein. Yeh sirf ek tarah se possible hai: signal count bohot kam karke (hafte mein ~2-5), aur har signal ko multi-layer confirmation + calibration se guzaar kar. Beech ke "borderline 75%" signals — jo abhi wrong nikal rahe hain — poori tarah band ho jayenge.

Honest note: 85% ek measurable target hai, guarantee nahi. Isliye plan mein har change ke baad stored history par replay karke actual hit-rate measure kiya jayega, aur threshold tab tak upar khisakaya jayega jab tak rolling 30-din ka win-rate 85% par na baithe.


## Current state (verified)

- `src/lib/signals/qualification.ts` — single gate for manual + auto scan: `MIN_CONFIDENCE = 75`, `MIN_RR = 2`, killzone gate (75% se upar bypass hota hai jab conf >= 85), HTF bias gate (lekin `conf >= 75` hone par bias conflict bhi allow ho jaata hai), freshness check.
- `src/lib/analysis/engine.ts` — weighted factor scoring (bias, sweep, structure, SMT, DXY, session), vetoes score se points minus karte hain lekin trade block nahi karte.
- `signal_paper_trades` table outcomes store karta hai (`src/lib/signals/outcome-resolver.ts`), par yeh data wapas scoring mein feed nahi hota.

## Problem points jo wrong signals paida karte hain

1. **Confidence escape hatches** — `conf >= 75` HTF bias conflict ko maaf kar deta hai, yani counter-trend trades minimum threshold par hi pass ho jaate hain. Yehi sabse bara loss source hai.
2. **Vetoes soft hain** — high-impact news, no-sweep, structure conflict sirf score kam karte hain; A-grade setup phir bhi nikal sakta hai.
3. **Koi learning loop nahi** — pichle trades ke results (`signal_paper_trades`) confidence ko adjust nahi karte, halanki `signal_confidence_memory` table maujood hai.
4. **Ek confluence gin-ti nahi** — score % pass ho sakta hai bina teen core ICT confluences (HTF bias + liquidity sweep + CHoCH/BOS + valid POI) ke.

## Kya banega

### 1. Hard confluence requirement (sabse bara impact)
Score ke saath-saath ek **mandatory checklist**: HTF bias alignment, liquidity sweep, market-structure shift, aur valid POI (FVG/OB) mein se kam se kam 3 satisfy hone chahiye, aur HTF bias alignment mandatory. Counter-trend "conf >= 75 bypass" hata diya jayega — counter-trend sirf tab jab conf >= 88 **aur** sweep + CHoCH dono confirm hon.

### 2. Vetoes ko real veto banana
High-impact news window, spread/volatility spike, aur conflicting HTF structure ab score minus nahi karenge — sidha reject karenge with reason logged.

### 3. Session + regime discipline
- Sirf London aur NY killzones mein broadcast (Asia sirf conf >= 90 par).
- Ranging regime mein trend-following setups block; trending regime mein mean-reversion block.

### 4. Confidence calibration loop
`signal_paper_trades` ke resolved outcomes se per-factor hit-rate nikaal kar `signal_confidence_memory` mein store karna, aur scoring mein un factors ka weight adjust karna jo historically fail hote hain. Rolling 30-day window.

### 5. Post-signal invalidation
Broadcast ke baad agar price entry se ~40% risk-distance SL ki taraf chala jaye entry fill hone se pehle, ticket auto-cancel ho (abhi sirf pre-broadcast freshness check hai).

### 6. Transparency
Har signal ke saath "kyun liya" (passed confluences) aur har HOLD ke saath "kyun nahi liya" (reject reason) dashboard/alert mein dikhega, taake accuracy trace ho sake.

## Expected result

Signals per day ghat kar shayad 0-2 reh jayenge (abhi threshold par jitne bhi bante hain), lekin win rate + average R materially improve hona chahiye. Main verification ke liye pichle 30 din ke stored scans par naye gates ko replay karke before/after hit-rate compare karunga.

## Technical notes

- Files: `src/lib/signals/qualification.ts` (gates), `src/lib/analysis/engine.ts` (veto/confluence/regime), `src/routes/api/public/hooks/auto-scan.ts` (invalidation + reason logging), naya `src/lib/signals/calibration.ts`.
- DB: `signal_confidence_memory` mein rolling factor stats likhna; koi naya table zaroori nahi (schema confirm karke rakhunga).
- Manual aur auto dono ek hi `qualifySignal` gate use karte rahenge — drift nahi hoga.
