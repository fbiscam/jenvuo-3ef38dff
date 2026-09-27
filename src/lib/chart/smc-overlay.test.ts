import { describe, it } from "node:test";
import {
  breakLabelBaseline,
  computeLivePivots,
  computeSmcOverlay,
  FRACTAL_RADIUS,
  reversalPressureStrength,
  selectHighConfidencePois,
  structureBadgeTop,
} from "./smc-overlay";
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
  it("keeps structure and break labels inside the chart at extreme wicks", () => {
    expect(structureBadgeTop(1, true, 300)).toBe(2);
    expect(structureBadgeTop(299, false, 300)).toBe(280);
    expect(breakLabelBaseline(1, true, 300)).toBe(15);
    expect(breakLabelBaseline(299, false, 300)).toBe(297);
  });

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

  it("derives BOS/CHoCH and liquidity only from confirmed 10-bar pivots", () => {
    const bars = Array.from({ length: 80 }, (_, i): OhlcvBar => ({
      time: 1_700_000_000 + i * 1800,
      open: 100,
      high: i === 20 ? 120 : i === 45 ? 122 : 105 + (i % 3) * 0.1,
      low: i === 60 ? 85 : 95 - (i % 2) * 0.1,
      close: i === 45 ? 121 : 100,
      volume: 100,
    }));
    const smc = computeSmcOverlay(bars, bars.at(-1)?.close ?? null);
    const isTenBarPivot = (price: number, kind: "high" | "low") => {
      const idx = bars.findIndex((b) => (kind === "high" ? b.high : b.low) === price);
      if (idx < FRACTAL_RADIUS || idx >= bars.length - FRACTAL_RADIUS) return false;
      const neighbours = bars
        .slice(idx - FRACTAL_RADIUS, idx + FRACTAL_RADIUS + 1)
        .filter((_, offset) => offset !== FRACTAL_RADIUS);
      return kind === "high"
        ? neighbours.every((b) => b.high < price)
        : neighbours.every((b) => b.low > price);
    };

    expect(smc.breaks.length > 0).toBe(true);
    for (const event of smc.breaks) {
      expect(isTenBarPivot(event.level, event.dir === "bullish" ? "high" : "low")).toBe(true);
    }
    for (const price of smc.buySide) expect(isTenBarPivot(price, "high")).toBe(true);
    for (const price of smc.sellSide) expect(isTenBarPivot(price, "low")).toBe(true);
  });

  it("keeps only the strongest untouched demand, supply and directional FVG", () => {
    const base = { status: "UNMITIGATED" as const, mitigated_t: null };
    const result = selectHighConfidencePois(
      {
        order_blocks: [
          { ...base, type: "DEMAND", index: 10, t: 10, top: 98, bottom: 96, displacement: true, swept_liquidity: true, is_fvg_aligned: true },
          { ...base, type: "DEMAND", index: 20, t: 20, top: 100, bottom: 99, displacement: true, swept_liquidity: true, is_fvg_aligned: true },
          { ...base, type: "SUPPLY", index: 30, t: 30, top: 106, bottom: 105, displacement: true, swept_liquidity: true, is_fvg_aligned: true },
          { ...base, type: "SUPPLY", index: 31, t: 31, top: 104, bottom: 103, displacement: true, swept_liquidity: false, is_fvg_aligned: true },
        ],
        fair_value_gaps: [
          { ...base, type: "BULLISH_FVG", index: 11, t: 11, top: 95, bottom: 94, ce: 94.5, size: 1 },
          { ...base, type: "BULLISH_FVG", index: 21, t: 21, top: 95.5, bottom: 93.5, ce: 94.5, size: 2 },
          { ...base, type: "BEARISH_FVG", index: 31, t: 31, top: 108, bottom: 107, ce: 107.5, size: 2 },
          { ...base, type: "BEARISH_FVG", index: 32, t: 32, top: 106, bottom: 105, ce: 105.5, size: 1 },
        ],
      },
      101,
    );

    expect(result.orderBlocks.filter((zone) => zone.type === "DEMAND")).toHaveLength(1);
    expect(result.orderBlocks.filter((zone) => zone.type === "SUPPLY")).toHaveLength(1);
    expect(result.orderBlocks.some((zone) => zone.index === 31)).toBe(false);
    expect(result.fvgs.filter((gap) => gap.type === "BULLISH_FVG")).toHaveLength(1);
    expect(result.fvgs.filter((gap) => gap.type === "BEARISH_FVG")).toHaveLength(1);
    const allZones = [...result.orderBlocks, ...result.fvgs];
    for (let i = 0; i < allZones.length; i++) {
      for (let j = i + 1; j < allZones.length; j++) {
        expect(allZones[i].bottom >= allZones[j].top || allZones[i].top <= allZones[j].bottom).toBe(true);
      }
    }
  });

  it("keeps isolated reversal clues below strong pressure", () => {
    const strength = reversalPressureStrength({
      directionalAgreement: 0.4,
      displacement: 0.8,
      footprint: 1,
      confirmation: 0.1,
      followThrough: 0.15,
      streak: 0.2,
      evidence: 1,
      directionalBias: 0.45,
      efficiency: 0.2,
      persistence: 0.2,
    });
    expect(strength < 0.25).toBe(true);
  });

  it("reserves high pressure for confirmed, efficient reversals", () => {
    const weak = reversalPressureStrength({
      directionalAgreement: 0.25,
      displacement: 0.45,
      footprint: 0.7,
      confirmation: 0.3,
      followThrough: 0.35,
      streak: 0.35,
      evidence: 1,
      directionalBias: 0.55,
      efficiency: 0.35,
      persistence: 0.4,
    });
    const strong = reversalPressureStrength({
      directionalAgreement: 0.45,
      displacement: 1,
      footprint: 1,
      confirmation: 1,
      followThrough: 0.95,
      streak: 1,
      evidence: 1,
      directionalBias: 0.95,
      efficiency: 0.9,
      persistence: 0.9,
    });
    expect(strong > weak).toBe(true);
    expect(strong >= 0.4).toBe(true);
  });

  it("penalizes contradictory directional flow", () => {
    const shared = {
      directionalAgreement: 0.32,
      displacement: 0.7,
      footprint: 0.8,
      confirmation: 0.8,
      followThrough: 0.7,
      streak: 0.7,
      evidence: 1,
      efficiency: 0.7,
      persistence: 0.7,
    };
    const aligned = reversalPressureStrength({ ...shared, directionalBias: 0.85 });
    const opposed = reversalPressureStrength({ ...shared, directionalBias: 0.2 });
    expect(aligned > opposed).toBe(true);
  });
});
