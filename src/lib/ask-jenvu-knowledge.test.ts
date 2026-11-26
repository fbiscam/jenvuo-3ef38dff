import { test } from "node:test";
import assert from "node:assert/strict";
import { getRelevantJenvuKnowledge } from "./ask-jenvu-knowledge.server";

test("the assistant is told Scam Protection is removed", () => {
  const k = getRelevantJenvuKnowledge("Where is Scam Protection?");
  assert.ok(k.includes("Scam Protection has been removed"));
});

test("the assistant is told JX Bot is discontinued", () => {
  const k = getRelevantJenvuKnowledge("Can I download JX Bot?");
  assert.ok(k.includes("JX Bot (the MT5 Expert Advisor) has been discontinued"));
});
