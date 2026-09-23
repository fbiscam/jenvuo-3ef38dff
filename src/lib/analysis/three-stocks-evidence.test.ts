import test from "node:test";
import assert from "node:assert/strict";

import {
  buildThreeStocksEvidence,
  detectMotherInside,
  detectMotherInsidePatterns,
  findSwings,
  atr14,
  newYorkTradingDayRange,
  type ReversalCandle,
} from "./three-stocks-evidence";

const HOUR = 3600_000;

/** 2026-01-05 is a Monday; 09:00 UTC ≈ 04:00 New York (London Open killzone). */
const LONDON_OPEN_UTC = Date.UTC(2026, 0, 5, 9, 0);

function series(
  values: Array<[number, number, number, number]>,
  start: number,
  step: number,
  vol?: number[],
): ReversalCandle[] {
  return values.map(([o, h, l, c], i) => ({
    t: start + i * step,
    o,
    h,
    l,
    c,
    v: vol?.[i] ?? 1000,
  }));
}

test("atr14 averages true range", () => {
  const c = series(
    [
      [10, 12, 8, 11],
      [11, 13, 9, 12],
      [12, 14, 10, 13],
    ],
    0,
    HOUR,
  );
  assert.ok(atr14(c) > 0);
});

test("findSwings marks strict fractal pivots", () => {
  const c = series(
    [
      [1, 2, 0, 1],
      [1, 3, 1, 2],
      [2, 6, 2, 5],
      [5, 4, 3, 3],
      [3, 3, 1, 2],
    ],
    0,
    HOUR,
  );
  const swings = findSwings(c, "H1");
  assert.equal(swings.filter((s) => s.kind === "HIGH").length, 1);
  assert.equal(swings.find((s) => s.kind === "HIGH")?.price, 6);
});

test("New York trading-day bounds remain correct across daylight saving time", () => {
  assert.deepEqual(newYorkTradingDayRange(Date.UTC(2026, 0, 5, 15)), {
    start: "2026-01-05T05:00:00.000Z",
    end: "2026-01-06T05:00:00.000Z",
  });
  assert.deepEqual(newYorkTradingDayRange(Date.UTC(2026, 6, 5, 15)), {
    start: "2026-07-05T04:00:00.000Z",
    end: "2026-07-06T04:00:00.000Z",
  });
});

test("detectMotherInside requires full containment", () => {
  const ok = series(
    [
      [10, 11, 9, 10],
      [10, 20, 5, 6],
      [6, 15, 8, 9],
    ],
    0,
    HOUR,
  );
  assert.ok(detectMotherInside(ok));
  const bad = series(
    [
      [10, 11, 9, 10],
      [10, 20, 5, 6],
      [6, 25, 8, 9],
    ],
    0,
    HOUR,
  );
  assert.equal(detectMotherInside(bad), null);
});

test("detectMotherInside scans the full closed M30 history", () => {
  const candles = series(
    [
      [10, 11, 9, 10],
      [10, 20, 5, 6],
      [6, 15, 8, 9],
      [9, 16, 8, 15],
      [15, 17, 14, 16],
      [16, 18, 15, 17],
    ],
    0,
    HOUR,
  );
  const pattern = detectMotherInside(candles);
  assert.ok(pattern);
  assert.equal(pattern?.mother_high, 20);
  assert.equal(pattern?.bars_since_inside, 3);
});

test("detectMotherInsidePatterns returns newest candidate first", () => {
  const candles = series(
    [
      [10, 11, 9, 10],
      [10, 20, 5, 6],
      [6, 15, 8, 9],
      [9, 21, 4, 20],
      [20, 18, 7, 15],
    ],
    0,
    HOUR,
  );
  const patterns = detectMotherInsidePatterns(candles);
  assert.equal(patterns.length, 2);
  assert.equal(patterns[0]?.mother_high, 21);
  assert.equal(patterns[0]?.bars_since_inside, 0);
});

function baseM30(): ReversalCandle[] {
  const rows: Array<[number, number, number, number]> = [];
  // 20 quiet candles drifting down into a major low near 2000.
  for (let i = 0; i < 20; i++) {
    const base = 2030 - i;
    rows.push([base, base + 2, base - 2, base - 1]);
  }
  // Mother candle: wide, sweeps below 2000, closes back up.
  rows.push([2010, 2012, 1998, 2009]);
  // Inside candle: contained, lower volume.
  rows.push([2009, 2011, 2001, 2010]);
  const vols = rows.map((_, i) => (i === rows.length - 1 ? 400 : 1000));
  return series(rows, LONDON_OPEN_UTC - 21 * 1800_000, 1800_000, vols);
}

function htfLow(price: number): ReversalCandle[] {
  const rows: Array<[number, number, number, number]> = [
    [2050, 2055, 2045, 2048],
    [2048, 2050, 2040, 2042],
    [2042, 2044, price, price + 3],
    [2045, 2050, 2043, 2049],
    [2049, 2058, 2047, 2056],
  ];
  return series(rows, LONDON_OPEN_UTC - 40 * HOUR, 4 * HOUR);
}

test("arms a buy stop after sweeping a major H4 low in London Open", () => {
  const ev = buildThreeStocksEvidence({ m30: baseM30(), h4: htfLow(1999), h1: [] });
  assert.equal(ev.status, "ARMED_BUY_STOP");
  assert.equal(ev.plan?.direction, "BUY");
  assert.ok(ev.plan && ev.plan.entry > 2012);
  assert.ok(ev.plan && ev.plan.stop_loss < 1998);
  const risk = ev.plan!.risk;
  assert.ok(Math.abs(ev.plan!.target_1_3 - (ev.plan!.entry + risk * 3)) < 1e-9);
  assert.ok(Math.abs(ev.plan!.break_even_trigger - (ev.plan!.entry + risk * 1.5)) < 1e-9);
  assert.equal(ev.patterns_scanned > 0, true);
  assert.equal(ev.setup_quality.score, 100);
  assert.equal(ev.setup_quality.grade, "A");
});

test("reports an older full-chart pattern as stale instead of missing", () => {
  const m30 = baseM30();
  const lastT = m30.at(-1)?.t ?? 0;
  m30.push(
    { t: lastT + 1800_000, o: 2010, h: 2014, l: 2006, c: 2012, v: 900 },
    { t: lastT + 3600_000, o: 2012, h: 2016, l: 2009, c: 2015, v: 900 },
    { t: lastT + 5400_000, o: 2015, h: 2018, l: 2011, c: 2017, v: 900 },
    { t: lastT + 7200_000, o: 2017, h: 2020, l: 2013, c: 2018, v: 900 },
  );
  const ev = buildThreeStocksEvidence({ m30, h4: htfLow(1999), h1: [] });
  assert.equal(ev.status, "STALE_PATTERN");
  assert.equal(ev.pattern?.bars_since_inside, 4);
  assert.match(ev.rejections[0] ?? "", /found 4 closed M30 candles ago/i);
});

test("rejects patterns formed away from major levels", () => {
  const ev = buildThreeStocksEvidence({ m30: baseM30(), h4: htfLow(1800), h1: [] });
  assert.equal(ev.status, "REJECTED_LOCATION");
});

test("does not mistake a distant already-crossed level for a fresh extreme touch", () => {
  const ev = buildThreeStocksEvidence({ m30: baseM30(), h4: htfLow(2200), h1: [] });
  assert.equal(ev.status, "REJECTED_LOCATION");
});

test("locks the engine after two trades", () => {
  const ev = buildThreeStocksEvidence({
    m30: baseM30(),
    h4: htfLow(1999),
    h1: [],
    dailyTradesTaken: 2,
  });
  assert.equal(ev.status, "ENGINE_LOCKED_DAILY_LIMIT");
  assert.equal(ev.engine_locked, true);
});

test("rejects inside bar with volume expansion", () => {
  const m30 = baseM30();
  m30[m30.length - 1].v = 5000;
  const ev = buildThreeStocksEvidence({ m30, h4: htfLow(1999), h1: [] });
  assert.equal(ev.status, "REJECTED_VOLUME");
});

test("rejects a setup when tick volume is unavailable", () => {
  const m30 = baseM30().map((c) => ({ ...c, v: 0 }));
  const ev = buildThreeStocksEvidence({ m30, h4: htfLow(1999), h1: [] });
  assert.equal(ev.status, "REJECTED_VOLUME");
  assert.match(ev.rejections[0] ?? "", /unavailable/i);
});

test("rejects a mother candle smaller than ATR(14)", () => {
  const m30 = baseM30();
  const mother = m30[m30.length - 2];
  mother.h = 2010.5;
  mother.l = 2009.5;
  const inside = m30[m30.length - 1];
  inside.h = 2010.2;
  inside.l = 2009.8;
  const ev = buildThreeStocksEvidence({ m30, h4: htfLow(2009.4), h1: [] });
  assert.equal(ev.status, "REJECTED_VOLATILITY");
});

test("rejects Asian-session signals", () => {
  const m30 = baseM30();
  const shift = Date.UTC(2026, 0, 5, 3, 0) - (m30.at(-1)?.t ?? 0);
  for (const c of m30) c.t += shift;
  const h4 = htfLow(1999).map((c) => ({ ...c, t: c.t + shift }));
  const ev = buildThreeStocksEvidence({ m30, h4, h1: [] });
  assert.equal(ev.status, "REJECTED_SESSION");
});
