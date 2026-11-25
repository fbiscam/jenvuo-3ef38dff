import { describe, test } from "node:test";
import assert from "node:assert/strict";
const expect = (v: unknown) => ({ toBe: (x: unknown) => assert.equal(v, x), toEqual: (x: unknown) => assert.deepEqual(v, x), toContain: (x: unknown) => assert.ok((v as unknown[]).includes(x)), toBeGreaterThanOrEqual: (x: number) => assert.ok((v as number) >= x) });
import { detectStructureAlerts, ALERT_TIMEFRAMES, ALERT_ASSETS, FRESH_CONFIRM_BARS } from "./structure-alerts";
import { FRACTAL_RADIUS } from "./chart/smc-overlay";

const bars = (n: number) =>
  Array.from({ length: n }, (_, i) => {
    const c = 100 + Math.sin(i / 6) * 5;
    return { time: i * 3600, open: c, high: c + 0.5, low: c - 0.5, close: c + 0.1, volume: 0 };
  });

describe("structure alerts", () => {
  test("scans the three pairs on 1H, 2H and 3H", () => {
    expect([...ALERT_ASSETS]).toEqual(["XAUUSD", "EURUSD", "BTCUSD"]);
    expect([...ALERT_TIMEFRAMES]).toEqual(["1h", "2h", "3h"]);
  });
  test("only swings confirmed on the newest candles fire, each with PA or sweep", () => {
    const series = bars(300);
    const alerts = detectStructureAlerts("EURUSD", "1h", series);
    for (const a of alerts) {
      expect(a.priceAction !== null || a.sweep !== null).toBe(true);
      expect(["HH", "HL", "LH", "LL"]).toContain(a.label);
      expect(a.confirmedTime / 1000).toBeGreaterThanOrEqual(series[series.length - FRESH_CONFIRM_BARS]!.time);
    }
    expect(FRACTAL_RADIUS).toBe(10);
  });
  test("too little history fires nothing", () => {
    expect(detectStructureAlerts("XAUUSD", "1h", bars(20))).toEqual([]);
  });
});

import { receivesStructureAlerts } from "./structure-alerts";
describe("alert recipients", () => {
  const future = new Date(Date.now() + 86_400_000).toISOString();
  test("active Pro, Elite and Ultra receive alerts", () => {
    for (const plan_id of ["pro", "elite", "ultra"]) expect(receivesStructureAlerts({ plan_id, status: "active", current_period_end: future })).toBe(true);
  });
  test("Free never receives alerts", () => {
    expect(receivesStructureAlerts({ plan_id: "free", status: "active", current_period_end: future })).toBe(false);
  });
  test("trial, inactive or expired paid plans do not receive alerts", () => {
    expect(receivesStructureAlerts({ plan_id: "pro", status: "active", is_trial: true, current_period_end: future })).toBe(false);
    expect(receivesStructureAlerts({ plan_id: "elite", status: "canceled", current_period_end: future })).toBe(false);
    expect(receivesStructureAlerts({ plan_id: "ultra", status: "active", current_period_end: new Date(Date.now() - 1000).toISOString() })).toBe(false);
  });
});
