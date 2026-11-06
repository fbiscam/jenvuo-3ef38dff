import { describe, it } from "node:test";
import { expect } from "./chart/test-expect";
import { creditLotExpiry, FOUNDING_CREDIT_USD, FOUNDING_PLAN, foundingCreditEnd, foundingTrialEnd } from "./founding-offer";
import { foundingBotState } from "./founding-bot";

const approved = "2026-10-01T00:00:00.000Z";
const app = (o: Partial<{ status: string; documents_verified_at: string | null; bot_locked_at: string | null }> = {}) => ({
  status: "approved",
  approved_at: approved,
  documents_verified_at: "2026-10-02T00:00:00.000Z",
  bot_locked_at: null,
  ...o,
});

describe("Founding offer", () => {
  it("gives the Pro plan only", () => {
    expect(FOUNDING_PLAN).toBe("pro");
  });
  it("Pro plan lasts 30 days", () => {
    expect(foundingTrialEnd(new Date(approved)).toISOString()).toBe("2026-10-31T00:00:00.000Z");
  });
  it("$250 credit lasts 60 days", () => {
    expect(FOUNDING_CREDIT_USD).toBe(250);
    expect(foundingCreditEnd(new Date(approved)).toISOString()).toBe("2026-11-30T00:00:00.000Z");
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
    expect(foundingBotState(app({ documents_verified_at: null }), 0, day20)).toBe("awaiting_id");
  });
  it("runs before the 30-day check even with $200+ profit", () => {
    expect(foundingBotState(app(), 350, day20)).toBe("active");
  });
  it("locks after 30 days when profit reached $200", () => {
    expect(foundingBotState(app(), 200, day31)).toBe("locked");
  });
  it("keeps running after 30 days while profit is under $200", () => {
    expect(foundingBotState(app(), 199.99, day31)).toBe("active");
  });
  it("is not given to applications that are not approved", () => {
    expect(foundingBotState(app({ status: "pending" }), 0, day20)).toBe("none");
  });
});
