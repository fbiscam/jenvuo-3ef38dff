import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { exactLike, verifiedEmailFor } from "./verified-email";
const base = { id: "u1", email: "A@x.com", email_confirmed_at: "2026-01-01" };
describe("verifiedEmailFor", () => {
  it("accepts a confirmed email sign-in", () => assert.equal(verifiedEmailFor({ ...base, app_metadata: { provider: "email" } }, "u1"), "a@x.com"));
  it("rejects other sign-in providers", () => assert.equal(verifiedEmailFor({ ...base, app_metadata: { provider: "lovable", providers: ["lovable"] } }, "u1"), null));
  it("rejects unconfirmed email", () => assert.equal(verifiedEmailFor({ ...base, email_confirmed_at: null, app_metadata: { provider: "email" } }, "u1"), null));
  it("rejects another user", () => assert.equal(verifiedEmailFor({ ...base, app_metadata: { provider: "google" } }, "u2"), null));
  it("escapes wildcards", () => assert.equal(exactLike("a%_b@x.com"), "a\\%\\_b@x.com"));
});
