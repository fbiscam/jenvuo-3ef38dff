import { describe, it } from "node:test";
import { expect } from "./chart/test-expect";
import { dailyTarget, evaluateLicense, licenseLimit, newLicenseKey, LICENSE_KEY_RE } from "./mt5-licenses";

const key = "JENV-ABCD-EFGH-JKLM-NPQR";
const paid = (plan: string) => ({ plan_id: plan, status: "active", is_trial: false, current_period_end: "2099-01-01T00:00:00Z" });
const lic = { mt5_account: "12345678", revoked_at: null };

describe("mt5 licenses", () => {
  it("daily targets are monthly / 20", () => {
    expect(dailyTarget("pro")).toBe(30);
    expect(dailyTarget("elite")).toBe(75);
    expect(dailyTarget("ultra")).toBe(150);
  });
  it("license limits per plan", () => {
    expect(licenseLimit("pro")).toBe(1);
    expect(licenseLimit("elite")).toBe(2);
    expect(licenseLimit("ultra")).toBe(5);
    expect(licenseLimit("free")).toBe(0);
  });
  it("valid key on paid plan returns targets", () => {
    const r = evaluateLicense(key, "12345678", lic, paid("elite"));
    expect(r.valid && [r.plan, r.daily_target, r.monthly_target]).toEqual(["elite", 75, 1500]);
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

import { sharedTargetStatus } from "./mt5-licenses";
describe("daily target per license", () => {
  it("an Ultra account stops at its own $150, not before", () => {
    expect(sharedTargetStatus(150, [149]).stop).toBe(false);
    expect(sharedTargetStatus(150, [150]).stop).toBe(true);
  });
  it("stays stopped for the day once hit, even if profit dips", () => {
    expect(sharedTargetStatus(150, [120], true).stop).toBe(true);
  });
});

import { sessionStep, sessionEndCause } from "./mt5-licenses";
describe("bot on/off sessions", () => {
  const t = Date.parse("2026-10-26T10:00:00Z");
  const seen = (ms: number) => ({ last_seen_at: new Date(t - ms).toISOString(), ended_at: null, end_reason: null });
  it("a report within 3 minutes extends the session, a later one starts a new one", () => {
    expect(sessionStep(seen(60_000), t)).toBe("extend");
    expect(sessionStep(seen(4 * 60_000), t)).toBe("new");
    expect(sessionStep(seen(10_000), t, "start")).toBe("new");
  });
  it("silent stop = PC/internet, removed from chart = user, bad license = bot", () => {
    expect(sessionEndCause(seen(10 * 60_000), t).by).toBe("pc");
    expect(sessionEndCause({ ...seen(0), ended_at: new Date(t).toISOString(), end_reason: "remove" }, t).by).toBe("you");
    expect(sessionEndCause({ ...seen(0), ended_at: new Date(t).toISOString(), end_reason: "license" }, t).by).toBe("bot");
    expect(sessionEndCause(seen(30_000), t).label).toBe("Running");
  });
});
