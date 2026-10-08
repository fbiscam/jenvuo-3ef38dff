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
});
