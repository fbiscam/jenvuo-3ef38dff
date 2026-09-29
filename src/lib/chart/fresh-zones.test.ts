import { describe, it as test } from "node:test";
import { expect } from "./test-expect";
import { computeFreshZones } from "./fresh-zones";
import type { StructurePivot } from "@/lib/analysis/market-structure-evidence";

const bar = (i: number, o: number, h: number, l: number, c: number) => ({ t: i * 60_000, o, h, l, c });

function series(afterSwing: (i: number) => { o: number; h: number; l: number; c: number }) {
  const bars = [] as ReturnType<typeof bar>[];
  for (let i = 0; i < 20; i++) bars.push(bar(i, 100 + i * 0.2, 100.6 + i * 0.2, 99.6 + i * 0.2, 100.3 + i * 0.2));
  bars.push(bar(20, 104, 106, 103.8, 104.4)); // swing high with upper wick
  for (let i = 21; i < 40; i++) {
    const b = afterSwing(i);
    bars.push(bar(i, b.o, b.h, b.l, b.c));
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
    expect(zones[0].fresh).toBe(true);
    expect(zones[0].extreme).toBe(true);
  });

  test("no zone when price does not displace away by closes", () => {
    const { bars, pivots } = series(() => ({ o: 104.3, h: 104.9, l: 104, c: 104.4 }));
    expect(computeFreshZones(bars, pivots)).toHaveLength(0);
  });

  test("zone is removed once a candle closes above it", () => {
    const { bars, pivots } = series((i) => {
      const c = i < 32 ? 104 - (i - 20) * 0.4 : 106.5;
      return { o: c, h: c + 0.3, l: c - 0.3, c };
    });
    expect(computeFreshZones(bars, pivots)).toHaveLength(0);
  });

  test("a live swing shows its zone immediately, before any displacement", () => {
    const { bars, pivots } = series(() => ({ o: 104.3, h: 104.9, l: 104, c: 104.4 }));
    const zones = computeFreshZones(bars, [{ ...pivots[0], live: true }]);
    expect(zones).toHaveLength(1);
    expect(zones[0].live).toBe(true);
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

  test("tested zone has no trade plan", () => {
    const { bars, pivots } = series((i) => {
      const c = i < 30 ? 104 - (i - 20) * 0.4 : 104.5;
      return { o: c, h: i === 34 ? 105.5 : c + 0.2, l: c - 0.3, c };
    });
    const [z] = computeFreshZones(bars, pivots);
    expect(z.fresh).toBe(false);
    expect(z.plan).toBe(undefined);
  });

  test("only the newest 5 zones are kept", () => {
    const bars = [] as ReturnType<typeof bar>[];
    const pivots: StructurePivot[] = [];
    for (let i = 0; i < 200; i++) {
      const wave = Math.sin(i / 3) * 5;
      const c = 100 + wave;
      bars.push(bar(i, c, c + 0.4, c - 0.4, c));
    }
    for (let i = 25; i < 190; i += 19) {
      bars[i] = bar(i, 200 + i, 201 + i, 199.8 + i, 200 + i - 0.1);
      for (let k = 1; k <= 3; k++) bars[i + k] = bar(i + k, 190 + i, 190.3 + i, 189.5 + i, 189.8 + i);
      pivots.push({ index: i, confirmedIndex: i + 10, t: i * 60_000, price: 201 + i, kind: "high", label: "HH" });
    }
    const zones = computeFreshZones(bars, pivots);
    expect(zones.length <= 4).toBe(true);
    expect(zones[zones.length - 1].t).toBe(pivots[pivots.length - 1].t);
    // Zones never stack on each other.
    for (let a = 0; a < zones.length; a++)
      for (let b = a + 1; b < zones.length; b++)
        expect(zones[a].bottom > zones[b].top || zones[a].top < zones[b].bottom).toBe(true);
    // Entry / SL / TP only on one zone at most.
    expect(zones.filter((z) => z.plan).length <= 1).toBe(true);
  });

  test("zone hides once its trade played out (entry filled, then SL hit)", () => {
    const { bars, pivots } = series((i) => {
      const c = 104 - (i - 20) * 0.4;
      // Candle 34 wicks through entry and SL but closes back below the zone.
      if (i === 34) return { o: 100, h: 107, l: 99.5, c: 100 };
      return { o: c + 0.2, h: c + 0.5, l: c - 0.3, c };
    });
    expect(computeFreshZones(bars, pivots)).toHaveLength(0);
  });
});
