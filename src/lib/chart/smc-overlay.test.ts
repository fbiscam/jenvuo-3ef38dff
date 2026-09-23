import { describe, it } from "node:test";
import { computeLivePivots, computeSmcOverlay, FRACTAL_RADIUS } from "./smc-overlay";
import { expect } from "./test-expect";
import type { OhlcvBar } from "./indicators";

const bar = (i: number, mid: number): OhlcvBar => ({
  time: 1_700_000_000 + i * 1800,
  open: mid,
  high: mid + 1,
  low: mid - 1,
  close: mid,
  volume: 100,
});

describe("smc overlay fractal labels", () => {
  it("only labels swings with 10 lower candles on each side", () => {
    // Zig-zag with a 25-bar period: swings every ~12 bars.
    const bars = Array.from({ length: 200 }, (_, i) => bar(i, 100 + 10 * Math.sin((i / 25) * 2 * Math.PI) + i * 0.05));
    const smc = computeSmcOverlay(bars, bars.at(-1)!.close);
    expect(smc.pivots.length > 0).toBe(true);
    for (const p of smc.pivots) {
      const idx = bars.findIndex((b) => b.time * 1000 === p.t);
      const around = bars.slice(idx - FRACTAL_RADIUS, idx + FRACTAL_RADIUS + 1).filter((_, k) => k !== FRACTAL_RADIUS);
      if (p.kind === "high") expect(around.every((b) => b.high < p.price)).toBe(true);
      else expect(around.every((b) => b.low > p.price)).toBe(true);
    }
  });

  it("puts a live label on the forming candle when it makes the new extreme", () => {
    const closed = Array.from({ length: 40 }, (_, i) => ({ t: i, o: 100, h: 101 + (i === 15 ? 5 : 0), l: 99, c: 100 }));
    const forming = { t: 40, o: 100, h: 110, l: 99.5, c: 109 };
    const confirmed = [{ index: 15, confirmedIndex: 25, t: 15, price: 106, kind: "high" as const, label: "H" as const }];
    const live = computeLivePivots(closed, forming, confirmed);
    const high = live.find((p) => p.kind === "high");
    expect(high?.label).toBe("HH");
    expect(high?.onFormingCandle).toBe(true);
    expect(high?.barsAfter).toBe(0);
  });
});
