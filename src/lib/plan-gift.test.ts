import { describe, it } from "node:test";
import { expect } from "./chart/test-expect";
import { GIFT_MONTHS, GIFT_PLANS, isGiftMonths, isGiftPlan, looksLikeGiftCode, makeGiftCode, normalizeGiftCode, validGiftEmail } from "./plan-gift";

const rnd = (n: number) => Uint8Array.from({ length: n }, (_, i) => i * 7);

describe("plan gift codes", () => {
  it("offers exactly 1, 2, 5 and 12 months", () => {
    expect([...GIFT_MONTHS]).toEqual([1, 2, 5, 12]);
    expect(isGiftMonths(3)).toBe(false);
    expect(isGiftMonths(12)).toBe(true);
  });
  it("offers only Pro, Elite and Ultra", () => {
    expect(GIFT_PLANS).toEqual(["pro", "elite", "ultra"]);
    expect(isGiftPlan("free")).toBe(false);
  });
  it("makes readable codes that carry plan and months", () => {
    const code = makeGiftCode("elite", 5, rnd);
    expect(code.startsWith("JNV-ELITE-5M-")).toBe(true);
    expect(looksLikeGiftCode(code)).toBe(true);
    expect(looksLikeGiftCode(code.toLowerCase())).toBe(true);
    expect(looksLikeGiftCode("SUMMER10")).toBe(false);
  });
  it("normalizes case and spaces", () => {
    expect(normalizeGiftCode(" jnv-pro-1m-abcd-efgh ")).toBe("JNV-PRO-1M-ABCD-EFGH");
  });
  it("checks recipient email", () => {
    expect(validGiftEmail("a@b.com")).toBe(true);
    expect(validGiftEmail("nope")).toBe(false);
  });
});
