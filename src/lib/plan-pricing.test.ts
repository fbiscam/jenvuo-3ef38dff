import { describe, it } from "node:test";
import { expect } from "./chart/test-expect";
import { planPrice, planCoveredBy, orderCreditToAdd, PLAN_API_CREDIT, planOrderCovers, FOUNDING_API_CREDIT } from "./plan-pricing";

describe("plan pricing", () => {
  it("charges Pro $69, Elite $139, Ultra $239 (JX Bot included)", () => {
    expect(planPrice("pro")).toBe(69);
    expect(planPrice("elite")).toBe(139);
    expect(planPrice("ultra")).toBe(239);
    expect(planPrice("ultra", false)).toBe(239);
  });
  it("a payment covers the highest plan it pays for", () => {
    expect(planCoveredBy(69)).toBe("pro");
    expect(planCoveredBy(68)).toBe(null);
    expect(planCoveredBy(139)).toBe("elite");
    expect(planCoveredBy(239)).toBe("ultra");
  });
  it("a plan payment adds only the plan's API credit: Pro $40, Elite $70, Ultra $90", () => {
    expect(PLAN_API_CREDIT).toEqual({ pro: 40, elite: 70, ultra: 90 });
    expect(orderCreditToAdd({ planId: "elite", topupCreditUsd: 139 })).toBe(70);
    expect(orderCreditToAdd({ planId: "pro", topupCreditUsd: 69 })).toBe(40);
    expect(orderCreditToAdd({ planId: "ultra", topupCreditUsd: 239 })).toBe(90);
  });
  it("Founding Pro gets $40 and Founding Elite $70 API credit", () => {
    expect(FOUNDING_API_CREDIT).toEqual({ pro: 40, elite: 70 });
  });
  it("credit already added by the plan switch counts toward the plan credit", () => {
    expect(orderCreditToAdd({ planId: "elite", topupCreditUsd: 0, gainedFromPlanSwitch: 70 })).toBe(0);
    expect(orderCreditToAdd({ planId: "elite", topupCreditUsd: 0, gainedFromPlanSwitch: 9 })).toBe(61);
  });
  it("a credit top-up adds exactly the credit bought", () => {
    expect(orderCreditToAdd({ planId: null, topupCreditUsd: 40 })).toBe(40);
  });
  it("an underpaid plan order never covers the plan", () => {
    expect(planOrderCovers({ planId: "ultra", payUsd: 99 })).toBe(false);
    expect(planOrderCovers({ planId: "pro", payUsd: 29.42 })).toBe(false);
    expect(planOrderCovers({ planId: "pro", payUsd: 69.42 })).toBe(true);
    expect(planOrderCovers({ planId: "free", payUsd: 239 })).toBe(false);
  });
  it("a discount promo counts toward the plan price", () => {
    expect(planOrderCovers({ planId: "elite", payUsd: 127.2, discountUsd: 11.8 })).toBe(true);
    expect(planOrderCovers({ planId: "elite", payUsd: 100, discountUsd: 11.8 })).toBe(false);
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

import { annualPrice, annualFullPrice, ANNUAL_DISCOUNT_PCT, DEFAULT_BILLING_CYCLE } from "./plan-pricing";
describe("yearly pricing", () => {
  it("the pricing page opens on yearly", () => {
    expect(DEFAULT_BILLING_CYCLE).toBe("annual");
  });
  it("gives 22% off twelve months", () => {
    expect(ANNUAL_DISCOUNT_PCT).toBe(22);
  });
  it("Pro is $645 a year instead of $828", () => {
    expect(annualFullPrice("pro")).toBe(828);
    expect(annualPrice("pro")).toBe(645);
  });
  it("Elite is $1,301 a year instead of $1,668", () => {
    expect(annualFullPrice("elite")).toBe(1668);
    expect(annualPrice("elite")).toBe(1301);
  });
  it("Ultra is $2,237 a year instead of $2,868", () => {
    expect(annualFullPrice("ultra")).toBe(2868);
    expect(annualPrice("ultra")).toBe(2237);
  });
});
