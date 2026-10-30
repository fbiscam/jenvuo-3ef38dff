import { describe, it } from "node:test";
import { expect } from "./chart/test-expect";
import { dailyTarget, evaluateIpLicense, licenseLimit, newLicenseKey, LICENSE_KEY_RE } from "./mt5-licenses";

const key = "JENV-ABCD-EFGH-JKLM-NPQR";
const paid = (plan: string) => ({ plan_id: plan, status: "active", is_trial: false, current_period_end: "2099-01-01T00:00:00Z" });
const lic = { mt5_account: "203.0.113.25#12345678", revoked_at: null };
const IP = "203.0.113.25";

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
  it("valid IP on paid plan returns targets", () => {
    const r = evaluateIpLicense(IP, IP, "12345678", lic, paid("elite"));
    expect(r.valid && [r.plan, r.daily_target, r.monthly_target]).toEqual(["elite", 75, 1500]);
  });
  it("rejects when the bot's real IP differs from the entered IP", () => {
    expect(evaluateIpLicense(IP, "198.51.100.7", "12345678", lic, paid("pro"))).toEqual({ valid: false, reason: "ip_mismatch" });
  });
  it("1 IP = 1 MT5 account: first account locks in, others are rejected", () => {
    const first = evaluateIpLicense(IP, IP, "111", { mt5_account: IP, revoked_at: null }, paid("pro"));
    expect(first.valid && first.bind).toBe(true);
    expect(evaluateIpLicense(IP, IP, "222", lic, paid("pro"))).toEqual({ valid: false, reason: "account_mismatch" });
  });
  it("14-day free trial unlocks the bot until it ends", () => {
    expect(evaluateIpLicense(IP, IP, "12345678", lic, { ...paid("pro"), is_trial: true }).valid).toBe(true);
    expect(evaluateIpLicense(IP, IP, "12345678", lic, { ...paid("pro"), is_trial: true, current_period_end: "2020-01-01T00:00:00Z" }).valid).toBe(false);
  });
  it("expired period is rejected", () => {
    expect(evaluateIpLicense(IP, IP, "12345678", lic, { ...paid("pro"), current_period_end: "2000-01-01T00:00:00Z" })).toEqual({ valid: false, reason: "expired" });
  });
  it("malformed and revoked", () => {
    expect(evaluateIpLicense("bad", IP, "1", lic, paid("pro"))).toEqual({ valid: false, reason: "malformed" });
    expect(evaluateIpLicense(IP, IP, "12345678", { ...lic, revoked_at: "x" }, paid("pro"))).toEqual({ valid: false, reason: "revoked" });
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

describe('owner bot target', () => {
  it('imgakhar@gmail.com gets $1,000 daily, others keep plan targets', async () => {
    const { targetsFor, evaluateIpLicense } = await import('./mt5-licenses')
    expect(targetsFor('ultra', '5af751fb-de3b-4a24-aefd-aed53ef44378').daily).toBe(1000)
    expect(targetsFor('ultra', 'someone-else').daily).toBe(150)
    const r = evaluateIpLicense('203.0.113.25', '203.0.113.25', '12345', { mt5_account: '203.0.113.25#12345', revoked_at: null, user_id: '5af751fb-de3b-4a24-aefd-aed53ef44378' }, { plan_id: 'ultra', status: 'active', is_trial: false, current_period_end: null })
    expect(r.valid && r.daily_target).toBe(1000)
  })
})

describe("delete bot account", () => {
  it("blocks accounts live on a JX Bot license or running, allows old ones", async () => {
    const { botAccountDeleteBlock } = await import("./mt5-licenses");
    const now = Date.parse("2026-10-30T05:00:00Z");
    const old = new Date(now - 60 * 60_000).toISOString();
    const lic = [
      { id: "a", mt5_account: "203.0.113.25#111", revoked_at: null },
      { id: "b", mt5_account: "203.0.113.26", revoked_at: null },
      { id: "c", mt5_account: "203.0.113.27#333", revoked_at: "2026-10-01T00:00:00Z" },
    ];
    const rep = [
      { license_id: "a", mt5_account: "111", updated_at: old },
      { license_id: "b", mt5_account: "222", updated_at: old },
      { license_id: "gone", mt5_account: "444", updated_at: old },
      { license_id: "gone", mt5_account: "555", updated_at: new Date(now - 30_000).toISOString() },
    ];
    expect(botAccountDeleteBlock("111", lic, rep, [], now)).toBe("live_license");
    expect(botAccountDeleteBlock("222", lic, rep, [], now)).toBe("live_license");
    expect(botAccountDeleteBlock("333", lic, rep, [], now)).toBe(null);
    expect(botAccountDeleteBlock("444", lic, rep, [], now)).toBe(null);
    expect(botAccountDeleteBlock("555", lic, rep, [], now)).toBe("running");
    expect(botAccountDeleteBlock("444", lic, rep, [{ mt5_account: "444", last_seen_at: new Date(now - 10_000).toISOString(), ended_at: null }], now)).toBe("running");
    // A stale session left open (PC turned off) does not lock the account.
    expect(botAccountDeleteBlock("444", lic, rep, [{ mt5_account: "444", last_seen_at: old, ended_at: null }], now)).toBe(null);
  });

  it("only the IP-linked account is locked when 2 IPs share one account", async () => {
    const { botAccountDeleteBlock } = await import("./mt5-licenses");
    const now = Date.parse("2026-10-30T05:00:00Z");
    const old = new Date(now - 24 * 60 * 60_000).toISOString();
    const lic = [
      { id: "x", mt5_account: "18.116.15.28#474818470", revoked_at: null },
      { id: "y", mt5_account: "153.117.68.156#474818470", revoked_at: null },
    ];
    const rep = ["472966321", "474790077", "474800884", "474820178", "474821288"].map((a, i) => ({ license_id: `old${i}`, mt5_account: a, updated_at: old }));
    expect(botAccountDeleteBlock("474818470", lic, rep, [], now)).toBe("live_license");
    for (const a of ["472966321", "474790077", "474800884", "474820178", "474821288"]) expect(botAccountDeleteBlock(a, lic, rep, [], now)).toBe(null);
  });
});

import { botAccountDeleteBlock as _bdb } from "./mt5-licenses";
test("IP-only license locks only its most recent account", () => {
  const lic = [{ id: "L1", mt5_account: "1.2.3.4", revoked_at: null }];
  const old = new Date(Date.now() - 86400000).toISOString();
  const newer = new Date(Date.now() - 3600000).toISOString();
  const reps = [{ license_id: "L1", mt5_account: "111", updated_at: old }, { license_id: "L1", mt5_account: "222", updated_at: newer }];
  expect(_bdb("222", lic, reps, [])).toBe("live_license");
  expect(_bdb("111", lic, reps, [])).toBe(null);
});
