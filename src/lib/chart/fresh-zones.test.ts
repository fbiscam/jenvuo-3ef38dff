import { describe, it as test } from "node:test";
import { expect } from "./test-expect";
import { computeFreshZones } from "./fresh-zones";
import type { StructurePivot } from "@/lib/analysis/market-structure-evidence";

const bar = (i: number, o: number, h: number, l: number, c: number) => ({ t: i * 60_000, o, h, l, c });

function series(afterSwing: (i: number) => { o: number; h: number; l: number; c: number }, gap = true) {
  const bars = [] as ReturnType<typeof bar>[];
  for (let i = 0; i < 20; i++) bars.push(bar(i, 100 + i * 0.2, 100.6 + i * 0.2, 99.6 + i * 0.2, 100.3 + i * 0.2));
  bars.push(bar(20, 104, 106, 103.8, 104.4)); // swing high with upper wick
  for (let i = 21; i < 40; i++) {
    const b = afterSwing(i);
    bars.push(bar(i, b.o, b.h, b.l, b.c));
  }
  if (gap) {
    // Bearish displacement FVG off the high: bar 22 high stays below bar 20 low.
    bars[21] = bar(21, 104.2, 104.3, 102.6, 102.7);
    bars[22] = bar(22, 102.7, 103.2, 101.9, 102.1);
  }
  const pivot: StructurePivot = { index: 20, confirmedIndex: 30, t: 20 * 60_000, price: 106, kind: "high", label: "HH" };
  return { bars, pivots: [pivot] };
}

describe("computeFreshZones", () => {
  test("creates a fresh supply zone after body displacement away from a new high", () => {
    const { bars, pivots } = series((i) => {
      const c = 104 - (i - 20) * 0.4;
      return { o: c + 0.2, h: c + 0.5, l: c - 0.3, c };
    });
    const zones = computeFreshZones(bars, pivots);
    expect(zones).toHaveLength(1);
    expect(zones[0].type).toBe("SUPPLY");
    expect(zones[0].top).toBe(106);
    expect(zones[0].fvg?.type).toBe("BEARISH");
    expect(zones[0].fresh).toBe(true);
    expect(zones[0].extreme).toBe(true);
  });

  test("no zone when price does not displace away by closes", () => {
    const { bars, pivots } = series(() => ({ o: 104.3, h: 104.9, l: 104, c: 104.4 }), false);
    expect(computeFreshZones(bars, pivots)).toHaveLength(0);
  });

  test("zone is removed once a candle closes above it", () => {
    const { bars, pivots } = series((i) => {
      const c = i < 32 ? 104 - (i - 20) * 0.4 : 106.5;
      return { o: c, h: c + 0.3, l: c - 0.3, c };
    });
    expect(computeFreshZones(bars, pivots)).toHaveLength(0);
  });

  test("a weak live swing with no displacement stays hidden (strong zones only)", () => {
    const { bars, pivots } = series(() => ({ o: 104.3, h: 104.9, l: 104, c: 104.4 }), false);
    expect(computeFreshZones(bars, [{ ...pivots[0], live: true }])).toHaveLength(0);
  });

  test("the forming candle never breaks a zone", () => {
    const { bars, pivots } = series((i) => {
      const c = i < 39 ? 104 - (i - 20) * 0.4 : 107;
      return { o: c, h: c + 0.3, l: c - 0.3, c };
    });
    expect(computeFreshZones(bars, pivots, bars.length - 1)).toHaveLength(1);
    expect(computeFreshZones(bars, pivots)).toHaveLength(0);
  });

  test("fresh zone carries a SELL plan: entry at proximal edge, SL beyond extreme, TP1 2R, TP2 3R", () => {
    const { bars, pivots } = series((i) => {
      const c = 104 - (i - 20) * 0.4;
      return { o: c + 0.2, h: c + 0.5, l: c - 0.3, c };
    });
    const [z] = computeFreshZones(bars, pivots);
    expect(z.plan?.side).toBe("SELL");
    expect(z.plan!.entry).toBe(Math.round(z.bottom * 100) / 100);
    expect(z.plan!.sl > 106).toBe(true);
    const risk = z.plan!.sl - z.plan!.entry;
    expect(Math.abs(z.plan!.entry - z.plan!.tp1 - risk * 2) < 0.02).toBe(true);
    expect(Math.abs(z.plan!.entry - z.plan!.tp2 - risk * 3) < 0.02).toBe(true);
    expect(z.extremeLevel).toBe(106);
    expect(z.strength >= 55).toBe(true);
  });

  test("the latest zone carries Entry/SL/TP even after price tested it", () => {
    const { bars, pivots } = series((i) => {
      const c = i < 30 ? 104 - (i - 20) * 0.4 : 104.5;
      return { o: c, h: i === 34 ? 105.5 : c + 0.2, l: c - 0.3, c };
    });
    const [z] = computeFreshZones(bars, pivots);
    expect(z.fresh).toBe(false);
    expect(z.plan?.side).toBe("SELL");
  });

  test("only the newest 3 zones are kept", () => {
    const bars = [] as ReturnType<typeof bar>[];
    const pivots: StructurePivot[] = [];
    for (let i = 0; i < 200; i++) {
      const wave = Math.sin(i / 3) * 5;
      const c = 100 + wave;
      bars.push(bar(i, c, c + 0.4, c - 0.4, c));
    }
    for (let i = 25; i < 190; i += 19) {
      bars[i] = bar(i, 200 + i, 201 + i, 199.8 + i, 200 + i - 0.1);
      bars[i + 1] = bar(i + 1, 199 + i, 199.2 + i, 190 + i, 190.2 + i);
      for (let k = 2; k <= 3; k++) bars[i + k] = bar(i + k, 190 + i, 190.3 + i, 189.5 + i, 189.8 + i);
      pivots.push({ index: i, confirmedIndex: i + 10, t: i * 60_000, price: 201 + i, kind: "high", label: "HH" });
    }
    const zones = computeFreshZones(bars, pivots);
    expect(zones.length <= 3).toBe(true);
    expect(zones[zones.length - 1].t).toBe(pivots[pivots.length - 1].t);
    // Zones never stack on each other.
    for (let a = 0; a < zones.length; a++)
      for (let b = a + 1; b < zones.length; b++)
        expect(zones[a].bottom > zones[b].top || zones[a].top < zones[b].bottom).toBe(true);
    // Entry / SL / TP only on one zone at most.
    expect(zones.filter((z) => z.plan).length).toBe(1);
    expect(zones[zones.length - 1].plan !== undefined).toBe(true);
  });

  test("a newer zone printed on top of an older same-type zone replaces it", () => {
    const { bars, pivots } = series((i) => {
      const c = 104 - (i - 20) * 0.4;
      return { o: c + 0.2, h: c + 0.5, l: c - 0.3, c };
    });
    // second swing high at the same level, later
    bars[25] = bar(25, 104, 105.9, 103.5, 103.6);
    bars[26] = bar(26, 103.6, 103.7, 101.6, 101.7);
    const newer: StructurePivot = { index: 25, confirmedIndex: 35, t: 25 * 60_000, price: 105.9, kind: "high", label: "LH" };
    const zones = computeFreshZones(bars, [pivots[0], newer]);
    expect(zones).toHaveLength(1);
    expect(zones[0].t).toBe(newer.t);
    expect(zones[0].plan?.side).toBe("SELL");
  });
});

describe("strong-zone filter", () => {
  function demandSeries(withBearishFvg: boolean) {
    const bars = [] as ReturnType<typeof bar>[];
    for (let i = 0; i < 20; i++) bars.push(bar(i, 110 - i * 0.2, 110.4 - i * 0.2, 109.4 - i * 0.2, 109.7 - i * 0.2));
    bars.push(bar(20, 106, 106.2, 104, 105.8)); // swing low with lower wick
    // strong rally with a bullish imbalance off the low
    bars.push(bar(21, 105.8, 107.5, 105.7, 107.4));
    bars.push(bar(22, 107.4, 108.6, 106.6, 108.5));
    for (let i = 23; i < 30; i++) bars.push(bar(i, 108.5, 108.9, 108.1, 108.6));
    if (withBearishFvg) {
      bars.push(bar(30, 108.6, 108.7, 108.2, 108.3));
      bars.push(bar(31, 108.3, 108.35, 106.9, 107.0)); // bearish displacement
      bars.push(bar(32, 107.0, 107.4, 106.6, 106.8)); // high 107.4 < 108.2 low of bar 30
    } else {
      for (let i = 30; i < 33; i++) bars.push(bar(i, 108.5, 108.9, 108.1, 108.6));
    }
    for (let i = 33; i < 36; i++) bars.push(bar(i, 106.8, 107.1, 106.5, 106.9));
    const pivot: StructurePivot = { index: 20, confirmedIndex: 30, t: 20 * 60_000, price: 104, kind: "low", label: "LL" };
    return { bars, pivots: [pivot] };
  }

  test("a strong demand zone with a departure imbalance is shown", () => {
    const { bars, pivots } = demandSeries(false);
    const zones = computeFreshZones(bars, pivots);
    expect(zones).toHaveLength(1);
    expect(zones[0].type).toBe("DEMAND");
    expect(zones[0].imbalance).toBe(true);
  });

  test("a bearish FVG printed just above a demand zone rejects it", () => {
    const { bars, pivots } = demandSeries(true);
    expect(computeFreshZones(bars, pivots)).toHaveLength(0);
  });
});

describe("zone + displacement FVG strategy", () => {
  test("a zone without a same-direction departure FVG is hidden", () => {
    const { bars, pivots } = series((i) => {
      const c = 104 - (i - 20) * 0.4;
      return { o: c + 0.2, h: c + 0.5, l: c - 0.3, c };
    }, false);
    expect(computeFreshZones(bars, pivots)).toHaveLength(0);
  });

  test("the demand zone carries its bullish displacement FVG", () => {
    const bars = [] as ReturnType<typeof bar>[];
    for (let i = 0; i < 20; i++) bars.push(bar(i, 110 - i * 0.2, 110.4 - i * 0.2, 109.4 - i * 0.2, 109.7 - i * 0.2));
    bars.push(bar(20, 106, 106.2, 104, 105.8));
    bars.push(bar(21, 105.8, 107.5, 105.7, 107.4));
    bars.push(bar(22, 107.4, 108.6, 106.6, 108.5));
    for (let i = 23; i < 36; i++) bars.push(bar(i, 108.5, 108.9, 108.1, 108.6));
    const [z] = computeFreshZones(bars, [{ index: 20, confirmedIndex: 30, t: 20 * 60_000, price: 104, kind: "low", label: "LL" }]);
    expect(z.fvg?.type).toBe("BULLISH");
    expect(z.fvg!.bottom).toBe(106.2);
    expect(z.fvg!.top).toBe(106.6);
    expect(z.plan?.side).toBe("BUY");
  });
});
