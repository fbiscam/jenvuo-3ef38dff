import { describe, it } from "node:test";
import { expect } from "./chart/test-expect";
import { TRIAL_API_RPM, trialRateBlock } from "./free-trial";
import { getPlanApiRpm, getPlanDailyTokenLimit, planRateBlock } from "./plan-entitlements";

describe("API requests per minute by plan", () => {
  it("Free 10, Pro 20, Elite 40, Ultra 80", () => {
    expect(TRIAL_API_RPM).toBe(10);
    expect(getPlanApiRpm("free")).toBe(10);
    expect(getPlanApiRpm("pro")).toBe(20);
    expect(getPlanApiRpm("elite")).toBe(40);
    expect(getPlanApiRpm("ultra")).toBe(80);
  });
  it("allows the 20th Pro call in a minute and blocks the 21st", () => {
    expect(planRateBlock({ planId: "pro", requestsLastMinute: 19 })).toBe(null);
    expect(planRateBlock({ planId: "pro", requestsLastMinute: 20 }) !== null).toBe(true);
  });
  it("blocks the 11th Free call in a minute", () => {
    expect(trialRateBlock({ isFreeTrial: true, requestsLastMinute: 9 })).toBe(null);
    expect(trialRateBlock({ isFreeTrial: true, requestsLastMinute: 10 }) !== null).toBe(true);
  });
});

describe("daily token limits by plan", () => {
  it("Free 1M, Pro 4M, Elite 10M, Ultra 20M", () => {
    expect(getPlanDailyTokenLimit("free")).toBe(1_000_000);
    expect(getPlanDailyTokenLimit("pro")).toBe(4_000_000);
    expect(getPlanDailyTokenLimit("elite")).toBe(10_000_000);
    expect(getPlanDailyTokenLimit("ultra")).toBe(20_000_000);
  });
});
