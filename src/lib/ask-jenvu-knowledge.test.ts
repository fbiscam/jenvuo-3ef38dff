import { test } from "node:test";
import assert from "node:assert/strict";
import { getRelevantJenvuKnowledge } from "./ask-jenvu-knowledge.server";

test("a scam question brings in the Scam Protection help article", () => {
  const k = getRelevantJenvuKnowledge("How do I check a scam broker or payment method?");
  assert.ok(k.includes("Check a scam with Scam Protection"));
});

test("matched articles are added on top of the core facts", () => {
  const k = getRelevantJenvuKnowledge("How do I check a scam website link?");
  assert.ok(k.includes("# Jenvu core facts"));
  assert.ok(k.includes("Check a scam with Scam Protection"));
});

test("the assistant is told JX Bot is discontinued", () => {
  const k = getRelevantJenvuKnowledge("Can I download JX Bot?");
  assert.ok(k.includes("JX Bot (the MT5 Expert Advisor) has been discontinued"));
});
