import { describe, it } from "node:test";
import { expect } from "./chart/test-expect";
import { idActionsLocked, idViewOnly } from "./id-gate";
import { isTrialPlanLocked, purchaseGate } from "./founding-bot";

describe("ID check: look but no actions", () => {
  it("locks actions for an approved member without a verified ID", () => {
    expect(idActionsLocked({ isAdmin: false, documentStatus: null, hasApplication: true })).toBe(true);
    expect(idActionsLocked({ isAdmin: false, documentStatus: "pending", hasApplication: true })).toBe(true);
  });
  it("opens actions once the ID is verified, and for admins", () => {
    expect(idActionsLocked({ isAdmin: false, documentStatus: "verified", hasApplication: true })).toBe(false);
    expect(idActionsLocked({ isAdmin: true, documentStatus: null, hasApplication: true })).toBe(false);
  });
  it("API keys and Chat pages are look-only", () => {
    expect(idViewOnly("/dashboard/api", true)).toBe(true);
    expect(idViewOnly("/dashboard/chat", true)).toBe(true);
  });
  it("Billing and Payments stay fully usable", () => {
    expect(idViewOnly("/dashboard/billing", true)).toBe(false);
    expect(idViewOnly("/dashboard/pay", true)).toBe(false);
  });
  it("nothing is look-only after verification", () => {
    expect(idViewOnly("/dashboard/chat", false)).toBe(false);
  });
});

describe("Buying before and after ID check", () => {
  it("unverified member can top up credit but not pick a plan", () => {
    expect(purchaseGate({ isAdmin: false, member: true, verified: false, kind: "topup" }).canBuy).toBe(true);
    expect(purchaseGate({ isAdmin: false, member: true, verified: false, kind: "plan" }).canBuy).toBe(false);
  });
  it("verified member can buy plans other than the one in their Founding month", () => {
    expect(isTrialPlanLocked("pro", "pro")).toBe(true);
    expect(isTrialPlanLocked("elite", "pro")).toBe(false);
    expect(isTrialPlanLocked("ultra", "pro")).toBe(false);
    expect(isTrialPlanLocked("pro", null)).toBe(false);
  });
});
