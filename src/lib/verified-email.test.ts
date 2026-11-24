import { describe, expect, it } from "vitest";
import { exactLike, verifiedEmailFor } from "./verified-email";
const base = { id: "u1", email: "A@x.com", email_confirmed_at: "2026-01-01" };
describe("verifiedEmailFor", () => {
  it("accepts a confirmed email sign-in", () => expect(verifiedEmailFor({ ...base, app_metadata: { provider: "email" } }, "u1")).toBe("a@x.com"));
  it("rejects other sign-in providers", () => expect(verifiedEmailFor({ ...base, app_metadata: { provider: "lovable", providers: ["lovable"] } }, "u1")).toBeNull());
  it("rejects unconfirmed email", () => expect(verifiedEmailFor({ ...base, email_confirmed_at: null, app_metadata: { provider: "email" } }, "u1")).toBeNull());
  it("rejects another user", () => expect(verifiedEmailFor({ ...base, app_metadata: { provider: "google" } }, "u2")).toBeNull());
  it("escapes wildcards", () => expect(exactLike("a%_b@x.com")).toBe("a\\%\\_b@x.com"));
});
