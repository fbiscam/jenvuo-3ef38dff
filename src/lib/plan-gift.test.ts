import { describe, it } from "node:test";
import { expect } from "./chart/test-expect";
import { GIFT_MONTHS, GIFT_PLANS, isGiftMonths, isGiftPlan, looksLikeGiftCode, makeGiftCode, normalizeGiftCode, validGiftEmail } from "./plan-gift";

const rnd = (n: number) => Uint8Array.from({ length: n }, (_, i) => i * 7);

describe("plan gift codes", () => {
  it("offers any month from 1 to 12", () => {
    expect([...GIFT_MONTHS]).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(isGiftMonths(3)).toBe(true);
    expect(isGiftMonths(12)).toBe(true);
    expect(isGiftMonths(0)).toBe(false);
    expect(isGiftMonths(13)).toBe(false);
    expect(looksLikeGiftCode(makeGiftCode("pro", 7, rnd))).toBe(true);
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
