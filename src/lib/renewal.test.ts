import { describe, it } from "node:test";
import { expect } from "./chart/test-expect";
import { renewalState } from "./renewal";

const due = "2026-11-01T00:00:00.000Z";
const at = (iso: string) => Date.parse(iso);

describe("all-account plan expiry", () => {
  it("no notice before the 1st", () => {
    expect(renewalState({ plan_id: "elite", renewal_due_at: due, lapsed_plan_id: null }, at("2026-10-31T12:00:00Z"))).toBe(null);
  });
  it("expired plans have no three-day grace", () => {
    const r = renewalState({ plan_id: "elite", renewal_due_at: due, lapsed_plan_id: null }, at("2026-11-02T00:00:00Z"));
    expect(r?.kind).toBe("lapsed");
  });
  it("expires at the exact deadline", () => {
    expect(renewalState({ plan_id: "pro", renewal_due_at: due, lapsed_plan_id: null }, at(due))?.kind).toBe("lapsed");
  });
  it("after moving to Free, it asks to pay the lapsed plan", () => {
    const r = renewalState({ plan_id: "free", renewal_due_at: null, lapsed_plan_id: "elite" }, at("2026-11-05T00:00:00Z"));
    expect(r?.kind).toBe("lapsed");
  });
});
