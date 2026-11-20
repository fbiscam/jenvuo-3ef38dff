JX BOT v4.05 / OWNER v26.18 — SOURCE PACKAGE
==========================================
This contains MQL5 source, not a compiled EX5. Customer downloads are not
replaced by this package. Compile and test it in MetaEditor/MT5 first.

APPROVED CHANGES
- Each signal opens one cluster of up to 3 trades, as before.
- NO Level 2, averaging, recovery additions or refilling a partial cluster.
- Confirmed M15 structure invalidation applies equally in profit and loss.
- Last CLOSED M15 candle must be opposite the basket, have a real body
  of at least 50% of its range, close at least 0.2 ATR(14) beyond the swing
  of the previous 5 closed candles, AND close beyond the M15 EMA50 against
  the basket. The break candle is excluded from the swing calculation.
- The entry candle is eligible once it closes; no extra full-candle wait.
- A wick alone, a small body or a close inside the swing does not qualify.
- Old standalone engulfing/H1-flip exits no longer close valid pullbacks.
- Once invalidation is confirmed, closing is retried on subsequent ticks
  until all owned positions of that side are gone. No same-bar re-entry.

UNCHANGED
- EUR/USD M15; 7-pip basket TP; 0.05 lot per $1,000 per trade; magic 9244.
- All-day Auto Break-Even and Trailing Step remain OFF.
- 4.7% peak-closed-balance daily drawdown guard; plan targets Pro 2%,
  Elite 4%, Ultra 6%, received from the website.
- PKT new-entry hours: 04:00–11:15 and 12:30–17:00; NY fully OFF.
- Existing session, news, Friday and dynamic profit protections remain.
  IMPORTANT: the legacy pre-session break-even guard at 06:15–09:00 UTC
  remains ON, as in v4.04; session/news/profit locks can still close green
  trades independently of structure. Only all-day BE/trailing are OFF.
- Existing licensing and minute-by-minute website reporting unchanged.

COMPILE / INSTALL
1. In MetaEditor, open Source Code/Jenvu EA.mq5 and press F7.
2. Require zero compile errors. Copy the resulting EX5 to MQL5/Experts.
3. Add https://jenvu.com to MT5 Options > Expert Advisors > WebRequest URLs.
4. Register your PC/RDP IP on the JX Bot page, then enter it in MyIP.
5. Attach to EURUSD M15, load the included preset, enable Algo Trading.
6. Remove old bot instances before attaching this build. Prefer replacing
   the old version only when its open baskets have been closed safely.

VALIDATION BEFORE LIVE USE
Run Strategy Tester (Ctrl+R), EURUSD M15, Every tick based on real ticks.
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