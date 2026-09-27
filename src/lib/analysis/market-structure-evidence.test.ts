import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  classifyMultiTimeframeTrend,
  detectMarketStructureEvidence,
  mapAdvancedSmcState,
  mapMarketStructure,
  type MarketStructureCandle,
} from "./market-structure-evidence";

function candles(highs: number[], lows: number[], closes?: number[]): MarketStructureCandle[] {
  return highs.map((high, index) => {
    const low = lows[index];
    const close = closes?.[index] ?? (high + low) / 2;
    return {
      timestamp: Date.UTC(2026, 0, 1, 0, index * 30),
      open: close,
      high,
      low,
      close,
    };
  });
}

describe("mapMarketStructure", () => {
  test("locks a pivot only after three closed candles on each side", () => {
    const input = candles(
      [10, 11, 12, 16, 14, 13, 12],
      [7, 8, 9, 10, 9, 8, 7],
    );

    assert.equal(mapMarketStructure(input.slice(0, 6)).some((candle) => candle.is_swing_high), false);
    assert.equal(mapMarketStructure(input).at(3)?.is_swing_high, true);
  });

  test("labels confirmed HH/LH and HL/LL pivots from strict three-candle fractals", () => {
    const input = candles(
      [10, 11, 12, 18, 15, 13, 11, 12, 14, 20, 16, 13, 12, 13, 15, 17, 14, 12, 10],
      [7, 8, 9, 10, 8, 5, 1, 6, 8, 12, 9, 6, 3, 7, 9, 11, 8, 4, 0],
    );
    const mapped = mapMarketStructure(input);

    assert.equal(mapped[3].is_swing_high, true);
    assert.equal(mapped[3].structure_label, null);
    assert.equal(mapped[6].is_swing_low, true);
    assert.equal(mapped[6].structure_label, null);
    assert.equal(mapped[9].structure_label, "HH");
    assert.equal(mapped[12].structure_label, "HL");
    assert.equal(mapped[15].structure_label, "LH");
    assert.equal(mapped[18].structure_label, null);
  });

  test("enforces strict high-low alternation", () => {
    const input = candles(
      [10, 11, 12, 20, 15, 14, 13, 19, 14, 13, 12],
      [5, 6, 7, 10, 9, 8, 7, 10, 9, 8, 7],
    );
    const evidence = detectMarketStructureEvidence(
      input.map(({ timestamp: t, open: o, high: h, low: l, close: c }) => ({ t, o, h, l, c })),
    );

    assert.equal(evidence.pivots.length > 1, true);
    for (let index = 1; index < evidence.pivots.length; index += 1) {
      assert.notEqual(evidence.pivots[index].kind, evidence.pivots[index - 1].kind);
    }
  });

  test("rejects a three-candle wiggle within 1.2 ATR of the opposite swing", () => {
    const input = candles(
      [100, 101, 102, 110, 108, 107, 106, 107, 108, 109, 108, 107, 106],
      [90, 91, 92, 100, 99, 98, 97, 98, 99, 100, 99, 98, 97],
    );
    const evidence = detectMarketStructureEvidence(
      input.map(({ timestamp: t, open: o, high: h, low: l, close: c }) => ({ t, o, h, l, c })),
      3,
      10,
    );

    assert.deepEqual(evidence.pivots.map((pivot) => pivot.kind), ["high"]);
  });

  test("requires a strict pivot and rejects equal-high plateaus", () => {
    const input = candles([10, 11, 12, 15, 15, 12, 11, 10], [7, 8, 9, 10, 10, 8, 7, 6]);
    assert.equal(
      mapMarketStructure(input).some((candle) => candle.is_swing_high),
      false,
    );
  });

  test("places break events only on close-through candles", () => {
    const input = candles(
      [10, 11, 15, 12, 11, 12, 14, 16, 14, 12, 11, 10, 9],
      [8, 9, 10, 8, 6, 7, 9, 11, 9, 7, 5, 4, 3],
      [9, 10, 12, 10, 8, 10, 13, 15.5, 11, 8, 5.5, 5, 4],
    );
    const mapped = mapMarketStructure(input, 2);
    const evidence = detectMarketStructureEvidence(
      input.map((candle) => ({
        t: candle.timestamp,
        o: candle.open,
        h: candle.high,
        l: candle.low,
        c: candle.close,
      })),
      2,
    );

    for (const event of evidence.breaks) {
      assert.equal(mapped[event.index].smc_event, event.type === "CHOCH" ? "CHoCH" : "BOS");
    }
    assert.equal(mapped.filter((candle) => candle.smc_event).length, evidence.breaks.length);
  });

  test("ignores a wick through structure until a candle closes beyond the buffered level", () => {
    const input = candles(
      [10, 11, 15, 12, 11, 16, 16],
      [8, 9, 10, 8, 7, 10, 10],
      [9, 10, 12, 10, 9, 14.9, 15.5],
    );
    const mapped = mapMarketStructure(input, 2);

    assert.equal(mapped[5].smc_event, null);
    assert.equal(mapped[6].smc_event, "BOS");
  });

  test("rejects malformed OHLC instead of silently shifting indexes", () => {
    const input = candles([10, 11, 12], [8, 9, 10]);
    input[1].high = 7;
    assert.throws(() => mapMarketStructure(input), /Invalid OHLC candle at index 1/);
  });

  test("distinguishes a buy-side wick sweep from a later bullish close break", () => {
    const input = candles(
      [10, 11, 15, 12, 11, 16, 16],
      [8, 9, 10, 8, 7, 10, 10],
      [9, 10, 12, 10, 9, 14.9, 15.5],
    );
    const state = mapAdvancedSmcState(input, { radius: 2 });

    assert.equal(state[5].trend_state, "SIDEWAYS");
    assert.equal(state[5].last_event, "BSL_SWEEP");
    assert.equal(state[6].trend_state, "BULLISH");
    assert.equal(state[6].last_event, "BOS");
  });

  test("groups confirmed Gold equal highs and lows within 0.30", () => {
    const input = candles(
      [10, 11, 15, 12, 11, 13, 15.2, 13, 12, 13, 14],
      [8, 9, 10, 8, 5, 7, 9, 8, 5.2, 7, 8],
    );
    const latest = mapAdvancedSmcState(input, { radius: 2 }).at(-1);

    assert.ok(latest?.active_liquidity_pools.some((pool) => pool.type === "EQH"));
    assert.ok(latest?.active_liquidity_pools.some((pool) => pool.type === "EQL"));
  });

  test("classifies timeframe consensus without hiding disagreement", () => {
    const base = candles(
      [10, 11, 15, 12, 11, 16, 16],
      [8, 9, 10, 8, 7, 10, 10],
      [9, 10, 12, 10, 9, 14.9, 15.5],
    );
    const bullish = mapAdvancedSmcState(base, { radius: 2 });
    const bearish = mapAdvancedSmcState(
      candles(
        [10, 11, 15, 12, 11, 12, 13, 10],
        [8, 9, 10, 8, 5, 7, 8, 4],
        [9, 10, 12, 10, 8, 9, 10, 4.5],
      ),
      { radius: 2 },
    );
    const consensus = classifyMultiTimeframeTrend({ "1h": bullish, "1d": bearish });

    assert.equal(consensus.state, "SIDEWAYS");
    assert.equal(consensus.aligned, false);
    assert.deepEqual(consensus.bullish, ["1h"]);
    assert.deepEqual(consensus.bearish, ["1d"]);
  });
});
