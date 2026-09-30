import { describe, it as test } from "node:test";
import { expect } from "./test-expect";
import { computeFreshFvgs, FVG_MAX_TOTAL } from "./fresh-fvgs";

const bar = (i: number, o: number, h: number, l: number, c: number) => ({ t: i * 60_000, o, h, l, c });

function flat(n: number, price = 100) {
  return Array.from({ length: n }, (_, i) => bar(i, price, price + 0.5, price - 0.5, price + 0.1));
}

describe("computeFreshFvgs", () => {
  test("detects a fresh bullish FVG after a displacement candle", () => {
    const bars = flat(20);
    bars.push(bar(20, 100, 103, 99.9, 102.9)); // displacement
    bars.push(bar(21, 103, 104, 101.5, 103.8)); // low 101.5 > 100.5 high of bar 19
    bars.push(bar(22, 103.8, 104.5, 103.2, 104.2));
    const fvgs = computeFreshFvgs(bars);
    expect(fvgs).toHaveLength(1);
    expect(fvgs[0].type).toBe("BULLISH");
    expect(fvgs[0].bottom).toBe(100.5);
    expect(fvgs[0].top).toBe(101.5);
    expect(fvgs[0].fresh).toBe(true);
  });

  test("removes a bullish FVG once a candle closes below it", () => {
    const bars = flat(20);
    bars.push(bar(20, 100, 103, 99.9, 102.9));
    bars.push(bar(21, 103, 104, 101.5, 103.8));
    bars.push(bar(22, 103.8, 104, 99, 99.5));
    expect(computeFreshFvgs(bars)).toHaveLength(0);
  });

  test("marks a partially filled bearish FVG as tested", () => {
    const bars = flat(20);
    bars.push(bar(20, 100, 100.1, 97, 97.1));
    bars.push(bar(21, 97, 98.5, 96, 96.5)); // high 98.5 < 99.5 low of bar 19
    bars.push(bar(22, 96.5, 99, 96, 97));
    const fvgs = computeFreshFvgs(bars);
    expect(fvgs).toHaveLength(1);
    expect(fvgs[0].type).toBe("BEARISH");
    expect(fvgs[0].fresh).toBe(false);
  });

  test("keeps only the newest 2 gaps", () => {
    const bars = flat(20);
    let p = 100;
    for (let s = 0; s < 8; s++) {
      const i = bars.length;
      bars.push(bar(i, p, p + 3, p - 0.1, p + 2.9));
      bars.push(bar(i + 1, p + 3, p + 4, p + 1.5, p + 3.8));
      bars.push(bar(i + 2, p + 3.8, p + 4.4, p + 3.4, p + 4.2));
      p += 4.2;
    }
    expect(computeFreshFvgs(bars).length <= FVG_MAX_TOTAL).toBe(true);
  });
});

import { resolveZoneOverlaps } from "./smc-overlay";
import type { SdZone } from "./fresh-zones";

describe("resolveZoneOverlaps", () => {
  const zone = (t: number, top: number, bottom: number): SdZone => ({
    type: "DEMAND", t, top, bottom, label: "HL", fresh: true, touches: 0, displacementAtr: 1,
    extreme: false, extremeLevel: bottom, live: false, strength: 60, grade: "STRONG",
    levels: { side: "BUY", entry: top, sl: bottom - 1, tp1: top + 2, tp2: top + 3 },
  });
  const fvg = (t: number, top: number, bottom: number) =>
    ({ type: "BULLISH" as const, t, top, bottom, fresh: true, filled: 0, sizeAtr: 1 });

  test("a newer FVG on top of an older zone hides the zone", () => {
    const r = resolveZoneOverlaps([zone(1, 105, 100)], [fvg(5, 104, 102)]);
    expect(r.sdZones).toHaveLength(0);
    expect(r.fvgs).toHaveLength(1);
  });

  test("a newer zone on top of an older FVG hides the FVG and carries the plan", () => {
    const r = resolveZoneOverlaps([zone(9, 105, 100), zone(2, 90, 88)], [fvg(5, 104, 102)], 1, 2);
    expect(r.fvgs).toHaveLength(0);
    expect(r.sdZones).toHaveLength(2);
    expect(r.sdZones[1].t).toBe(9);
    expect(r.sdZones[1].plan?.side).toBe("BUY");
    expect(r.sdZones[0].plan).toBe(undefined);
  });

  test("shows only the latest FVG", () => {
    const r = resolveZoneOverlaps([], [fvg(1, 10, 9), fvg(2, 20, 19), fvg(3, 30, 29), fvg(4, 40, 39)]);
    expect(r.fvgs).toHaveLength(1);
    expect(r.fvgs[0].t).toBe(4);
  });

  test("strategy keeps only the latest zone, with its plan, and its own FVG never hides it", () => {
    const own = fvg(12, 106, 105.5);
    const zones = [zone(1, 10, 9), zone(3, 30, 29), zone(6, 60, 59), { ...zone(10, 106, 104), fvg: own }];
    const r = resolveZoneOverlaps(zones, [own]);
    expect(r.sdZones.map((z) => z.t).join(",")).toBe("10");
    expect(r.sdZones[0].plan?.side).toBe("BUY");
  });
});
