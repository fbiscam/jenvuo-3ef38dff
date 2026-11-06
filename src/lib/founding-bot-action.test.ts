import { describe, it } from "node:test";
import { expect } from "./chart/test-expect";
import { isFoundingMember, jxBotAction, purchaseGate } from "./founding-bot";

describe("JX Bot page button", () => {
  it("asks non-members to apply for the Founding Program", () => {
    expect(jxBotAction({ state: "none", allowed: false, viaFounding: false })).toEqual({ label: "Apply for Founding Program", to: "/founding" });
  });
  it("shows Upgrade to members on their free Founding month", () => {
    expect(jxBotAction({ state: "active", allowed: true, viaFounding: true })?.label).toBe("Upgrade");
  });
  it("shows Buy now to members whose Founding month ended", () => {
    expect(jxBotAction({ state: "locked", allowed: false, viaFounding: false })?.label).toBe("Buy now");
  });
  it("sends members without a verified ID to upload it", () => {
    expect(jxBotAction({ state: "awaiting_id", allowed: false, viaFounding: false })?.to).toBe("/dashboard/documents");
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

describe("Who can pay for plans and credit", () => {
  it("lets an ID-verified Founding member buy", () => {
    expect(purchaseGate({ isAdmin: false, member: true, verified: true })).toEqual({ canBuy: true, reason: "ok" });
  });
  it("makes a Founding member verify their ID before paying", () => {
    expect(purchaseGate({ isAdmin: false, member: true, verified: false })).toEqual({ canBuy: false, reason: "verify_id" });
  });
  it("sends non-members to apply", () => {
    expect(purchaseGate({ isAdmin: false, member: false, verified: false })).toEqual({ canBuy: false, reason: "apply" });
  });
  it("lets admins buy", () => {
    expect(purchaseGate({ isAdmin: true, member: false, verified: false }).canBuy).toBe(true);
  });
});
