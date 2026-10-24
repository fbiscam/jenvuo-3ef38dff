import { describe, it } from "node:test";
import { expect } from "./chart/test-expect";
import { dailyTarget, evaluateLicense, licenseLimit, newLicenseKey, LICENSE_KEY_RE } from "./mt5-licenses";

const key = "JENV-ABCD-EFGH-JKLM-NPQR";
const paid = (plan: string) => ({ plan_id: plan, status: "active", is_trial: false, current_period_end: "2099-01-01T00:00:00Z" });
const lic = { mt5_account: "12345678", revoked_at: null };

describe("mt5 licenses", () => {
  it("daily targets are monthly / 20", () => {
    expect(dailyTarget("pro")).toBe(50);
    expect(dailyTarget("elite")).toBe(150);
    expect(dailyTarget("ultra")).toBe(300);
  });
  it("license limits per plan", () => {
    expect(licenseLimit("pro")).toBe(1);
    expect(licenseLimit("elite")).toBe(2);
    expect(licenseLimit("ultra")).toBe(5);
    expect(licenseLimit("free")).toBe(0);
  });
  it("valid key on paid plan returns targets", () => {
    const r = evaluateLicense(key, "12345678", lic, paid("elite"));
    expect(r).toMatchObject({ valid: true, plan: "elite", daily_target: 150, monthly_target: 3000 });
  });
  it("rejects a different MT5 account", () => {
    expect(evaluateLicense(key, "999", lic, paid("pro"))).toEqual({ valid: false, reason: "mt5_mismatch" });
  });
  it("trial does not unlock the bot", () => {
    expect(evaluateLicense(key, "12345678", lic, { ...paid("pro"), is_trial: true }).valid).toBe(false);
  });
  it("expired period is rejected", () => {
    expect(evaluateLicense(key, "12345678", lic, { ...paid("pro"), current_period_end: "2000-01-01T00:00:00Z" })).toEqual({ valid: false, reason: "expired" });
  });
  it("malformed and revoked", () => {
    expect(evaluateLicense("bad", "1", lic, paid("pro"))).toEqual({ valid: false, reason: "malformed" });
    expect(evaluateLicense(key, "12345678", { ...lic, revoked_at: "x" }, paid("pro"))).toEqual({ valid: false, reason: "revoked" });
  });
  it("generates keys in the bot's format", () => {
    expect(LICENSE_KEY_RE.test(newLicenseKey())).toBe(true);
  });
});
