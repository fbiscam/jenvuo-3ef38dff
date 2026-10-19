import { describe, it } from "node:test";
import { expect } from "./chart/test-expect";
import { renewalState } from "./renewal";

const due = "2026-11-01T00:00:00.000Z";
const at = (iso: string) => Date.parse(iso);

describe("Founding renewal notice", () => {
  it("no notice before the 1st", () => {
    expect(renewalState({ plan_id: "elite", renewal_due_at: due, lapsed_plan_id: null }, at("2026-10-31T12:00:00Z"))).toBe(null);
  });
  it("3-day notice starts on the 1st", () => {
    const r = renewalState({ plan_id: "elite", renewal_due_at: due, lapsed_plan_id: null }, at("2026-11-02T00:00:00Z"));
    expect(r?.kind).toBe("due");
    expect(r && r.kind === "due" ? r.deadline : "").toBe("2026-11-04T00:00:00.000Z");
  });
  it("after moving to Free, it asks to pay the lapsed plan", () => {
    const r = renewalState({ plan_id: "free", renewal_due_at: null, lapsed_plan_id: "elite" }, at("2026-11-05T00:00:00Z"));
    expect(r?.kind).toBe("lapsed");
  });
});
