import { describe, it } from "node:test";
import { expect } from "./chart/test-expect";
import { FOUNDING_SEATS_PER_MONTH, formatSeatOpening, nextSeatOpening, seatsFullMessage } from "./founding-seats";

describe("Founding seats", () => {
  it("allows 100 seats a month", () => {
    expect(FOUNDING_SEATS_PER_MONTH).toBe(100);
  });
  it("reopens on the 1st of next month at 00:00 UTC", () => {
    expect(nextSeatOpening(new Date("2026-11-07T04:23:00Z")).toISOString()).toBe("2026-12-01T00:00:00.000Z");
    expect(nextSeatOpening(new Date("2026-12-31T23:59:00Z")).toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });
  it("names the reopening date in UTC", () => {
    expect(formatSeatOpening(new Date("2026-12-01T00:00:00Z"))).toBe("Dec 1, 2026, 00:00 UTC");
    expect(seatsFullMessage(new Date("2026-11-07T04:23:00Z"))).toContain("Dec 1, 2026, 00:00 UTC");
  });
});

import { FOUNDING_APPLICATIONS_OPEN } from "./founding-seats";

describe("Founding applications switch", () => {
  it("stays closed until the owner asks to reopen", () => {
    expect(FOUNDING_APPLICATIONS_OPEN).toBe(false);
  });
});
