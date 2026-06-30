
## Problem

Charts pe markings nahi aa rahin kyunki `/signal` page ab `TradingViewChart` (TV ka iframe embed) use kar raha hai. Iframe ke andar hum programmatically draw nahi kar sakte, isliye `htfRef.current?.drawMarking(...)` / `focusMarking(...)` calls silently no-op ho rahe hain. Agent bolta hai "yeh FVG hai, yeh BOS hai" — par chart pe kuch nahi banta.

Saath hi user chahta hai:
- Ek waqt mein sirf **ek hi marking visible** ho (BOS dikhe → fade out → fir FVG draw ho → fade out → fir OB, etc.).
- Marking par chart **auto pan/zoom** kare (aage-piche scroll), taa ke woh zone center mein clearly dikhe.
- Labels proper ICT/SMC naming: `BOS`, `CHoCH`, `FVG`, `OB` (Bullish/Bearish), `Liquidity Sweep`, `EQH/EQL`, `OTE`, `Premium/Discount`, `Entry/SL/TP`.

## Solution

Drawable chart wapas laao (`SignalChart` — lightweight-charts based, ref API already exists: `drawMarking` / `focusMarking` / `clear`), aur narration loop ko "single active marking + auto-pan" model par switch karo.

### 1. Chart layer

- `src/routes/signal.tsx` mein HTF aur LTF panes ko wapas `SignalChart` se render karo (refs already wired: `htfRef`, `ltfRef`).
- `TradingViewChart` ko sirf ek optional "Pro view" toggle ke peeche rakho (default off), kyunki TV iframe pe draw nahi ho sakta. Default experience = drawable chart.
- `SignalChart` ke andar ek naya method add karo: `panToMarking(m)` — chart ka visible range marking ke center ke around set kare (e.g. ±40 candles), aur `clearTransient()` jo sirf last drawn "transient" marking ko hata de (static context zones jaise Premium/Discount/OTE chhode).

### 2. Sequential narration lifecycle

`runNarration` aur `SignalVoiceAgent` ke `annotate` flow ko aise badlo:

```text
for each narration step n:
  1. clearTransient()                  // pichli BOS/FVG/OB hata do
  2. drawMarking(n.marking) as transient
  3. panToMarking(n.marking)           // chart aage/piche scroll
  4. await speakWait(n.say)            // tab tak voice bolta rahe
  5. small fade-out delay (250ms)
final:
  draw Entry + SL + TP together (persistent)
  pan to entry
```

Static context zones (Premium / Discount / OTE / EQH / EQL / Liquidity pools) `clearTransient()` se nahi hatengi — woh background context ke liye plan ke shuru mein draw hoti hain aur poora narration tak rehti hain.

### 3. Labels & color coding

`SignalChart.drawMarking` ke labels ko ICT/SMC standard naming par fix karo:
- `BOS` (Break of Structure) — solid arrow + label
- `CHoCH` (Change of Character) — dashed arrow
- `FVG` — translucent rectangle (Bullish = emerald, Bearish = rose)
- `OB` — solid bordered box, "Bullish OB" / "Bearish OB"
- `Liquidity Sweep` — amber wick highlight + label
- `EQH` / `EQL` — violet dashed horizontal line
- `OTE` — yellow zone (0.62–0.79 fib)
- `Entry / SL / TP1 / TP2` — final reveal lines

Legend strip already exists below LTF — usko in exact labels se sync karo.

### 4. Voice agent annotation path

`SignalVoiceAgent` (lines ~1055–1180) currently up to 2 markings draw karta hai aur kabhi clear nahi karta. Wahan bhi same single-active rule lagao: har naye agent reply pe `clearTransient()` → matched marking draw + pan → speak.

### 5. Candle accuracy

Backend already real OHLC return karta hai. SignalChart ko ensure karo ke woh `plan.candles.htf` / `plan.candles.ltf` (1h aur 15m) ko hi use kare aur live last-candle ko Binance/Yahoo quote se update kare — TradingView jaisi accuracy ke liye yahi enough hai.

## Files to change

- `src/components/SignalChart.tsx` — add `panToMarking`, `clearTransient`; tighten label rendering for BOS/CHoCH/FVG/OB/Liquidity/EQH/EQL/OTE.
- `src/routes/signal.tsx` —
  - HTF + LTF panes ko `SignalChart` par revert.
  - `runNarration` ko sequential single-active flow par re-write (step 2 above).
  - `SignalVoiceAgent` ke annotate block ko same lifecycle par laao.
  - `TradingViewChart` import optional rakh sakte hain ya hata sakte hain.

## Out of scope

- TV embed ke upar overlay drawing (iframe coords reliable nahi).
- Naye marking types (Breaker block, Mitigation block) — abhi current set par focus.

Confirm karo to main build mode mein implement kar deta hoon.
