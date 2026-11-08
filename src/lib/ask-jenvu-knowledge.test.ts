import { test } from "node:test";
import assert from "node:assert/strict";
import { getRelevantJenvuKnowledge } from "./ask-jenvu-knowledge.server";

test("a prop firm question brings in the prop firm help article", () => {
  const k = getRelevantJenvuKnowledge("Can I use JX Bot on The5ers prop firm and change my VPS IP?");
  assert.ok(k.includes("JX Bot on prop firms (The5ers, FTMO), VPS and mobile"));
});

test("matched articles are added on top of the core facts", () => {
  const k = getRelevantJenvuKnowledge("How do I install the JX Bot on MT5?");
  assert.ok(k.includes("# Jenvu core facts"));
  assert.ok(k.includes("Install the JX Bot on MT5"));
});
