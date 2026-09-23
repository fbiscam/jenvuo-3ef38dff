import { describe, expect, it } from "vitest";
import { describeDrawing, hitTest, positionLevels, type Drawing, type Projector } from "./drawings";
import type { OhlcvBar } from "./indicators";

const bars: OhlcvBar[] = Array.from({ length: 10 }, (_, i) => ({
  time: 1_700_000_000 + i * 1800,
  open: 2000 + i,
  high: 2005 + i,
  low: 1995 + i,
  close: 2001 + i,
  volume: 10,
}));

const pr: Projector = {
  x: (t) => (t - bars[0].time) / 18,
  y: (p) => 2100 - p,
  width: 1000,
  height: 400,
};

describe("drawings", () => {
  it("describes a circle with the candles it covers for the AI", () => {
    const d: Drawing = {
      id: "c",
      tool: "circle",
      color: "#f00",
      createdAt: 0,
      points: [
        { t: bars[2].time, p: 2000 },
        { t: bars[4].time, p: 2010 },
      ],
    };
    const text = describeDrawing(d, bars);
    expect(text).toContain("Circle");
    expect(text).toContain("covers 3 candle(s)");
    expect(text).toContain("highest high 2009.00");
  });

  it("computes long position levels with a 2R default", () => {
    const d: Drawing = {
      id: "l",
      tool: "long",
      color: "#0f0",
      createdAt: 0,
      points: [
        { t: bars[5].time, p: 2010 },
        { t: bars[6].time, p: 2000 },
      ],
    };
    expect(positionLevels(d)).toEqual({ entry: 2010, stop: 2000, target: 2030 });
  });

  it("hit-tests horizontal lines and handles", () => {
    const h: Drawing = { id: "h", tool: "hline", color: "#000", createdAt: 0, points: [{ t: bars[1].time, p: 2050 }] };
    const t: Drawing = {
      id: "t",
      tool: "trend",
      color: "#000",
      createdAt: 0,
      points: [
        { t: bars[0].time, p: 2000 },
        { t: bars[9].time, p: 2009 },
      ],
    };
    expect(hitTest([h, t], pr, 300, 50)?.id).toBe("h");
    expect(hitTest([h, t], pr, 0, 100)).toEqual({ id: "t", handle: 0 });
    expect(hitTest([h, t], pr, 500, 300)).toBeNull();
  });
});
