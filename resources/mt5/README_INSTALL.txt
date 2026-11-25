JX BOT v4.09 — OWNER SOURCE PACKAGE
==========================================
This contains MQL5 source, not a compiled EX5. Customer downloads are not
replaced by this package. Compile and test it in MetaEditor/MT5 first.

APPROVED CHANGES
v4.09 (new)
- FVG removed from the bot: Trap Shield entry filter and FVG profit guard
  are both OFF. FVGs no longer block entries or close trades early.
- Hard stop: a basket closes at 7.5 pips against its average price.
- Exhaustion guard: no SELL when the last 12 M15 candles fell 25+ pips and
  RSI < 25; no BUY when they rose 25+ pips and RSI > 75.
- TP 5 pips, lot 0.05 per $1,000 and the 4.7% daily drawdown are unchanged.

v4.08 (older notes below)
- 5-pip EA-managed basket TP for ALL trades, BUY and SELL alike.
- FVG entry buffer reduced to 0.2 M15 ATR. Supply/demand buffer remains
  1.0 ATR; its existing logic is unchanged.
- FVG-only profit guard: an executable quote touching/crossing an ACTIVE
  opposing FVG arms the guard only at >=3.5 pips profit. An armed trade
  requests a close if profit returns to <=2 pips. Breaking through the
  FVG can still reach 5-pip TP. Supply/demand alone never arms this guard.
- Arming persists per position across restarts; triggered closes retry.
  It is a virtual profit floor, NOT a broker stop or guaranteed +2 fill.
  Before arming, ordinary pullbacks do not trigger this new exit.
  Existing independent exits still apply. No opposite-direction entry
  or new FVG entry strategy is added.
v4.07 (new)
- Layer 1 Trap Shield: no SELL when price is inside or within 1 M15 ATR
  above an active bullish FVG or demand zone; no BUY inside or within
  1 ATR below an active bearish FVG or supply zone. Scans the last 20
  closed M15 candles; a zone dies once a candle closes through it.
  FVG and zones are checked separately. The shield only removes entries.
- Layer 2 Local invalidation: anchor = high (sell) / low (buy) of the 5
  closed M15 candles before entry. Exit when a closed M15 candle has a
  >=50% body and closes >=0.1 ATR beyond it. Wicks never count. No fixed
  pip stop. The old swing exit still runs; whichever confirms first.
v4.06
- Each signal opens ONE consolidated order (ClusterSize = 1).
- Total exposure stays equivalent to the old three BaseLot orders:
  BaseLot still uses 0.05 lot per $1,000; one order uses 3 x BaseLot,
  normalized to the broker's per-order maximum. Example: at $1,000,
  three 0.05 orders become one 0.15 order, not one 0.05 order.
  If capped by the broker, exposure may be lower; no extra order is added.
  Fewer tickets do NOT guarantee commission savings: per-lot commission
  is normally similar at the same total volume; check the broker's tariff.
- NO Level 2, averaging, recovery additions or refilling a partial cluster.
- Confirmed M15 structure invalidation applies equally in profit and loss.
- Last CLOSED M15 candle must be opposite the basket, have a real body
  of at least 50% of its range, close at least 0.2 ATR(14) beyond the most
  recent confirmed swing BEFORE ENTRY. No EMA50 confirmation delays exits.
- Swing low (buy) / high (sell) must be strictly lower / higher than TWO
  candles on each side, all fully closed before entry. Search the newest
  50 pre-entry pivot candidates; no confirmed pivot means no structure exit.
  The anchor never moves to post-entry candles. Other protections still run.
  0.2 ATR is a variable volatility buffer, NOT a fixed 2.5–3 pips.
- The entry candle is eligible once it closes; no extra full-candle wait.
- A wick alone, a small body or a close inside the swing does not qualify.
- Old standalone engulfing/H1-flip exits no longer close valid pullbacks.
- Once invalidation is confirmed, closing is retried on subsequent ticks
  until all owned positions of that side are gone. No same-bar re-entry.

UNCHANGED
- Original MA signals and every existing entry filter unchanged.
- EUR/USD M15; BaseLot rate unchanged; magic 9244. TP is now 5 pips.
- All-day Auto Break-Even, legacy Pre-Session Break-Even and Trailing Step
  are OFF. No new hard stop-loss or fixed-dollar loss cutoff is added.
- 4.7% peak-closed-balance daily drawdown guard; plan targets Pro 2%,
  Elite 4%, Ultra 6%, received from the website.
- PKT new-entry hours: 04:00–11:15 and 12:30–17:00; NY fully OFF.
- Existing session, news, Friday and dynamic profit protections remain.
  IMPORTANT: session/news/Friday and the existing money-based dynamic
  profit lock can still close green trades independently of structure.
  Those existing protections and the existing percent loss-cut are unchanged.
- Existing licensing and minute-by-minute website reporting unchanged.

COMPILE / INSTALL
1. In MetaEditor, open Source Code/Jenvu EA.mq5 and press F7.
2. Require zero compile errors. Copy the resulting EX5 to MQL5/Experts.
3. Add https://jenvu.com to MT5 Options > Expert Advisors > WebRequest URLs.
4. Register your PC/RDP IP on the JX Bot page, then enter it in MyIP.
5. Attach to EURUSD M15, enable Algo Trading. The preset is optional:
   it contains only MyIP, lotSize and magic; protection defaults are built
   into this source. Enter MyIP after loading if you choose the preset.
6. Remove old bot instances before attaching this build. Prefer replacing
   the old version only when its open baskets have been closed safely.

VALIDATION BEFORE LIVE USE
Run Strategy Tester (Ctrl+R), EURUSD M15, Every tick based on real ticks.
Verify both sides reach 5-pip TP, distant FVGs no longer block at 1 ATR,
FVG touches below 3.5 pips do not arm, and armed pullbacks request close
at 2 pips. Test restart persistence, rejected closes and price gaps.
Test both buy/sell reversals, profit/loss baskets, small pullbacks, spread
spikes and attempted recovery after an adverse 20–25-pip move. Confirm
there are no recovery additions, and check the Experts/Journal close logs.
Then forward-test on demo. News filtering and website calls are skipped
in the tester; live session/news behavior needs demo verification too.
OnTester prints profit, trades, win rate, profit factor and drawdown.

LIMITATIONS
This is candle-close confirmation, not a prediction or a fixed dollar stop.
An exit can wait up to 15 minutes for a candle to close. A qualifying
reversal can later recover; no filter perfectly separates reversals and
pullbacks. Loss/profit at execution depends on lot size, spread, slippage,
gaps, ticks, connectivity and broker execution. Neither a $12–$18 maximum
loss nor prevention of a $75 loss is guaranteed. Positions use EA-managed
exits, not broker-side SL/TP; the terminal must stay online.
Native predicate regressions are not an MT5 compile or trading backtest.