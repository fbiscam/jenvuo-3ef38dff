import { describe, it as test } from "node:test";
import { expect } from "./test-expect";
import {
  isHighProbabilityLiquiditySweep,
  isHighProbabilityPriceAction,
  isHighProbabilitySweep,
} from "./high-probability";
import type { LiquiditySweep } from "./liquidity-sweeps";

const sweep = (strength: number, confirmed: boolean): LiquiditySweep => ({
  side: "BSL", level: 100, fromT: 1, t: 2, extreme: 101, count: 1, major: false,
  strength, strong: strength >= 60, twoBar: false, confirmed,
});

describe("high-probability filter", () => {
  test("price action shows only when the reversal pattern and control agree", () => {
    expect(isHighProbabilityPriceAction({ pattern: "pin", reacted: true, control: "sellers", text: "", held: true, settled: true, reversalShare: 62 })).toBe(true);
    expect(isHighProbabilityPriceAction({ pattern: "pin", reacted: true, control: "sellers", text: "", held: true, settled: false, reversalShare: 62 })).toBe(false);
    expect(isHighProbabilityPriceAction({ pattern: "pin", reacted: true, control: "sellers", text: "", held: true, settled: true, reversalShare: 58 })).toBe(false);
    expect(isHighProbabilityPriceAction({ pattern: "pin", reacted: true, control: "sellers", text: "", held: false })).toBe(false);
    expect(isHighProbabilityPriceAction({ pattern: "pin", reacted: true, control: "sellers", text: "" })).toBe(false);
    expect(isHighProbabilityPriceAction({ pattern: "pin", reacted: false, control: "buyers", text: "" })).toBe(false);
    expect(isHighProbabilityPriceAction({ pattern: "indecision", reacted: false, control: "balanced", text: "" })).toBe(false);
  });
  test("fresh sweep shows only when confirmed with a strong rejection", () => {
    expect(isHighProbabilitySweep({ status: "confirmed", level: 1, text: "", strong: true, held: true })).toBe(true);
    expect(isHighProbabilitySweep({ status: "confirmed", level: 1, text: "", strong: true, held: false })).toBe(false);
    expect(isHighProbabilitySweep({ status: "confirmed", level: 1, text: "" })).toBe(false);
    expect(isHighProbabilitySweep({ status: "late", level: 1, text: "" })).toBe(false);
    expect(isHighProbabilitySweep({ status: "failed", level: 1, text: "" })).toBe(false);
    expect(isHighProbabilitySweep({ status: "pending", level: 1, text: "" })).toBe(false);
  });
  test("liquidity sweep needs strength 80+ and a held next candle", () => {
    expect(isHighProbabilityLiquiditySweep(sweep(80, true))).toBe(true);
    expect(isHighProbabilityLiquiditySweep(sweep(79, true))).toBe(false);
    expect(isHighProbabilityLiquiditySweep(sweep(90, false))).toBe(false);
  });
});
