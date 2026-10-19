import { describe, expect, it } from "vitest";
import { FOUNDING_CREDIT_USD, FOUNDING_MONTHS, foundingTrialEnd } from "./founding-offer";

describe("Founding offer", () => {
  it("lasts 3 months", () => {
    expect(FOUNDING_MONTHS).toBe(3);
    expect(foundingTrialEnd(new Date("2026-10-19T12:00:00Z")).toISOString()).toBe("2027-01-19T12:00:00.000Z");
  });

  it("comes with $250 credit", () => {
    expect(FOUNDING_CREDIT_USD).toBe(250);
  });
});
