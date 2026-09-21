import test from "node:test";
import assert from "node:assert/strict";
import { detectPoiEvidence } from "./poi-evidence";

type C = { t: number; o: number; h: number; l: number; c: number };

const mk = (i: number, o: number, h: number, l: number, c: number): C => ({
  t: 1700000000000 + i * 1800000,
  o,
  h,
  l,
  c,
});

test("detects a bullish fair value gap between candle 1 high and candle 3 low", () => {
  const candles: C[] = [
    mk(0, 100, 101, 99, 100),
    mk(1, 100, 102, 99.5, 101),
    mk(2, 101, 110, 100.8, 109),
    mk(3, 109, 112, 105, 111),
    mk(4, 111, 113, 110, 112),
    mk(5, 112, 114, 111, 113),
  ];
  const res = detectPoiEvidence(candles);
  const gap = res.fair_value_gaps.find((g) => g.type === "BULLISH_FVG");
  assert.ok(gap, "expected a bullish FVG");
  assert.equal(gap!.bottom, 101);
  assert.equal(gap!.top, 105);
  assert.equal(gap!.ce, 103);
});

test("marks a gap mitigated once price trades fully back through it", () => {
  const candles: C[] = [
    mk(0, 100, 101, 99, 100),
    mk(1, 100, 102, 99.5, 101),
    mk(2, 101, 110, 100.8, 109),
    mk(3, 109, 112, 105, 111),
    mk(4, 111, 112, 100, 101),
    mk(5, 101, 102, 100, 101),
  ];
  const res = detectPoiEvidence(candles);
  const gap = res.fair_value_gaps.find((g) => g.type === "BULLISH_FVG");
  assert.ok(gap);
  assert.equal(gap!.status, "MITIGATED");
});

test("pairs a demand order block with the imbalance it created", () => {
  const candles: C[] = [
    mk(0, 100, 101, 99, 100),
    mk(1, 100, 100.5, 96, 96.5),
    mk(2, 96.5, 104, 96.4, 103.5),
    mk(3, 103.5, 108, 102, 107),
    mk(4, 107, 109, 106, 108),
    mk(5, 108, 110, 107, 109),
  ];
  const res = detectPoiEvidence(candles);
  const ob = res.order_blocks.find((z) => z.type === "DEMAND");
  assert.ok(ob, "expected a demand order block");
  assert.equal(ob!.index, 1);
  assert.equal(ob!.is_fvg_aligned, true);
  assert.equal(ob!.swept_liquidity, true);
});

test("rejects malformed OHLC input", () => {
  const candles = [
    mk(0, 100, 101, 99, 100),
    { t: 1, o: 100, h: 90, l: 99, c: 100 },
    mk(2, 100, 101, 99, 100),
    mk(3, 100, 101, 99, 100),
    mk(4, 100, 101, 99, 100),
  ];
  assert.throws(() => detectPoiEvidence(candles), /Invalid OHLC candle at index 1/);
});

test("returns empty evidence for too-short input", () => {
  const res = detectPoiEvidence([mk(0, 1, 2, 0.5, 1.5)]);
  assert.equal(res.fair_value_gaps.length, 0);
  assert.equal(res.order_blocks.length, 0);
  assert.equal(res.price_action_signals.length, 0);
});
