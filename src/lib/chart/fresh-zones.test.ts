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
});
