import { describe, it } from "node:test";
import { expect } from "./chart/test-expect";
import { promoCodeForOrder, promoRedeemable, redeemPromoCode } from "./promo-rules";
import assert from "node:assert/strict";

describe("promo redemption is separate from payment orders", () => {
  it("an emailed Pro gift activates directly without a credit top-up or payment", async () => {
    const result = await redeemPromoCode(" jnv-pro-1m-abcd-2345 ", {
      gift: async (code) => {
        assert.equal(code, "JNV-PRO-1M-ABCD-2345");
        return { ok: true, plan: "pro", months: 1 };
      },
      credit: async () => { throw new Error("Plan gift must not enter the top-up path"); },
    });
    assert.deepEqual(result, { ok: true, plan: "pro", months: 1 });
  });
  it("an API-credit promo redeems directly without purchasing a top-up", async () => {
    const result = await redeemPromoCode(" CREDIT35 ", {
      gift: async () => { throw new Error("Credit code must not activate a plan"); },
      credit: async (code) => {
        assert.equal(code, "CREDIT35");
        return { ok: true, credited: 35 };
      },
    });
    assert.deepEqual(result, { ok: true, credited: 35 });
  });
  it("gift validation failures cannot fall through to credit redemption", async () => {
    const result = await redeemPromoCode("JNV-ELITE-12M-ABCD-2345", {
      gift: async () => ({ ok: false, error: "This code has already been used" }),
      credit: async () => { throw new Error("Used gifts must remain rejected"); },
    });
    assert.equal(result.ok, false);
  });
  it("free-credit codes can be redeemed", () => {
    expect(promoRedeemable("free")).toBe(true);
  });
  it("discount and bonus codes cannot be redeemed", () => {
    expect(promoRedeemable("discount")).toBe(false);
    expect(promoRedeemable("percent")).toBe(false);
    expect(promoRedeemable(null)).toBe(false);
  });
  it("plan orders drop any promo code sent by the browser", () => {
    expect(promoCodeForOrder("SAVE50")).toBeNull();
  });
});
