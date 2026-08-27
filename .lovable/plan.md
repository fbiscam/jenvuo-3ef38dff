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

## Kya banega (85% target ke liye)

### 1. Threshold uthana: 75% → 85% (A+ only)
`MIN_CONFIDENCE` 85 kar diya jayega, aur DB config (`system_settings.auto_scan_config.min_conf`, `single_hit_min_conf`) bhi 85 par sync. Sirf A/A+ grade broadcast honge. Beech ke 75-84% signals — jo aaj wrong nikal rahe hain — ab HOLD honge.

### 2. Hard confluence requirement (sabse bara impact)
Score ke saath ek **mandatory checklist**: HTF bias alignment (must), liquidity sweep, market-structure shift (CHoCH/BOS), valid POI (FVG/OB), aur premium/discount positioning — in paanch mein se kam se kam 4 chahiye. Counter-trend "conf >= 75 bypass" khatam; counter-trend sirf conf >= 92 + sweep + CHoCH dono par.

### 3. Vetoes ko real veto banana
High-impact news window, spread/volatility spike, conflicting HTF structure, aur weekend/rollover windows ab score minus nahi karenge — sidha reject with logged reason.

### 4. Session + regime discipline
- Broadcast sirf London aur NY killzones mein; Asia session band (conf >= 95 exception).
- Ranging regime mein trend-following block, trending regime mein mean-reversion block.
- Ek din mein max 2 signals, aur ek hi pair par ek waqt mein ek hi open ticket (existing duplicate guard extend hoga).

### 5. Confidence calibration loop (85% ko maintain karne wali cheez)
`signal_paper_trades` ke resolved outcomes se per-factor aur per-session hit-rate nikaal kar `signal_confidence_memory` mein rolling 30-day store karna. Jo factor/session historically <85% deta hai, uska weight khud-ba-khud girega aur us combination par threshold uthega. Yani system apne aap 85% ki taraf tune hota rahega.

### 6. Post-signal invalidation
Broadcast ke baad, entry fill hone se pehle agar price ~40% risk-distance SL ki taraf chala jaye ya news window khul jaye, ticket auto-cancel — taake wo losses stats mein na aayein aur user galat entry na le.

### 7. Transparency + accuracy dashboard
Har signal ke saath "kyun liya" (passed confluences) aur har HOLD ke saath "kyun nahi liya" (reject reason). Saath mein rolling win-rate / avg-R panel, taake 85% target live measurable rahe.

## Expected result

Signals bohot kam — roughly hafte mein 2-5 (kuch din bilkul HOLD). Yehi 85% ki keemat hai. Verification: pichle 30-60 din ke stored scans + paper trades par naye gates replay karke before/after win-rate compare karunga; agar replay 85% se neeche aata hai to threshold aur confluence count aur upar kiya jayega, phir dobara measure.


## Technical notes

- Files: `src/lib/signals/qualification.ts` (gates), `src/lib/analysis/engine.ts` (veto/confluence/regime), `src/routes/api/public/hooks/auto-scan.ts` (invalidation + reason logging), naya `src/lib/signals/calibration.ts`.
- DB: `signal_confidence_memory` mein rolling factor stats likhna; koi naya table zaroori nahi (schema confirm karke rakhunga).
- Manual aur auto dono ek hi `qualifySignal` gate use karte rahenge — drift nahi hoga.
