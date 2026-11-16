import { test } from "node:test";
import assert from "node:assert/strict";
import { emailOwnershipConflict } from "./signup-guard";
test("different email addresses may belong to the same person", () => {
  // No canonical-inbox or person restriction: only an existing exact-address owner blocks linking.
  assert.equal(emailOwnershipConflict(null, "second-account"), false);
  assert.equal(emailOwnershipConflict("first-account", "second-account"), true);
});
