import { it } from "node:test";
import assert from "node:assert/strict";
import { authDestination } from "./oauth-return-path";

it("sign-in and sign-up default to Overview, not API keys", () => {
  assert.equal(authDestination(), "/dashboard");
  assert.equal(authDestination(""), "/dashboard");
});
it("preserves safe explicit destinations and OAuth consent", () => {
  assert.equal(authDestination("/dashboard/billing?x=1"), "/dashboard/billing");
  assert.equal(authDestination("/.lovable/oauth/consent?authorization_id=abc"), "/.lovable/oauth/consent?authorization_id=abc");
});
it("rejects external and malformed login destinations", () => {
  for (const value of ["https://example.com", "//example.com", "/\\example.com", "/\nexample.com"]) {
    assert.equal(authDestination(value), "/dashboard");
  }
});