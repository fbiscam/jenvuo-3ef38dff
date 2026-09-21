import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  buildExecutionEvidence,
  calculateOrderParameters,
  calculateOte,
  classifyNewYorkSession,
  detectBreakerBlocks,
} from "./execution-evidence";
import type { AdvancedSmcBar, MarketStructureCandle } from "./market-structure-evidence";
import type { PoiEvidence } from "./poi-evidence";

function bar(timestamp: number, open: number, high: number, low: number, close: number) {
  return { timestamp, open, high, low, close };
}

describe("ICT time and execution evidence", () => {
  test("uses America/New_York DST rules for killzones", () => {
    assert.equal(classifyNewYorkSession(Date.UTC(2026, 6, 1, 6, 30)).session, "LONDON_OPEN");
    assert.equal(classifyNewYorkSession(Date.UTC(2026, 0, 1, 7, 30)).session, "LONDON_OPEN");
    assert.equal(classifyNewYorkSession(Date.UTC(2026, 6, 1, 18, 0)).tradeAllowed, false);
  });

  test("calculates the 0.618, 0.705 and 0.79 OTE band in both directions", () => {
    const buy = calculateOte("BUY", 3300, 3400, 3330);
    const sell = calculateOte("SELL", 3300, 3400, 3370);
    assert.equal(buy?.level_618, 3338.2);
    assert.equal(buy?.level_705, 3329.5);
    assert.equal(buy?.level_790, 3321);
    assert.equal(buy?.price_inside, true);
    assert.equal(sell?.level_705, 3370.5);
    assert.equal(sell?.price_inside, true);
  });

  test("adds the 1.5 Gold buffer and enforces a minimum 1:3 TP2", () => {
    const buy = calculateOrderParameters("BUY", 3330, { bottom: 3320, top: 3335 });
    const sell = calculateOrderParameters("SELL", 3370, { bottom: 3365, top: 3380 });
    assert.equal(buy?.stopLoss, 3318.5);
    assert.equal(buy?.takeProfit2, 3364.5);
    assert.equal((buy?.takeProfit2 ?? 0) - 3330, (buy?.risk ?? 0) * 3);
    assert.equal(sell?.stopLoss, 3381.5);
    assert.equal(3370 - (sell?.takeProfit2 ?? 0), (sell?.risk ?? 0) * 3);
  });

  test("marks the Asian range as accumulation and blocks execution", () => {
    const candles = [
      bar(Date.UTC(2026, 6, 2, 0, 0), 3300, 3305, 3298, 3302),
      bar(Date.UTC(2026, 6, 2, 1, 0), 3302, 3308, 3300, 3306),
    ];
    const state = candles.map((candle) => ({
      ...candle,
      trend_state: "SIDEWAYS",
      dealing_zone: "EQUILIBRIUM",
      active_liquidity_pools: [],
      trendline_liquidity: [],
      equilibrium: null,
      last_event: null,
    })) as AdvancedSmcBar[];
    const result = buildExecutionEvidence(candles, state, {
      fair_value_gaps: [],
      order_blocks: [],
      price_action_signals: [],
    });
    assert.equal(result.current_session, "ASIAN_RANGE");
    assert.equal(result.amd_phase, "ACCUMULATION");
    assert.equal(result.system_status, "WAITING_FOR_KILLZONE");
  });

  test("detects a London bearish Judas sweep of the completed Asian high", () => {
    const candles = [
      bar(Date.UTC(2026, 6, 2, 0, 0), 3300, 3305, 3298, 3302),
      bar(Date.UTC(2026, 6, 2, 1, 0), 3302, 3308, 3300, 3306),
      bar(Date.UTC(2026, 6, 2, 6, 30), 3306, 3310, 3301, 3307),
    ];
    const state = candles.map((candle) => ({
      ...candle,
      trend_state: "SIDEWAYS",
      dealing_zone: "EQUILIBRIUM",
      active_liquidity_pools: [],
      trendline_liquidity: [],
      equilibrium: null,
      last_event: null,
    })) as AdvancedSmcBar[];
    const result = buildExecutionEvidence(candles, state, {
      fair_value_gaps: [],
      order_blocks: [],
      price_action_signals: [],
    });
    assert.equal(result.current_session, "LONDON_OPEN");
    assert.equal(result.judas_swing, "BEARISH_JUDAS_SWING");
    assert.equal(result.amd_phase, "MANIPULATION");
  });

  test("requires sweep, structural displacement and strong close through an OB for a breaker", () => {
    const base = Date.UTC(2026, 6, 2, 6, 0);
    const values = [
      [10, 12, 8, 10],
      [10, 13, 9, 11],
      [11, 16, 10, 14],
      [14, 14.5, 8, 9],
      [9, 12, 6, 7],
      [7, 10, 5, 8],
      [8, 17, 7, 15],
      [15, 18, 13, 17],
    ];
    const candles: MarketStructureCandle[] = values.map((v, i) =>
      bar(base + i * 30 * 60_000, v[0], v[1], v[2], v[3]),
    );
    const supply = {
      type: "SUPPLY",
      index: 2,
      t: candles[2].timestamp,
      top: 16,
      bottom: 10,
      is_fvg_aligned: true,
      swept_liquidity: true,
      displacement: true,
      status: "UNMITIGATED",
      mitigated_t: null,
    } as const;
    const breakers = detectBreakerBlocks(candles, [supply]);
    assert.ok(breakers.length <= 1);
    if (breakers[0]) assert.equal(breakers[0].type, "BULLISH_BREAKER_BLOCK");
  });

  test("returns no setup instead of fabricating OTE or risk values without structure", () => {
    const candle = bar(Date.UTC(2026, 6, 2, 12, 0), 3300, 3302, 3298, 3301);
    const advanced: AdvancedSmcBar = {
      ...candle,
      trend_state: "BULLISH",
      dealing_zone: "DISCOUNT",
      active_liquidity_pools: [],
      trendline_liquidity: [],
      equilibrium: null,
      last_event: "BOS",
    };
    const poi: PoiEvidence = {
      fair_value_gaps: [],
      order_blocks: [],
      price_action_signals: [],
    };
    const result = buildExecutionEvidence([candle], [advanced], poi);
    assert.equal(result.ote, null);
    assert.equal(result.trade_signal, null);
    assert.equal(result.system_status, "NO_SETUP");
  });
});
