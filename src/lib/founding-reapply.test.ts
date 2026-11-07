import { describe, it } from "node:test";
import { expect } from "./chart/test-expect";
import { foundingReapplyDecision, REAPPLY_MESSAGES } from "./founding-reapply";

describe("foundingReapplyDecision", () => {
  it("new email is inserted", () => {
    expect(foundingReapplyDecision(null, false).action).toBe("insert");
  });
  it("pending application blocks a second one", () => {
    const d = foundingReapplyDecision({ status: "pending" }, false);
    expect(d.action === "block" && d.error).toBe(REAPPLY_MESSAGES.underReview);
  });
  it("rejected applicant can apply again", () => {
    expect(foundingReapplyDecision({ status: "rejected" }, true).action).toBe("reopen");
  });
  it("member whose account was removed can apply again", () => {
    expect(foundingReapplyDecision({ status: "active" }, false).action).toBe("reopen");
    expect(foundingReapplyDecision({ status: "graduated" }, false).action).toBe("reopen");
  });
  it("active member with an account is told to sign in", () => {
    const d = foundingReapplyDecision({ status: "active" }, true);
    expect(d.action === "block" && d.error).toBe(REAPPLY_MESSAGES.member);
  });
  it("finished member with an account cannot take a second free month", () => {
    const d = foundingReapplyDecision({ status: "graduated" }, true);
    expect(d.action === "block" && d.error).toBe(REAPPLY_MESSAGES.used);
  });
});
