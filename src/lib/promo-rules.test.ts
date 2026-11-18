import { describe, it } from "node:test";
import { expect } from "./chart/test-expect";
import { promoCodeForOrder, promoRedeemable } from "./promo-rules";

describe("promo codes are for API credit only", () => {
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
