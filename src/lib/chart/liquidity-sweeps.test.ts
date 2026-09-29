import { describe, it as test } from "node:test";
import { expect } from "./test-expect";
import { computeLiquidityMap } from "./liquidity-sweeps";

type B = { t: number; o: number; h: number; l: number; c: number };
const bar = (i: number, o: number, h: number, l: number, c: number): B => ({ t: i * 60_000, o, h, l, c });

/** Flat-ish series oscillating around 100 with two equal highs at 102. */
function equalHighs(): B[] {
  const bars: B[] = [];
  for (let i = 0; i < 30; i++) {
    const peak = i === 8 || i === 18;
    bars.push(bar(i, 100, peak ? 102 : 100.8, 99.2, 100.2));
  }
  return bars;
}

describe("computeLiquidityMap", () => {
  test("clusters equal highs into one BSL pool flagged as next sweep", () => {
    const map = computeLiquidityMap(equalHighs());
    const bsl = map.pools.filter((p) => p.side === "BSL");
    expect(bsl[0].level).toBe(102);
    expect(bsl[0].count).toBe(2);
    expect(bsl[0].next).toBe(true);
    expect(map.sweeps).toHaveLength(0);
  });

  test("wick through and close back inside is a BSL sweep", () => {
    const bars = equalHighs();
    bars.push(bar(30, 100.2, 102.8, 100, 100.4)); // sweep candle
    bars.push(bar(31, 100.4, 100.6, 99.5, 99.8)); // holds below
    const map = computeLiquidityMap(bars);
    expect(map.sweeps).toHaveLength(1);
    const s = map.sweeps[0];
    expect(s.side).toBe("BSL");
    expect(s.level).toBe(102);
    expect(s.count).toBe(2);
    expect(s.confirmed).toBe(true);
    expect(s.strong).toBe(true);
    expect(map.pools.some((p) => p.side === "BSL" && p.level === 102)).toBe(false);
  });

  test("close beyond without reclaim is a run, not a sweep", () => {
    const bars = equalHighs();
    bars.push(bar(30, 100.2, 103, 100, 102.8));
    bars.push(bar(31, 102.8, 103.5, 102.5, 103.2));
    expect(computeLiquidityMap(bars).sweeps).toHaveLength(0);
  });

  test("close beyond reclaimed by the next candle is a two-bar sweep", () => {
    const bars = equalHighs();
    bars.push(bar(30, 100.2, 102.6, 100, 102.3));
    bars.push(bar(31, 102.3, 102.4, 100.5, 100.9));
    const [s] = computeLiquidityMap(bars).sweeps;
    expect(s.twoBar).toBe(true);
    expect(s.confirmed).toBe(false);
  });

  test("sweep invalidated when the next candle closes back beyond", () => {
    const bars = equalHighs();
    bars.push(bar(30, 100.2, 102.8, 100, 100.4));
    bars.push(bar(31, 100.4, 103.2, 100.3, 102.9));
    expect(computeLiquidityMap(bars).sweeps).toHaveLength(0);
  });

  test("forming candle only flags the pool as taking; history unchanged", () => {
    const bars = equalHighs();
    const map = computeLiquidityMap(bars, bar(30, 100.2, 102.5, 100, 101));
    expect(map.pools.find((p) => p.side === "BSL")?.taking).toBe(true);
    expect(map.sweeps).toHaveLength(0);
  });

  test("single swing pool alone never scores strong", () => {
    const bars: B[] = [];
    for (let i = 0; i < 30; i++) bars.push(bar(i, 100, i === 10 ? 103 : 100.8, 99.2, 100.2));
    const bsl = computeLiquidityMap(bars).pools.find((p) => p.side === "BSL");
    expect(bsl?.count).toBe(1);
    expect(Number(bsl?.score) <= 50).toBe(true);
  });
});
