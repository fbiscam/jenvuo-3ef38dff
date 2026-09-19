import {
  buildLiquidityPools,
  detectFVGs,
  detectStructure,
  type Candle,
  type Swing,
} from "../src/lib/analysis/engine";

const minute = 60_000;
const base = Date.UTC(2026, 8, 18, 0, 0, 0);
const candle = (i: number, o: number, h: number, l: number, c: number): Candle => ({
  t: base + i * minute,
  o,
  h,
  l,
  c,
  v: 100,
});

const wickOnly = [
  candle(0, 9, 10, 8, 9),
  candle(1, 9, 11, 8.5, 10),
  candle(2, 10, 12, 9, 11),
  candle(3, 11, 14, 10, 12),
  candle(4, 12, 13, 10, 11),
  candle(5, 11, 12, 9, 10),
  candle(6, 10, 13, 9.5, 11),
  candle(7, 11, 14.5, 10, 13.8),
  candle(8, 13.8, 13.9, 11, 12),
  candle(9, 12, 13, 10, 11),
  candle(10, 11, 12, 9, 10),
  candle(11, 10, 15, 9.5, 13.9),
];
const swings: Swing[] = [
  { i: 1, t: Math.floor(wickOnly[1].t / 1000), price: 11, kind: "high" },
  { i: 3, t: Math.floor(wickOnly[3].t / 1000), price: 14, kind: "high" },
  { i: 5, t: Math.floor(wickOnly[5].t / 1000), price: 9, kind: "low" },
  { i: 7, t: Math.floor(wickOnly[7].t / 1000), price: 14.5, kind: "high" },
];
if (detectStructure(wickOnly, swings).events.some((event) => event.price === 14.5)) {
  throw new Error("Wick-only structure break was accepted");
}
const closedBreak = [...wickOnly, candle(12, 13.9, 15.4, 13.5, 15.1)];
if (!detectStructure(closedBreak, swings).events.some((event) => event.dir === "bullish")) {
  throw new Error("Close-confirmed structure break was missed");
}

const revisitedFvg = [
  candle(0, 9, 10, 8, 9),
  candle(1, 9, 12, 9, 11),
  candle(2, 13, 14, 12, 13.5),
  candle(3, 13.5, 14, 10.5, 12),
];
if (detectFVGs(revisitedFvg, 12).some((fvg) => fvg.kind === "bullish")) {
  throw new Error("A revisited FVG remained marked as fresh");
}

const hourly = Array.from({ length: 48 }, (_, hour): Candle => {
  const previousDay = hour < 24;
  return {
    t: base + hour * 60 * minute,
    o: previousDay ? 100 : 102,
    h: previousDay ? 105 : 104,
    l: previousDay ? 95 : 98,
    c: previousDay ? 101 : 103,
    v: 100,
  };
});
const fiveMinute = Array.from({ length: 12 }, (_, index): Candle => ({
  t: base + (24 * 60 + index * 5) * minute,
  o: 102,
  h: index === 11 ? 105.01 : 104,
  l: 98,
  c: 103,
  v: 100,
}));
const priorDayHigh = buildLiquidityPools(hourly, fiveMinute).find(
  (pool) => pool.label === "PDH",
);
if (!priorDayHigh || priorDayHigh.swept) {
  throw new Error("A touch inside tolerance incorrectly counted as a prior-day sweep");
}

console.log("Signal-engine regression checks passed");