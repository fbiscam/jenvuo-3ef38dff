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

  test("keeps only the newest gaps", () => {
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
