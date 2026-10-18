import { test } from "node:test";
import assert from "node:assert/strict";
import { canonicalEmail } from "./custom-auth.server";
test("gmail dots and +tags map to one inbox", () => {
  assert.equal(canonicalEmail("A.B.C+promo@Gmail.com"), "abc@gmail.com");
  assert.equal(canonicalEmail("abc@googlemail.com"), "abc@gmail.com");
});
test("other providers keep dots but drop +tags", () => {
  assert.equal(canonicalEmail("a.b+x@outlook.com"), "a.b@outlook.com");
});
