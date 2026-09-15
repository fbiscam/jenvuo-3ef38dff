"use strict";
(() => {
  const TF_MS = { "5m": 300000, "15m": 900000, "1h": 3600000, "4h": 14400000 };
  const YF = { "5m": ["5m", "60d"], "15m": ["15m", "60d"], "1h": ["60m", "730d"], "4h": ["60m", "730d"] };
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const round = (n, d = 2) => Number(n.toFixed(d));
  const avg = (xs) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
  const sigmoid = (x) => 1 / (1 + Math.exp(-clamp(x, -20, 20)));

  async function requestJson(url) {
    if (globalThis.chrome?.runtime?.id) {
      const response = await chrome.runtime.sendMessage({ type: "jenvu-fetch", url });
      if (!response?.ok) throw new Error(response?.error || "Gold feed unavailable");
      return response.data;
    }
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Gold feed unavailable (${response.status})`);
    return response.json();
  }

  async function fetchCandles(tf, limit = 900) {
    const [interval, range] = YF[tf] || YF["5m"];
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent("GC=F")}?interval=${interval}&range=${range}&includePrePost=true`;
    const result = (await requestJson(url))?.chart?.result?.[0];
    const timestamps = result?.timestamp || [];
    const quote = result?.indicators?.quote?.[0] || {};
    const step = TF_MS[tf];
    const now = Date.now();
    const raw = [];
    for (let i = 0; i < timestamps.length; i++) {
      const c = { t: timestamps[i] * 1000, o: Number(quote.open?.[i]), h: Number(quote.high?.[i]), l: Number(quote.low?.[i]), c: Number(quote.close?.[i]), v: Number(quote.volume?.[i]) || 0 };
      if ([c.o, c.h, c.l, c.c].every(Number.isFinite) && c.t + step <= now) raw.push(c);
    }
    if (tf !== "4h") return raw.slice(-limit);
    const grouped = [];
    for (let i = 0; i + 3 < raw.length; i += 4) {
      const set = raw.slice(i, i + 4);
      grouped.push({ t: set[0].t, o: set[0].o, h: Math.max(...set.map(x => x.h)), l: Math.min(...set.map(x => x.l)), c: set[3].c, v: set.reduce((s, x) => s + x.v, 0) });
    }
    return grouped.slice(-limit);
  }

  function ema(candles, period, at = candles.length - 1) {
    const start = Math.max(0, at - period * 3);
    const k = 2 / (period + 1);
    let value = candles[start]?.c || 0;
    for (let i = start + 1; i <= at; i++) value = candles[i].c * k + value * (1 - k);
    return value;
  }
  function atr(candles, period = 14, at = candles.length - 1) {
    const values = [];
    for (let i = Math.max(1, at - period + 1); i <= at; i++) values.push(Math.max(candles[i].h - candles[i].l, Math.abs(candles[i].h - candles[i - 1].c), Math.abs(candles[i].l - candles[i - 1].c)));
    return avg(values) || candles[at].c * 0.001;
  }
  function swings(candles, at = candles.length - 1, depth = 2, lookback = 80) {
    const highs = [], lows = [];
    for (let i = Math.max(depth, at - lookback); i <= at - depth; i++) {
      const area = candles.slice(i - depth, i + depth + 1);
      if (area.every((x, j) => j === depth || candles[i].h > x.h)) highs.push({ i, p: candles[i].h });
      if (area.every((x, j) => j === depth || candles[i].l < x.l)) lows.push({ i, p: candles[i].l });
    }
    return { highs, lows };
  }
  function structure(candles, at = candles.length - 1) {
    const s = swings(candles, at);
    const hs = s.highs.slice(-2), ls = s.lows.slice(-2);
    let trend = "RANGE", event = "No confirmed BOS/CHoCH";
    if (hs.length === 2 && ls.length === 2) {
      const bull = hs[1].p > hs[0].p && ls[1].p > ls[0].p;
      const bear = hs[1].p < hs[0].p && ls[1].p < ls[0].p;
      trend = bull ? "BULLISH" : bear ? "BEARISH" : "RANGE";
      const close = candles[at].c;
      if (close > hs[1].p) event = `Bullish BOS above ${round(hs[1].p)}`;
      else if (close < ls[1].p) event = `Bearish BOS below ${round(ls[1].p)}`;
      else if (bull && close < ls[1].p) event = `Bearish CHoCH below ${round(ls[1].p)}`;
      else if (bear && close > hs[1].p) event = `Bullish CHoCH above ${round(hs[1].p)}`;
    }
    return { trend, event, ...s };
  }
  function regime(candles, at = candles.length - 1) {
    const p = candles[at].c, a = atr(candles, 14, at), e9 = ema(candles, 9, at), e21 = ema(candles, 21, at), e50 = ema(candles, 50, at);
    const volatility = a / p * 100;
    const separation = Math.abs(e9 - e21) / p * 100;
    const aligned = (e9 > e21 && e21 > e50) || (e9 < e21 && e21 < e50);
    const recent = candles.slice(Math.max(0, at - 20), at + 1);
    const range = (Math.max(...recent.map(x => x.h)) - Math.min(...recent.map(x => x.l))) / p * 100;
    const label = volatility > 0.65 ? "VOLATILE" : aligned && separation > 0.025 ? "TRENDING" : range < volatility * 4 ? "RANGING" : "REVERSAL RISK";
    return { label, volatility, favorable: label === "TRENDING", e9, e21, e50 };
  }
  function ict(candles, at = candles.length - 1) {
    const cur = candles[at], prev = candles[at - 1], before = candles[at - 2], s = swings(candles, at);
    const lastHigh = s.highs.at(-1)?.p, lastLow = s.lows.at(-1)?.p;
    const bullSweep = Number.isFinite(lastLow) && cur.l < lastLow && cur.c > lastLow;
    const bearSweep = Number.isFinite(lastHigh) && cur.h > lastHigh && cur.c < lastHigh;
    let fvg = null;
    if (before && before.h < cur.l) fvg = { side: "BULLISH", low: before.h, high: cur.l };
    if (before && before.l > cur.h) fvg = { side: "BEARISH", low: cur.h, high: before.l };
    const displacement = Math.abs(cur.c - cur.o) > atr(candles, 14, at) * 0.7 && Math.abs(cur.c - cur.o) / Math.max(1e-9, cur.h - cur.l) > 0.65;
    const window = candles.slice(Math.max(0, at - 50), at + 1);
    const high = Math.max(...window.map(x => x.h)), low = Math.min(...window.map(x => x.l)), eq = (high + low) / 2;
    const zone = cur.c < eq ? "DISCOUNT" : "PREMIUM";
    const ob = prev ? { side: prev.c < prev.o ? "DEMAND" : "SUPPLY", low: prev.l, high: prev.h } : null;
    return { bullSweep, bearSweep, fvg, displacement, high, low, eq, zone, ob };
  }
  function tfSignal(candles, at = candles.length - 1) {
    const st = structure(candles, at), rg = regime(candles, at), p = candles[at].c;
    const raw = (st.trend === "BULLISH" ? 1 : st.trend === "BEARISH" ? -1 : 0) + Math.sign(rg.e9 - rg.e21) + Math.sign(p - rg.e50) * 0.6;
    return { direction: raw > 0.45 ? "BUY" : raw < -0.45 ? "SELL" : "WAIT", score: clamp(raw / 2.6, -1, 1), structure: st, regime: rg };
  }

  function historicalValidation(candles) {
    let tested = 0, correct = 0, tradeWins = 0, tradeLosses = 0, rTotal = 0, peak = 0, equity = 0, maxDrawdown = 0;
    const byRegime = {};
    const start = Math.max(80, candles.length - 360);
    for (let i = start; i < candles.length - 1; i++) {
      const sig = tfSignal(candles, i), rg = sig.regime.label;
      if (sig.direction === "WAIT" || Math.abs(sig.score) < 0.42) continue;
      const actual = candles[i + 1].c > candles[i + 1].o ? "BUY" : "SELL";
      const won = actual === sig.direction;
      tested++; if (won) correct++;
      byRegime[rg] ||= { tested: 0, correct: 0 }; byRegime[rg].tested++; if (won) byRegime[rg].correct++;
      const r = won ? 1.5 : -1; rTotal += r; equity += r; peak = Math.max(peak, equity); maxDrawdown = Math.max(maxDrawdown, peak - equity);
      if (won) tradeWins++; else tradeLosses++;
    }
    Object.values(byRegime).forEach(x => x.accuracy = x.tested ? x.correct / x.tested * 100 : 0);
    return { tested, accuracy: tested ? correct / tested * 100 : 0, winRate: tradeWins + tradeLosses ? tradeWins / (tradeWins + tradeLosses) * 100 : 0, expectancy: tested ? rTotal / tested : 0, maxDrawdown, byRegime };
  }

  function project(candles, direction, baseConfidence, rg) {
    const last = candles.at(-1).c, a = atr(candles), sign = direction === "BUY" ? 1 : direction === "SELL" ? -1 : 0;
    const vol = rg.label === "VOLATILE" ? 1.25 : rg.label === "RANGING" ? 0.75 : 1;
    let open = last;
    return [1, 2, 3].map(step => {
      const decay = [1, 0.82, 0.67][step - 1], move = a * (0.28 + Math.abs(baseConfidence - 50) / 100) * decay * sign;
      const close = open + move, pad = a * 0.42 * vol;
      const item = { step, direction: sign > 0 ? "UP" : sign < 0 ? "DOWN" : "WAIT", confidence: round(50 + (baseConfidence - 50) * decay, 0), open: round(open), high: round(Math.max(open, close) + pad), low: round(Math.min(open, close) - pad), close: round(close) };
      open = close; return item;
    });
  }

  function normalizeProbabilities(buyRaw, sellRaw, noTradeRaw) {
    const sum = Math.max(1e-9, buyRaw + sellRaw + noTradeRaw);
    let buy = Math.round(buyRaw / sum * 100), sell = Math.round(sellRaw / sum * 100);
    return { buy, sell, noTrade: 100 - buy - sell };
  }

  async function analyze(timeframe = "5m") {
    const [m5, m15, h1, h4] = await Promise.all([fetchCandles("5m"), fetchCandles("15m"), fetchCandles("1h"), fetchCandles("4h")]);
    if ([m5, m15, h1, h4].some(x => x.length < 80)) throw new Error("Not enough completed Gold candles yet.");
    const execution = { "5m": m5, "15m": m15, "1h": h1, "4h": h4 }[timeframe] || m5;
    const signals = { m5: tfSignal(m5), m15: tfSignal(m15), h1: tfSignal(h1), h4: tfSignal(h4) };
    const weighted = signals.m5.score * 0.15 + signals.m15.score * 0.25 + signals.h1.score * 0.3 + signals.h4.score * 0.3;
    const dir = weighted > 0.12 ? "BUY" : weighted < -0.12 ? "SELL" : "WAIT";
    const aligned = Object.values(signals).filter(x => x.direction === dir).length;
    const detail = ict(execution), rg = regime(execution), validation = historicalValidation(execution);
    const recentReg = validation.byRegime[rg.label];
    const baseEdge = sigmoid(Math.abs(weighted) * 3.2 + (aligned - 2) * 0.35 + (detail.displacement ? 0.3 : 0) + ((dir === "BUY" && detail.bullSweep) || (dir === "SELL" && detail.bearSweep) ? 0.45 : 0));
    const calibrated = validation.tested >= 30 ? baseEdge * 0.58 + clamp(validation.accuracy / 100, 0.35, 0.72) * 0.42 : baseEdge * 0.7;
    const conflict = signals.h1.direction !== signals.h4.direction || signals.m5.direction !== signals.m15.direction;
    const staleMs = Date.now() - execution.at(-1).t;
    const stale = staleMs > TF_MS[timeframe] * 4;
    const newsVerified = false;
    const reasons = [];
    if (conflict) reasons.push("Higher and lower timeframes conflict");
    if (rg.label === "VOLATILE") reasons.push("Volatility is outside the preferred scalping regime");
    if (aligned < 3) reasons.push(`Only ${aligned}/4 timeframes align`);
    if (validation.tested < 30) reasons.push("Validation sample is too small");
    if (recentReg?.tested >= 15 && recentReg.accuracy < 48) reasons.push(`${rg.label} validation has weakened`);
    if (stale) reasons.push("Market feed is stale or market is closed");
    const tradeProbability = clamp(calibrated * (conflict ? 0.62 : 1) * (rg.label === "VOLATILE" ? 0.65 : 1), 0.12, 0.84);
    const directional = dir === "BUY" ? [tradeProbability, (1 - tradeProbability) * 0.35] : dir === "SELL" ? [(1 - tradeProbability) * 0.35, tradeProbability] : [0.25, 0.25];
    const probs = normalizeProbabilities(directional[0], directional[1], clamp(1 - tradeProbability + reasons.length * 0.07, 0.12, 0.75));
    const final = reasons.length || Math.max(probs.buy, probs.sell) < 55 ? "WAIT" : dir;
    const current = execution.at(-1).c, a = atr(execution), sign = final === "BUY" ? 1 : final === "SELL" ? -1 : 0;
    const entryLow = current - a * 0.12, entryHigh = current + a * 0.12;
    const stop = current - sign * a * 1.15, tp1 = current + sign * a * 1.65, tp2 = current + sign * a * 2.5;
    const evidence = [signals.h4.structure.event, signals.h1.structure.event, detail.bullSweep ? "Sell-side liquidity swept" : detail.bearSweep ? "Buy-side liquidity swept" : "No fresh external liquidity sweep", detail.fvg ? `${detail.fvg.side} FVG ${round(detail.fvg.low)}–${round(detail.fvg.high)}` : "No fresh three-candle FVG", `${detail.zone} relative to dealing-range equilibrium ${round(detail.eq)}`, detail.displacement ? "Displacement candle confirmed" : "Displacement not confirmed"];
    return {
      symbol: "XAU/USD", timeframe, generatedAt: new Date().toISOString(), lastCandleAt: new Date(execution.at(-1).t).toISOString(), stale, price: round(current), trend: signals.h4.direction === "WAIT" ? signals.h1.direction : signals.h4.direction, regime: rg.label,
      decision: final, probabilities: probs, forecasts: project(execution, dir, Math.max(probs.buy, probs.sell), rg),
      plan: final === "WAIT" ? null : { side: final, entryLow: round(entryLow), entryHigh: round(entryHigh), stop: round(stop), tp1: round(tp1), tp2: round(tp2), rr: round(Math.abs(tp1 - current) / Math.abs(current - stop), 2), invalidation: final === "BUY" ? `M5 close below ${round(stop)}` : `M5 close above ${round(stop)}` },
      alignment: { count: aligned, total: 4, m5: signals.m5.direction, m15: signals.m15.direction, h1: signals.h1.direction, h4: signals.h4.direction }, evidence, waitReasons: reasons,
      validation: { ...validation, currentRegimeAccuracy: recentReg?.accuracy ?? null, currentRegimeSamples: recentReg?.tested ?? 0 },
      news: { verified: newsVerified, label: "High-impact news risk not connected" }, nextCloseAt: execution.at(-1).t + TF_MS[timeframe] * 2
    };
  }
  globalThis.JenvuProbability = { analyze };
})();
