import { describe, expect, it } from "vitest";
import { relativeVolume, rvolLevel, volumeBaseline } from "./relative-volume";

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
