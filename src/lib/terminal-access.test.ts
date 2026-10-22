import { describe, it } from "node:test";
import { expect } from "./chart/test-expect";
import { evaluatePlanAccess } from "./terminal-access.server";

const now = Date.parse("2026-10-22T12:00:00Z");
const day = 86_400_000;
const iso = (ms: number) => new Date(ms).toISOString();
const free = { plan_id: "free", status: "active", is_trial: false, current_period_end: null, trial_ends_at: null };

describe("Terminal plan access", () => {
  it("Free account without a plan is locked, even on day one", () => {
    const r = evaluatePlanAccess(free, now);
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe("no_plan");
  });
  it("no subscription row is locked", () => {
    expect(evaluatePlanAccess(null, now).allowed).toBe(false);
  });
  it("paid plan unlocks it for its 30-day period", () => {
    const pro = { ...free, plan_id: "pro", current_period_end: iso(now + 29 * day) };
    expect(evaluatePlanAccess(pro, now).allowed).toBe(true);
  });
  it("paid plan locks once its period has ended", () => {
    const pro = { ...free, plan_id: "pro", current_period_end: iso(now - day) };
    expect(evaluatePlanAccess(pro, now).allowed).toBe(false);
  });
  it("running Pro free trial unlocks it", () => {
    const trial = { ...free, plan_id: "pro", is_trial: true, trial_ends_at: iso(now + 5 * day) };
    const r = evaluatePlanAccess(trial, now);
    expect(r.allowed).toBe(true);
    expect(r.reason).toBe("trial");
  });
  it("ended Pro trial locks it", () => {
    const trial = { ...free, plan_id: "pro", is_trial: true, trial_ends_at: iso(now - day) };
    const r = evaluatePlanAccess(trial, now);
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe("trial_ended");
  });
});
