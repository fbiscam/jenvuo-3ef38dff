import { describe, it as test } from "node:test";
import { expect } from "./chart/test-expect";
import { evaluateStrategyAccess } from "./strategy-access";
import { FREE_PLAN_API_KEYS, FREE_PLAN_CREDIT_USD, TERMINAL_DAILY_HOURS } from "./free-plan";

const H = 3600;

describe("Terminal paid indicators: hours per day by plan", () => {
  test("plan hours are Free 2, Pro 8, Elite 16, Ultra 24", () => {
    expect(TERMINAL_DAILY_HOURS).toEqual({ free: 2, pro: 8, elite: 16, ultra: 24 });
  });

  test("Free account gets them until 2 hours are used", () => {
    expect(evaluateStrategyAccess({ allowed: false, reason: "no_plan" }, "free", 0)).toEqual({ allowed: true, reason: "free", tier: "free", secondsLeft: 2 * H });
    expect(evaluateStrategyAccess({ allowed: false, reason: "no_plan" }, "free", 2 * H - 60).allowed).toBe(true);
  });

  test("Free account locks after 2 hours", () => {
    expect(evaluateStrategyAccess({ allowed: false, reason: "no_plan" }, null, 2 * H)).toEqual({ allowed: false, reason: "time_used", tier: "free", secondsLeft: 0 });
  });

  test("Pro locks after 8 hours, not before", () => {
    expect(evaluateStrategyAccess({ allowed: true, reason: "paid" }, "pro", 8 * H - 1).allowed).toBe(true);
    expect(evaluateStrategyAccess({ allowed: true, reason: "paid" }, "pro", 8 * H).allowed).toBe(false);
  });

  test("Elite locks after 16 hours", () => {
    expect(evaluateStrategyAccess({ allowed: true, reason: "paid" }, "elite", 10 * H).allowed).toBe(true);
    expect(evaluateStrategyAccess({ allowed: true, reason: "paid" }, "elite", 16 * H).allowed).toBe(false);
  });

  test("Ultra and admins have no daily limit", () => {
    expect(evaluateStrategyAccess({ allowed: true, reason: "paid" }, "ultra", 23 * H)).toEqual({ allowed: true, reason: "paid", tier: "ultra", secondsLeft: null });
    expect(evaluateStrategyAccess({ allowed: true, reason: "admin" }, "free", 30 * H).allowed).toBe(true);
  });

  test("ended trial falls back to Free hours", () => {
    expect(evaluateStrategyAccess({ allowed: false, reason: "trial_ended" }, "pro", 3 * H).allowed).toBe(false);
  });

  test("running trial counts as Pro (8 hours)", () => {
    expect(evaluateStrategyAccess({ allowed: true, reason: "trial" }, "pro", 5 * H).secondsLeft).toBe(3 * H);
  });
});

describe("Free plan", () => {
  test("$10 API credit and 1 API key", () => {
    expect(FREE_PLAN_CREDIT_USD).toBe(10);
    expect(FREE_PLAN_API_KEYS).toBe(1);
  });
});
