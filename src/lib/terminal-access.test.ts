import { describe, it } from "node:test";
import { expect } from "./chart/test-expect";
import { evaluatePlanAccess } from "./terminal-access.server";

const now = Date.parse("2026-10-19T12:00:00Z");
const day = 86_400_000;
const free = { plan_id: "free", status: "active", is_trial: false, current_period_end: null, trial_ends_at: null };

describe("Terminal plan access", () => {
  it("Free account is unlocked during its first 14 days", () => {
    expect(evaluatePlanAccess(free, new Date(now - 13 * day).toISOString(), now).allowed).toBe(true);
  });
  it("Free account locks after 14 days", () => {
    const r = evaluatePlanAccess(free, new Date(now - 15 * day).toISOString(), now);
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe("trial_ended");
  });
  it("upgrading to a paid plan unlocks it again", () => {
    const pro = { ...free, plan_id: "pro", current_period_end: new Date(now + 20 * day).toISOString() };
    expect(evaluatePlanAccess(pro, new Date(now - 60 * day).toISOString(), now).allowed).toBe(true);
  });
});
