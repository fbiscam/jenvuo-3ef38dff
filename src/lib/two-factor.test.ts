import { describe, it } from "node:test";
import { expect } from "./chart/test-expect";
import { needsEmailSecondStep, readTokenClaims, securityHoldUntil, sessionMethods, SECURITY_HOLD_MS } from "./two-factor";

const now = Date.parse("2026-11-16T12:00:00Z");

describe("security hold after a suspicious sign-in", () => {
  it("lasts 24 hours from a new-device sign-in", () => {
    expect(SECURITY_HOLD_MS).toBe(24 * 60 * 60 * 1000);
    const until = securityHoldUntil([{ is_new: true, created_at: "2026-11-16T02:00:00Z" }], now);
    expect(until).toBe(Date.parse("2026-11-17T02:00:00Z"));
  });
  it("is over once 24 hours have passed", () => {
    expect(securityHoldUntil([{ is_new: true, created_at: "2026-11-15T11:59:00Z" }], now)).toBe(null);
  });
  it("ignores normal (known device) sign-ins", () => {
    expect(securityHoldUntil([{ is_new: false, created_at: "2026-11-16T11:00:00Z" }], now)).toBe(null);
  });
});

describe("email second step", () => {
  it("asks the code on a password sign-in when email codes are on", () => {
    expect(needsEmailSecondStep({ emailCodeOn: true, methods: ["password"], sessionVerified: false })).toBe(true);
  });
  it("is done once the session passed the code", () => {
    expect(needsEmailSecondStep({ emailCodeOn: true, methods: ["password"], sessionVerified: true })).toBe(false);
  });
  it("does not ask after a one-time email code or Google sign-in", () => {
    expect(needsEmailSecondStep({ emailCodeOn: true, methods: ["otp"], sessionVerified: false })).toBe(false);
    expect(needsEmailSecondStep({ emailCodeOn: true, methods: ["oauth"], sessionVerified: false })).toBe(false);
  });
  it("never asks when email codes are off", () => {
    expect(needsEmailSecondStep({ emailCodeOn: false, methods: ["password"], sessionVerified: false })).toBe(false);
  });
  it("reads sign-in methods from a token", () => {
    const payload = Buffer.from(JSON.stringify({ amr: [{ method: "password", timestamp: 1 }], session_id: "s1" })).toString("base64url");
    const claims = readTokenClaims(`h.${payload}.sig`);
    expect(sessionMethods(claims)).toEqual(["password"]);
    expect(claims?.session_id).toBe("s1");
  });
});
