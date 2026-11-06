import { describe, it } from "node:test";
import { expect } from "./chart/test-expect";
import { planPrice, planCoveredBy } from "./plan-pricing";

describe("plan pricing", () => {
  it("charges Terminal + API only for everyone who is not a verified Founding member", () => {
    expect(planPrice("pro", false)).toBe(29);
    expect(planPrice("elite", false)).toBe(59);
    expect(planPrice("ultra", false)).toBe(99);
  });
  it("adds the JX Bot cost for verified Founding members", () => {
    expect(planPrice("pro", true)).toBe(49);
    expect(planPrice("elite", true)).toBe(99);
    expect(planPrice("ultra", true)).toBe(169);
  });
  it("a Terminal-only payment does not cover the same plan with JX Bot", () => {
    expect(planCoveredBy(29, false)).toBe("pro");
    expect(planCoveredBy(29, true)).toBe(null);
    expect(planCoveredBy(99, true)).toBe("elite");
    expect(planCoveredBy(99, false)).toBe("ultra");
  });
});
