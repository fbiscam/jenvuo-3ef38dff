import test from "node:test";
import assert from "node:assert/strict";
import {
  buildApexEvidence,
  classifyLbmaFix,
  classifyMacroTrend,
  detectBalancedPriceRanges,
  detectCvdDivergence,
  detectFootprintImbalance,
  triangulateMacro,
  type ApexCandle,
} from "./apex-evidence";

const HOUR = 3_600_000;

function candle(i: number, o: number, h: number, l: number, c: number, v = 100): ApexCandle {
  return { t: Date.UTC(2026, 0, 5, 0, 0) + i * HOUR, o, h, l, c, v };
}

test("CVD divergence flags buy absorption on equal lows with rising delta", () => {
  const candles: ApexCandle[] = [];
  for (let i = 0; i < 6; i += 1) candles.push(candle(i, 2000, 2002, 1990, 1991, 100));
  for (let i = 6; i < 12; i += 1) candles.push(candle(i, 1991, 2002, 1990, 2001, 100));
  assert.equal(detectCvdDivergence(candles), "CONFIRMED_BUY_ABSORPTION");
});

test("CVD is unavailable without a volume feed", () => {
  const candles = Array.from({ length: 12 }, (_, i) => candle(i, 2000, 2005, 1995, 2001, 0));
  assert.equal(detectCvdDivergence(candles), "ORDER_FLOW_UNAVAILABLE");
});

test("footprint imbalance needs a 3x delta skew", () => {
  assert.equal(detectFootprintImbalance(candle(0, 2000, 2010, 2000, 2009)), "BUY_IMBALANCE_3X");
  assert.equal(detectFootprintImbalance(candle(0, 2005, 2010, 2000, 2001)), "SELL_IMBALANCE_3X");
  assert.equal(detectFootprintImbalance(candle(0, 2005, 2010, 2000, 2005)), "NO_IMBALANCE");
});

test("macro triangulation maps the holy trinity", () => {
  assert.equal(triangulateMacro("BEARISH", "BEARISH"), "PERFECT_BUY");
  assert.equal(triangulateMacro("BULLISH", "BULLISH"), "PERFECT_SELL");
  assert.equal(triangulateMacro("BULLISH", "BEARISH"), "MACRO_DIVERGENCE");
  assert.equal(triangulateMacro("UNAVAILABLE", "BEARISH"), "UNAVAILABLE");
});

test("macro trend needs enough history", () => {
  assert.equal(classifyMacroTrend([]), "UNAVAILABLE");
  const up = Array.from({ length: 30 }, (_, i) => candle(i, 100 + i, 101 + i, 99 + i, 100.5 + i));
  assert.equal(classifyMacroTrend(up), "BULLISH");
});

test("LBMA blackout covers 15 minutes before each fix", () => {
  // 10:20 London on a winter date (UTC+0).
  assert.equal(classifyLbmaFix(Date.UTC(2026, 0, 5, 10, 20)).status, "PRE_FIX_BLACKOUT");
  assert.equal(classifyLbmaFix(Date.UTC(2026, 0, 5, 10, 40)).status, "POST_FIX_WINDOW");
  assert.equal(classifyLbmaFix(Date.UTC(2026, 0, 5, 8, 0)).status, "CLEAR_OF_FIX");
});

test("BPR is the overlap of opposing fair value gaps", () => {
  const bprs = detectBalancedPriceRanges([
    { type: "BULLISH_FVG", index: 4, t: 1, top: 2010, bottom: 2000, status: "UNMITIGATED" },
    { type: "BEARISH_FVG", index: 9, t: 2, top: 2015, bottom: 2005, status: "UNMITIGATED" },
  ]);
  assert.equal(bprs.length, 1);
  assert.equal(bprs[0].top, 2010);
  assert.equal(bprs[0].bottom, 2005);
});

test("apex aborts when macro opposes the setup direction", () => {
  const candles = Array.from({ length: 30 }, (_, i) => candle(i, 2000, 2005, 1995, 2001, 100));
  const dxyUp = Array.from({ length: 30 }, (_, i) => candle(i, 100 + i, 101 + i, 99 + i, 100.5 + i));
  const result = buildApexEvidence({
    candles,
    dxyCandles: dxyUp,
    us10yCandles: dxyUp,
    direction: "BUY",
    entry: 2005,
    stopLoss: 1995,
    target: 2035,
    now: Date.UTC(2026, 0, 5, 8, 0),
  });
  assert.equal(result.apex_validations.macro_triangulation.gold_alignment, "PERFECT_SELL");
  assert.equal(result.trade_execution.action, "ABORT_MACRO_CONFLICT");
});

test("apex waits through the LBMA blackout", () => {
  const candles = Array.from({ length: 30 }, (_, i) => candle(i, 2000, 2005, 1995, 2001, 100));
  const result = buildApexEvidence({
    candles,
    direction: "BUY",
    now: Date.UTC(2026, 0, 5, 14, 50),
  });
  assert.equal(result.apex_validations.lbma_fix_status, "PRE_FIX_BLACKOUT");
  assert.equal(result.trade_execution.action, "WAIT_FOR_LBMA_FIX");
});

test("no directional setup means no apex action", () => {
  const candles = Array.from({ length: 30 }, (_, i) => candle(i, 2000, 2005, 1995, 2001, 100));
  const result = buildApexEvidence({ candles, direction: null, now: Date.UTC(2026, 0, 5, 8, 0) });
  assert.equal(result.trade_execution.action, "NO_SETUP");
  assert.match(result.trade_execution.apex_confluence_score, /checklist count/);
});
