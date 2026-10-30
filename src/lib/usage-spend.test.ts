import { describe, it } from "node:test";
import { expect } from "./chart/test-expect";
import { isNonUsageDeduction } from "./usage-spend";

describe("isNonUsageDeduction", () => {
  it("treats expired credit as not usage", () => {
    expect(isNonUsageDeduction({ delta: -88.37, reason: "expired" })).toBe(true);
  });
  it("treats trial end and plan cancel as not usage", () => {
    expect(isNonUsageDeduction({ delta: -1, reason: "trial_expired" })).toBe(true);
    expect(isNonUsageDeduction({ delta: -29.1, reason: "plan_cancelled" })).toBe(true);
  });
  it("keeps real AI charges as usage", () => {
    expect(isNonUsageDeduction({ delta: -0.04, reason: "extension_api" })).toBe(false);
    expect(isNonUsageDeduction({ delta: -0.3, reason: "terminal_daily" })).toBe(false);
  });
});
