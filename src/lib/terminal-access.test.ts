import { describe, it } from "node:test";
import { expect } from "./chart/test-expect";
import { evaluateFoundingRow, evaluateTerminalAccess } from "./terminal-access.server";

const now = Date.parse("2026-10-22T12:00:00Z");
const day = 86_400_000;
const iso = (ms: number) => new Date(ms).toISOString();

describe("Terminal access (Founding members only)", () => {
  it("no Founding row is locked, whatever plan or credit the user has", () => {
    const r = evaluateTerminalAccess(null);
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe("not_founding");
  });
  it("approved Founding member with verified ID is allowed", () => {
    const row = { id: "a", approved_at: iso(now - 10 * day), created_at: null, document_status: "verified" };
    const r = evaluateTerminalAccess(evaluateFoundingRow(row, now));
    expect(r.allowed).toBe(true);
    expect(r.reason).toBe("founding");
  });
  it("approved Founding member inside the 2-day ID window is allowed", () => {
    const row = { id: "a", approved_at: iso(now - day), created_at: null, document_status: null };
    expect(evaluateTerminalAccess(evaluateFoundingRow(row, now)).allowed).toBe(true);
  });
  it("Founding member past the 2-day ID window is locked as id_overdue", () => {
    const row = { id: "a", approved_at: iso(now - 3 * day), created_at: null, document_status: null };
    const r = evaluateTerminalAccess(evaluateFoundingRow(row, now));
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe("id_overdue");
  });
  it("active paid plan unlocks the Terminal without Founding", () => {
    const r = evaluateTerminalAccess(null, { planId: "pro", status: "active", periodEnd: iso(now + day) }, now);
    expect(r.allowed).toBe(true);
    expect(r.reason).toBe("paid");
  });
  it("expired plan does not unlock the Terminal", () => {
    expect(evaluateTerminalAccess(null, { planId: "elite", status: "active", periodEnd: iso(now - day) }, now).allowed).toBe(false);
  });
  it("free plan does not unlock the Terminal", () => {
    expect(evaluateTerminalAccess(null, { planId: "free", status: "active", periodEnd: iso(now + day) }, now).allowed).toBe(false);
  });
});
