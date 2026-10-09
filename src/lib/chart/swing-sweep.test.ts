import { describe, it as test } from "node:test";
import { expect } from "./test-expect";
import { classifySwingSweep } from "./swing-sweep";

type B = { t: number; o: number; h: number; l: number; c: number };
const bar = (i: number, o: number, h: number, l: number, c: number): B => ({ t: i, o, h, l, c });
const base = (): B[] => Array.from({ length: 12 }, (_, i) => bar(i, 100, 101, 99, 100));

describe("classifySwingSweep", () => {
  test("wick above previous 10 highs, close back inside, then drop = confirmed", () => {
    const b = base();
    b.push(bar(12, 100.5, 103, 100, 100.6));
    b.push(bar(13, 100.6, 100.8, 98.5, 99));
    expect(classifySwingSweep(b, 12, "high").status).toBe("confirmed");
  });
  test("close above the level and no reclaim is not a sweep", () => {
    const b = base();
    b.push(bar(12, 100.5, 103, 100, 102.5));
    b.push(bar(13, 102.5, 104, 102, 103.5));
    expect(classifySwingSweep(b, 12, "high").status).toBe("none");
  });
  test("waits until reaction candles close", () => {
    const b = base();
    b.push(bar(12, 100.5, 103, 100, 100.6));
    expect(classifySwingSweep(b, 12, "high").status).toBe("pending");
  });
  test("low sweep then rally = confirmed", () => {
    const b = base();
    b.push(bar(12, 99.5, 100, 97, 99.4));
    b.push(bar(13, 99.4, 101.2, 99.2, 101));
    expect(classifySwingSweep(b, 12, "low").status).toBe("confirmed");
  });
  test("no move within 5 candles = failed (no move)", () => {
    const b = base();
    b.push(bar(12, 100.5, 103, 100, 100.6));
    for (let k = 13; k <= 17; k++) b.push(bar(k, 100.6, 101, 100.2, 100.7));
    const r = classifySwingSweep(b, 12, "high");
    expect(r.status).toBe("failed");
    expect(r.text).toBe("Sweep, no move");
  });
  test("move on the 2nd candle still confirms", () => {
    const b = base();
    b.push(bar(12, 100.5, 103, 100, 100.6));
    b.push(bar(13, 100.6, 101, 100.2, 100.7));
    b.push(bar(14, 100.7, 100.8, 99, 99.5));
    expect(classifySwingSweep(b, 12, "high").status).toBe("confirmed");
  });
  test("move on the 4th candle = late move, not no move", () => {
    const b = base();
    b.push(bar(12, 100.5, 103, 100, 100.6));
    b.push(bar(13, 100.6, 101, 100.2, 100.7));
    b.push(bar(14, 100.7, 101, 100.2, 100.7));
    b.push(bar(15, 100.7, 101, 100.2, 100.7));
    b.push(bar(16, 100.7, 100.8, 99, 99.5));
    expect(classifySwingSweep(b, 12, "high").status).toBe("late");
  });
  test("next-candle reclaim that already closes past the body confirms", () => {
    const b = base();
    b.push(bar(12, 100.8, 100.9, 97, 98.6)); // wick below 99, closes below level
    b.push(bar(13, 98.6, 101.5, 98.5, 101.2)); // reclaims and closes above body top
    b.push(bar(14, 101.2, 101.4, 100.6, 100.9));
    b.push(bar(15, 100.9, 101.1, 100.5, 100.7));
    expect(classifySwingSweep(b, 12, "low").status).toBe("confirmed");
  });
});
