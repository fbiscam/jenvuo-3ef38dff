import { describe, expect, it } from "bun:test";
import { computeSwingTradePlan } from "./swing-trade-plan";

const bars = Array.from({ length: 30 }, (_, i) => ({ t: i, o: 100, h: 101, l: 99, c: 100 }));
bars[20] = { t: 20, o: 100, h: 101, l: 95, c: 100 };

describe("1H swing trade plan", () => {
  it("needs price action or a sweep", () => {
    expect(computeSwingTradePlan(bars.slice(0, 26), [{ index: 20, kind: "low", paOk: false, sweepOk: false }])).toBeNull();
  });
  it("BUY at a low: TP1 = 2R, TP2 = 3R, grade A+ when both", () => {
    const p = computeSwingTradePlan(bars.slice(0, 26), [{ index: 20, kind: "low", paOk: true, sweepOk: true }])!;
    expect(p.side).toBe("BUY");
    expect(p.grade).toBe("Sweep + PA");
    const r = p.entry - p.sl;
    expect(p.tp1).toBeCloseTo(p.entry + 2 * r);
    expect(p.tp2).toBeCloseTo(p.entry + 3 * r);
  });
  it("drops the plan once SL is hit", () => {
    const b = bars.slice(0, 26);
    b[25] = { t: 25, o: 100, h: 100, l: 90, c: 99 };
    expect(computeSwingTradePlan(b, [{ index: 20, kind: "low", paOk: true, sweepOk: false }])).toBeNull();
  });
});
