import { describe, it } from "node:test";
import { expect } from "./chart/test-expect";
import { planPrice, planCoveredBy, orderCreditToAdd, PLAN_API_CREDIT, planOrderCovers } from "./plan-pricing";

describe("plan pricing", () => {
  it("charges Pro $29, Elite $59, Ultra $99 with JX Bot", () => {
    expect(planPrice("pro")).toBe(29);
    expect(planPrice("elite")).toBe(59);
    expect(planPrice("ultra")).toBe(99);
    expect(planPrice("ultra", true)).toBe(99);
  });
  it("a payment covers the highest plan it pays for", () => {
    expect(planCoveredBy(29)).toBe("pro");
    expect(planCoveredBy(28)).toBe(null);
    expect(planCoveredBy(59)).toBe("elite");
    expect(planCoveredBy(99, false)).toBe("ultra");
  });
  it("a plan payment adds only the plan's API credit: Pro $19, Elite $39, Ultra $59", () => {
    expect(PLAN_API_CREDIT.elite).toBe(39);
    expect(orderCreditToAdd({ planId: "elite", topupCreditUsd: 59 })).toBe(39);
    expect(orderCreditToAdd({ planId: "pro", topupCreditUsd: 29 })).toBe(19);
    expect(orderCreditToAdd({ planId: "ultra", topupCreditUsd: 99 })).toBe(59);
  });
  it("credit already added by the plan switch counts toward the plan credit", () => {
    expect(orderCreditToAdd({ planId: "elite", topupCreditUsd: 0, gainedFromPlanSwitch: 39 })).toBe(0);
    expect(orderCreditToAdd({ planId: "elite", topupCreditUsd: 0, gainedFromPlanSwitch: 9 })).toBe(30);
  });
  it("a credit top-up adds exactly the credit bought", () => {
    expect(orderCreditToAdd({ planId: null, topupCreditUsd: 40 })).toBe(40);
  });
  it("an underpaid plan order never covers the plan", () => {
    expect(planOrderCovers({ planId: "ultra", payUsd: 5.37 })).toBe(false);
    expect(planOrderCovers({ planId: "pro", payUsd: 28.5 })).toBe(false);
    expect(planOrderCovers({ planId: "pro", payUsd: 29.42 })).toBe(true);
    expect(planOrderCovers({ planId: "free", payUsd: 99 })).toBe(false);
  });
  it("without JX Bot (seats full) plans cost Pro $19, Elite $39, Ultra $59", () => {
    expect([planPrice("pro", false), planPrice("elite", false), planPrice("ultra", false)]).toEqual([19, 39, 59]);
    expect(planOrderCovers({ planId: "pro", payUsd: 19.42, withBot: false })).toBe(true);
    expect(planOrderCovers({ planId: "pro", payUsd: 19.42, withBot: true })).toBe(false);
  });
  it("a discount promo counts toward the plan price", () => {
    expect(planOrderCovers({ planId: "elite", payUsd: 47.2, discountUsd: 11.8 })).toBe(true);
    expect(planOrderCovers({ planId: "elite", payUsd: 20, discountUsd: 11.8 })).toBe(false);
  });
});

import { paidPeriodEnd } from "./plan-pricing";
describe("paid plan period", () => {
  const now = Date.parse("2026-11-18T00:00:00Z");
  it("a new or switched plan runs 30 days from payment", () => {
    expect(paidPeriodEnd({ samePlan: false, currentEnd: "2026-11-25T00:00:00Z", now })).toBe("2026-12-18T00:00:00.000Z");
    expect(paidPeriodEnd({ samePlan: false, currentEnd: null, now })).toBe("2026-12-18T00:00:00.000Z");
  });
  it("paying again for the same plan adds 30 days to the time left", () => {
    expect(paidPeriodEnd({ samePlan: true, currentEnd: "2026-11-25T00:00:00Z", now })).toBe("2026-12-25T00:00:00.000Z");
  });
  it("a same-plan payment after the period ended starts from the payment", () => {
    expect(paidPeriodEnd({ samePlan: true, currentEnd: "2026-11-01T00:00:00Z", now })).toBe("2026-12-18T00:00:00.000Z");
  });
});
