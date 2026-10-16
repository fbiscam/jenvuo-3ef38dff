import { describe, it } from "node:test";
import { expect } from "./test-expect";
import { relativeVolume, rvolLevel, volumeBaseline, volumeSplit } from "./relative-volume";

describe("relative volume", () => {
  it("uses the previous 20 candles as baseline, excluding the current one", () => {
    const vols = [...new Array(20).fill(100), 300];
    expect(volumeBaseline(vols)[20]).toBe(100);
    expect(relativeVolume(vols)[20]).toBe(3);
    expect(Number.isNaN(relativeVolume(vols)[19])).toBe(true);
  });

  it("flags 1.5x as high and 2.5x as an ultra spike", () => {
    expect(rvolLevel(1.49)).toBe("normal");
    expect(rvolLevel(1.5)).toBe("high");
    expect(rvolLevel(2.49)).toBe("high");
    expect(rvolLevel(2.5)).toBe("ultra");
  });
});

describe("buy / sell volume split", () => {
  it("close at the high is buying, at the low is selling, 60/40 cut", () => {
    expect(volumeSplit({ high: 10, low: 0, close: 10, volume: 100 }).side).toBe("buy");
    expect(volumeSplit({ high: 10, low: 0, close: 0, volume: 100 }).side).toBe("sell");
    expect(volumeSplit({ high: 10, low: 0, close: 6, volume: 100 }).side).toBe("buy");
    expect(volumeSplit({ high: 10, low: 0, close: 4, volume: 100 }).side).toBe("sell");
    expect(volumeSplit({ high: 10, low: 0, close: 5, volume: 100 }).side).toBe("balanced");
    expect(volumeSplit({ high: 10, low: 0, close: 7, volume: 100 }).buy).toBeCloseTo(70);
  });
});
