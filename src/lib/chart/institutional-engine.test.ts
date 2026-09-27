import { describe, it } from "node:test";
import { expect } from "./test-expect";
import { clusterBuyerPercent, detectLiquiditySweeps, positionSize } from "./institutional-engine";

describe("institutional engine", () => {
  it("B% = green volume share of the 3-candle swing cluster", () => {
    const c = [
      { t: 1, o: 1, h: 2, l: 0, c: 2, v: 300 },
      { t: 2, o: 2, h: 3, l: 1, c: 1, v: 100 },
      { t: 3, o: 1, h: 4, l: 0, c: 3, v: 100 },
    ];
    expect(clusterBuyerPercent(c, 1)).toBe(80);
  });

  it("flags a wick-through with body back inside as a liquidity sweep", () => {
    const closed = [
      { t: 0, o: 10, h: 11, l: 9, c: 10 },
      { t: 1, o: 10, h: 10.5, l: 7.5, c: 9.8 },
    ];
    const sweeps = detectLiquiditySweeps(closed, [
      { index: 0, confirmedIndex: 0, t: 0, price: 8, kind: "low", label: "HL" },
    ]);
    expect(sweeps).toHaveLength(1);
    expect(sweeps[0].dir).toBe("bullish");
  });

  it("sizes gold lots from cash risk and stop distance", () => {
    expect(positionSize(1000, 1, 2000, 1995, 100).lots).toBe(0.02);
  });
});
