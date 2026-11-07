import { describe, it } from "node:test";
import { expect } from "./chart/test-expect";
import { shouldPoll } from "./poll";
import { licenseCheckDue, LICENSE_TOUCH_EVERY_MS } from "./mt5-licenses";

describe("timed refresh", () => {
  it("skips hidden tabs", () => expect(shouldPoll("hidden")).toBe(false));
  it("runs on visible tabs", () => expect(shouldPoll("visible")).toBe(true));
});

describe("license last-check write", () => {
  const now = Date.parse("2026-11-07T12:00:00Z");
  it("writes when never checked", () => expect(licenseCheckDue(null, now)).toBe(true));
  it("skips a check 1 minute old", () => expect(licenseCheckDue("2026-11-07T11:59:00Z", now)).toBe(false));
  it("writes once 5 minutes have passed", () => expect(licenseCheckDue("2026-11-07T11:55:00Z", now)).toBe(true));
  it("uses a 5 minute window", () => expect(LICENSE_TOUCH_EVERY_MS).toBe(300_000));
});
