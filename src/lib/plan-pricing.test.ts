import { describe, it } from "node:test";
import { expect } from "./chart/test-expect";
import { planPrice, planCoveredBy, orderCreditToAdd, PLAN_API_CREDIT } from "./plan-pricing";

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
  it("a plan payment adds only the plan's API credit: Pro $25, Elite $59, Ultra $99", () => {
    expect(PLAN_API_CREDIT.elite).toBe(59);
    expect(orderCreditToAdd({ planId: "elite", topupCreditUsd: 99 })).toBe(59);
    expect(orderCreditToAdd({ planId: "pro", topupCreditUsd: 49 })).toBe(25);
    expect(orderCreditToAdd({ planId: "ultra", topupCreditUsd: 169 })).toBe(99);
  });
  it("credit already added by the plan switch counts toward the plan credit", () => {
    expect(orderCreditToAdd({ planId: "elite", topupCreditUsd: 0, gainedFromPlanSwitch: 59 })).toBe(0);
    expect(orderCreditToAdd({ planId: "elite", topupCreditUsd: 0, gainedFromPlanSwitch: 9 })).toBe(50);
  });
  it("a credit top-up adds exactly the credit bought", () => {
    expect(orderCreditToAdd({ planId: null, topupCreditUsd: 40 })).toBe(40);
  });
});
