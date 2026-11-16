import { describe, it } from "node:test";
import { expect } from "./chart/test-expect";
import { isFoundingMember, jxBotAction, purchaseGate } from "./founding-bot";

describe("JX Bot page button", () => {
  it("shows Upgrade on the Free plan", () => {
    expect(jxBotAction({ state: "none", allowed: true, viaFounding: false, plan: "free" })).toEqual({ label: "Upgrade", to: "/dashboard/pay" });
  });
  it("shows Upgrade to members on their Founding month", () => {
    expect(jxBotAction({ state: "active", allowed: true, viaFounding: true, plan: "pro" })?.label).toBe("Upgrade");
  });
  it("shows nothing on a paid plan", () => {
    expect(jxBotAction({ state: "none", allowed: true, viaFounding: false, plan: "elite" })).toBe(null);
  });
  it("sends members without a verified ID to upload it", () => {
    expect(jxBotAction({ state: "awaiting_id", allowed: true, viaFounding: false, plan: "free" })?.to).toBe("/dashboard/documents");
  });
  it("treats only approved applicants as members", () => {
    expect(isFoundingMember("none")).toBe(false);
    expect(isFoundingMember(null)).toBe(false);
    expect(isFoundingMember("locked")).toBe(true);
  });
});

import { isVerifiedFoundingMember } from "./founding-bot";
describe("verified Founding member (sees and runs JX Bot)", () => {
  it("needs approval and ID verification", () => {
    expect(isVerifiedFoundingMember({ state: "active", verified_at: "2026-11-01T00:00:00Z" })).toBe(true);
    expect(isVerifiedFoundingMember({ state: "locked", verified_at: "2026-11-01T00:00:00Z" })).toBe(true);
    expect(isVerifiedFoundingMember({ state: "awaiting_id", verified_at: null })).toBe(false);
    expect(isVerifiedFoundingMember({ state: "none", verified_at: null })).toBe(false);
  });
});

describe("Who can pay for plans", () => {
  it("lets any signed-in user buy a plan", () => {
    expect(purchaseGate({ isAdmin: false, member: false, verified: false, kind: "plan" })).toEqual({ canBuy: true, reason: "ok" });
    expect(purchaseGate({ isAdmin: false, member: true, verified: true, kind: "plan" })).toEqual({ canBuy: true, reason: "ok" });
  });
  it("makes a Founding member verify their ID before paying", () => {
    expect(purchaseGate({ isAdmin: false, member: true, verified: false, kind: "plan" })).toEqual({ canBuy: false, reason: "verify_id" });
  });
  it("refuses credit top-ups", () => {
    expect(purchaseGate({ isAdmin: false, member: false, verified: false, kind: "topup" })).toEqual({ canBuy: false, reason: "no_topup" });
  });
});
