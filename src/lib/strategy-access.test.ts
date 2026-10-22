import { describe, it as test } from "node:test";
import { expect } from "./chart/test-expect";
import { STRATEGY_HOURLY_FEE_USD, evaluateStrategyAccess, strategyHourKey } from "./strategy-access";

const NOW = Date.parse("2026-10-22T06:30:00Z");
const future = "2026-11-01T00:00:00Z";
const past = "2026-10-01T00:00:00Z";

describe("chart strategy lock", () => {
  test("fee is $0.10 per hour", () => {
    expect(STRATEGY_HOURLY_FEE_USD).toBe(0.1);
  });

  test("free account with no plan stays locked even with credit", () => {
    const r = evaluateStrategyAccess({ isAdmin: false, isFounding: false, sub: { plan_id: "free", status: "active", is_trial: false, trial_ends_at: null }, balance: 50, now: NOW });
    expect(r).toEqual({ allowed: false, reason: "no_plan" });
  });

  test("running free trial with credit unlocks", () => {
    const r = evaluateStrategyAccess({ isAdmin: false, isFounding: false, sub: { plan_id: "pro", status: "active", is_trial: true, trial_ends_at: future }, balance: 100, now: NOW });
    expect(r).toEqual({ allowed: true, reason: "trial" });
  });

  test("ended trial locks again", () => {
    const r = evaluateStrategyAccess({ isAdmin: false, isFounding: false, sub: { plan_id: "pro", status: "active", is_trial: true, trial_ends_at: past }, balance: 100, now: NOW });
    expect(r.allowed).toBe(false);
  });

  test("paid plan with zero credit is locked", () => {
    const r = evaluateStrategyAccess({ isAdmin: false, isFounding: false, sub: { plan_id: "elite", status: "active", is_trial: false, trial_ends_at: null }, balance: 0, now: NOW });
    expect(r).toEqual({ allowed: false, reason: "no_credit" });
  });

  test("paid plan with credit unlocks", () => {
    const r = evaluateStrategyAccess({ isAdmin: false, isFounding: false, sub: { plan_id: "pro", status: "active", is_trial: false, trial_ends_at: null }, balance: 0.1, now: NOW });
    expect(r).toEqual({ allowed: true, reason: "paid" });
  });

  test("admins are never locked", () => {
    const r = evaluateStrategyAccess({ isAdmin: true, isFounding: false, sub: null, balance: 0, now: NOW });
    expect(r.allowed).toBe(true);
  });

  test("one charge key per UTC hour", () => {
    expect(strategyHourKey(NOW)).toBe("2026-10-22T06");
    expect(strategyHourKey(Date.parse("2026-10-22T06:59:59Z"))).toBe("2026-10-22T06");
    expect(strategyHourKey(Date.parse("2026-10-22T07:00:00Z"))).toBe("2026-10-22T07");
  });
});
