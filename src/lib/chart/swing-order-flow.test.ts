import { describe, it } from "node:test";
import { expect } from "./test-expect";
import { classifySwingOrderFlow } from "./swing-order-flow";

const bar = (t: number, o: number, h: number, l: number, c: number) => ({ t, o, h, l, c });

describe("classifySwingOrderFlow", () => {
  it("waits until 3 candles after the swing have closed", () => {
    const bars = [bar(0, 10, 11, 9, 10), bar(1, 10, 11, 9, 10)];
    expect(classifySwingOrderFlow(bars, 0).side).toBe("pending");
  });
  it("reads buyers when candles close at their highs", () => {
    const bars = [0, 1, 2, 3].map((t) => bar(t, 10, 12, 10, 12));
    expect(classifySwingOrderFlow(bars, 0)).toMatchObject({ delta: 100, side: "buyers" });
  });
  it("reads sellers when candles close at their lows", () => {
    const bars = [0, 1, 2, 3].map((t) => bar(t, 12, 12, 10, 10));
    expect(classifySwingOrderFlow(bars, 0)).toMatchObject({ delta: -100, side: "sellers" });
  });
});
