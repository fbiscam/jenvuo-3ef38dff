import { describe, it } from "node:test";
import { expect } from "./chart/test-expect";
import { isFreshSocialSignup, SOCIAL_SIGNUP_WINDOW_MS } from "./social-signup";

const now = Date.parse("2026-11-16T10:00:00Z");
const minsAgo = (m: number) => new Date(now - m * 60_000).toISOString();

describe("isFreshSocialSignup", () => {
  it("a Google account created 2 minutes ago is a new sign-up", () => {
    expect(isFreshSocialSignup({ provider: "google", createdAt: minsAgo(2), now, alreadyProcessed: false })).toBe(true);
  });
  it("an Apple account older than 30 minutes is not treated as new", () => {
    expect(isFreshSocialSignup({ provider: "apple", createdAt: minsAgo(31), now, alreadyProcessed: false })).toBe(false);
  });
  it("email accounts never go through the social path", () => {
    expect(isFreshSocialSignup({ provider: "email", createdAt: minsAgo(1), now, alreadyProcessed: false })).toBe(false);
  });
  it("an account already checked once is not checked (or given a trial) again", () => {
    expect(isFreshSocialSignup({ provider: "google", createdAt: minsAgo(1), now, alreadyProcessed: true })).toBe(false);
  });
  it("window is 30 minutes", () => {
    expect(SOCIAL_SIGNUP_WINDOW_MS).toBe(30 * 60_000);
  });
});
