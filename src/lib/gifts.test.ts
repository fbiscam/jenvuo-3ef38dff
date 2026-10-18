import { describe, expect, it } from "bun:test";
import { countUnseenGifts, isGiftReason } from "./gifts";

describe("gifts", () => {
  it("counts admin grants, bonuses, trial credit and referral rewards as gifts", () => {
    for (const r of ["admin_grant", "promo_bonus", "pro_trial_grant", "referral_reward", "founding_referral_reward"]) {
      expect(isGiftReason(r)).toBe(true);
    }
  });

  it("does not count purchases, monthly plan credit or refunds as gifts", () => {
    for (const r of ["topup_crypto", "monthly_grant", "plan_change", "refund"]) {
      expect(isGiftReason(r)).toBe(false);
    }
  });

  it("shows the dot only for gifts received after the box was last opened", () => {
    const gifts = [{ created_at: "2026-10-18T10:00:00Z" }, { created_at: "2026-10-18T12:00:00Z" }];
    expect(countUnseenGifts(gifts, null)).toBe(2);
    expect(countUnseenGifts(gifts, "2026-10-18T11:00:00Z")).toBe(1);
    expect(countUnseenGifts(gifts, "2026-10-18T13:00:00Z")).toBe(0);
  });
});
