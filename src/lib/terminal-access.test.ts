import { describe, it } from "node:test";
import { expect } from "./chart/test-expect";
import { evaluateFoundingRow, evaluatePlanAccess, evaluateTerminalAccess } from "./terminal-access.server";
import { evaluateStrategyAccess } from "./strategy-access";

const now = Date.parse("2026-10-22T12:00:00Z");
const day = 86_400_000;
const iso = (ms: number) => new Date(ms).toISOString();
const sub = (o: Partial<{ plan_id: string; status: string; is_trial: boolean; current_period_end: string; trial_ends_at: string }>) => ({
  plan_id: null, status: null, is_trial: null, current_period_end: null, trial_ends_at: null, ...o,
});

describe("Terminal access (open to everyone)", () => {
  it("a free account with no plan can open the Terminal", () => {
    const r = evaluateTerminalAccess(evaluatePlanAccess(null, now));
    expect(r.allowed).toBe(true);
    expect(r.reason).toBe("no_plan");
  });
  it("a free account keeps the paid chart strategies locked", () => {
    expect(evaluateStrategyAccess(evaluatePlanAccess(null, now)).allowed).toBe(false);
  });
  it("an active Starter plan unlocks the paid strategies", () => {
    const plan = evaluatePlanAccess(sub({ plan_id: "starter", status: "active", current_period_end: iso(now + day) }), now);
    expect(evaluateStrategyAccess(plan).allowed).toBe(true);
  });
  it("an expired paid plan locks the paid strategies again", () => {
    const plan = evaluatePlanAccess(sub({ plan_id: "pro", status: "active", current_period_end: iso(now - day) }), now);
    expect(evaluateStrategyAccess(plan).allowed).toBe(false);
    expect(evaluateTerminalAccess(plan).allowed).toBe(true);
  });
  it("a running Pro trial unlocks them, an ended one does not", () => {
    const running = evaluatePlanAccess(sub({ plan_id: "pro", status: "trialing", is_trial: true, trial_ends_at: iso(now + day) }), now);
    const ended = evaluatePlanAccess(sub({ plan_id: "pro", status: "trialing", is_trial: true, trial_ends_at: iso(now - day) }), now);
    expect(running.allowed).toBe(true);
    expect(ended.allowed).toBe(false);
  });
  it("Founding member inside the 2-day ID window has paid features", () => {
    const row = { id: "a", approved_at: iso(now - day), created_at: null, document_status: null };
    expect(evaluateFoundingRow(row, now).allowed).toBe(true);
  });
  it("Founding member past the ID window still opens the Terminal", () => {
    const row = { id: "a", approved_at: iso(now - 3 * day), created_at: null, document_status: null };
    const r = evaluateTerminalAccess(evaluateFoundingRow(row, now));
    expect(r.allowed).toBe(true);
    expect(r.reason).toBe("id_overdue");
  });
});
