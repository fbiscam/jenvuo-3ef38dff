import { describe, it } from "node:test";
import { expect } from "./chart/test-expect";
import { BANNER_PRIORITY, pickBanner } from "./banner-slot";

describe("pickBanner", () => {
  it("shows only the security/unread notice when 2FA also wants to show", () => {
    expect(
      pickBanner([
        ["twoFactor", BANNER_PRIORITY.twoFactor],
        ["notice", BANNER_PRIORITY.notice],
      ]),
    ).toBe("notice");
  });
  it("shows 2FA once nothing else wants the slot", () => {
    expect(pickBanner([["twoFactor", BANNER_PRIORITY.twoFactor]])).toBe("twoFactor");
  });
  it("shows nothing when no banner wants to show", () => {
    expect(pickBanner([])).toBeNull();
  });
  it("Verify ID takes the top spot ahead of 2FA and other notices", () => {
    expect(pickBanner([["twoFactor", BANNER_PRIORITY.twoFactor], ["notice", BANNER_PRIORITY.notice], ["verifyId", BANNER_PRIORITY.verify]])).toBe("verifyId");
  });
});
