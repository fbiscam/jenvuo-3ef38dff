import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { auditSwing, AUDIT_ASSETS, AUDIT_TIMEFRAMES, pipSize } from "./swing-audit";

const b = (h: number, l: number, c: number, t: number) => ({ time: t, open: c, high: h, low: l, close: c, volume: 0 });
const pip = 0.0001;

describe("swing audit", () => {
  test("tracks EUR/USD, Gold and Bitcoin on 15M and 1H", () => {
    assert.deepEqual(AUDIT_ASSETS, ["EURUSD", "XAUUSD", "BTCUSD"]);
    assert.deepEqual(AUDIT_TIMEFRAMES, ["15m", "1h"]);
  });
  test("Gold repaint and excursion use a 0.1 price unit", () => {
    const bars = [b(2700, 2698, 2699, 0), b(2699, 2697, 2698, 1), b(2701, 2697, 2700, 2)];
    const a = auditSwing(bars, 0, "high", 2700, null, pipSize("XAUUSD"));
    assert.equal(a.repainted, true);
    assert.equal(a.outcome, "sl");
    assert.equal(a.maePips, 30);
  });
  test("Bitcoin target uses a 1 dollar price unit", () => {
    const bars = [b(96000, 95800, 95900, 0), b(95900, 95700, 95800, 1), b(95900, 95500, 95600, 2)];
    const a = auditSwing(bars, 0, "high", 96000, null, pipSize("BTCUSD"));
    assert.equal(a.target, 95400);
    assert.equal(a.outcome, "open");
    assert.equal(a.mfePips, 300);
  });
  test("a high broken before 7 candles counts as repainted", () => {
    const bars = [b(1.1010, 1.1000, 1.1005, 0), b(1.1006, 1.0998, 1.1000, 1), b(1.1012, 1.0999, 1.1008, 2)];
    const a = auditSwing(bars, 0, "high", 1.1010, null, pip);
    assert.equal(a.repainted, true);
    assert.equal(a.locked, false);
    assert.equal(a.outcome, "sl");
  });
  test("a high held 7 candles locks and hits 2R target", () => {
    // entry 1.1000, risk 10 pips, target 1.0980
    const bars = [b(1.1010, 1.1000, 1.1005, 0), b(1.1005, 1.0998, 1.1000, 1)];
    for (let k = 0; k < 7; k++) bars.push(b(1.1004, 1.0979 + k * 0, 1.0985, 2 + k));
    const a = auditSwing(bars, 0, "high", 1.1010, 1.0990, pip);
    assert.equal(a.repainted, false);
    assert.equal(a.locked, true);
    assert.equal(a.outcome, "tp");
    assert.equal(a.reachedNextSwing, true);
  });
  test("same candle hitting stop and target counts as a loss", () => {
    const bars = [b(1.1010, 1.1000, 1.1005, 0), b(1.1005, 1.0998, 1.1000, 1), b(1.1011, 1.0970, 1.0990, 2)];
    assert.equal(auditSwing(bars, 0, "high", 1.1010, null, pip).outcome, "sl");
  });
});
