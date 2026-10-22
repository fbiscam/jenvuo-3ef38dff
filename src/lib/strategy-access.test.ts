import { describe, it as test } from "node:test";
import { expect } from "./chart/test-expect";
import { evaluateStrategyAccess } from "./strategy-access";

describe("chart strategy lock", () => {
  test("account without a plan stays locked", () => {
    expect(evaluateStrategyAccess({ allowed: false, reason: "no_plan" })).toEqual({ allowed: false, reason: "no_plan" });
  });

  test("ended trial locks the strategies", () => {
    expect(evaluateStrategyAccess({ allowed: false, reason: "trial_ended" }).allowed).toBe(false);
  });

  test("running Pro trial unlocks them", () => {
    expect(evaluateStrategyAccess({ allowed: true, reason: "trial" })).toEqual({ allowed: true, reason: "trial" });
  });

  test("paid plan unlocks them", () => {
    expect(evaluateStrategyAccess({ allowed: true, reason: "paid" })).toEqual({ allowed: true, reason: "paid" });
  });

  test("approved Founding members unlock them", () => {
    expect(evaluateStrategyAccess({ allowed: true, reason: "founding" }).allowed).toBe(true);
  });
});
