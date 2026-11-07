import { describe, it } from "node:test";
import { expect } from "./chart/test-expect";
import { creditLotExpiry, foundingCreditFor, foundingCreditEnd, foundingPlanFor, foundingTrialEnd } from "./founding-offer";
import { foundingBotState, jxBotNavOpen, reachedFoundingMilestone } from "./founding-bot";

const approved = "2026-10-01T00:00:00.000Z";
const app = (o: Partial<{ status: string; documents_verified_at: string | null; bot_locked_at: string | null }> = {}) => ({
  status: "approved",
  approved_at: approved,
  documents_verified_at: "2026-10-02T00:00:00.000Z",
  bot_locked_at: null,
  ...o,
});

describe("Founding offer", () => {
  it("gives Pro or Elite only", () => {
    expect(foundingPlanFor("pro")).toBe("pro");
    expect(foundingPlanFor("elite")).toBe("elite");
    expect(foundingPlanFor("ultra")).toBe("pro");
    expect(foundingPlanFor(null)).toBe("pro");
  });
  it("plan lasts 30 days", () => {
    expect(foundingTrialEnd(new Date(approved)).toISOString()).toBe("2026-10-31T00:00:00.000Z");
  });
  it("Founding credit is only the plan's API credit: Pro $10, Elite $25", () => {
    expect(foundingCreditFor("pro")).toBe(10);
    expect(foundingCreditFor("elite")).toBe(25);
  });
  it("Founding credit ends with the plan after 30 days", () => {
    expect(foundingCreditEnd(new Date(approved)).toISOString()).toBe("2026-10-31T00:00:00.000Z");
    expect(creditLotExpiry(new Date(approved), "founding_trial_grant").toISOString()).toBe("2026-10-31T00:00:00.000Z");
  });
  it("other credit expires 30 days after it was granted", () => {
    expect(creditLotExpiry(new Date(approved), "topup").toISOString()).toBe("2026-10-31T00:00:00.000Z");
    expect(creditLotExpiry(new Date(approved), "free_trial_grant").toISOString()).toBe("2026-10-31T00:00:00.000Z");
  });
});

describe("Founding JX Bot", () => {
  const day31 = Date.parse("2026-11-01T00:00:00.000Z");
  const day20 = Date.parse("2026-10-21T00:00:00.000Z");
  it("stays locked until ID is verified", () => {
    expect(foundingBotState(app({ documents_verified_at: null }), day20)).toBe("awaiting_id");
  });
  it("runs during the 30 days once ID is verified", () => {
    expect(foundingBotState(app(), day20)).toBe("active");
  });
  it("ends after 30 days whatever the profit", () => {
    expect(foundingBotState(app(), day31)).toBe("locked");
    expect(foundingBotState(app({ documents_verified_at: null }), day31)).toBe("locked");
  });
  it("$200 profit is the milestone for the 30-day notice", () => {
    expect(reachedFoundingMilestone(200)).toBe(true);
    expect(reachedFoundingMilestone(199.99)).toBe(false);
  });
  it("is not given to applications that are not approved", () => {
    expect(foundingBotState(app({ status: "pending" }), day20)).toBe("none");
  });
  it("sidebar JX Bot is locked for non-members without a paid plan", () => {
    expect(jxBotNavOpen({ isAdmin: false, allowed: false })).toBe(false);
    expect(jxBotNavOpen({ isAdmin: false, allowed: true })).toBe(true);
    expect(jxBotNavOpen({ isAdmin: true, allowed: false })).toBe(true);
  });
});
