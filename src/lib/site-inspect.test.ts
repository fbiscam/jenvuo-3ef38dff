import { test } from "node:test";
import assert from "node:assert/strict";
import { siteInspectTarget, domainAge } from "./site-inspect";

test("detects a website question", () => {
  assert.equal(siteInspectTarget("check SEO of https://www.example.com/page"), "example.com");
});
test("ignores plain domains without website intent", () => {
  assert.equal(siteInspectTarget("I like example.com"), null);
});
test("ignores file names", () => {
  assert.equal(siteInspectTarget("check bot.mq5"), null);
});
test("domain age in years and months", () => {
  assert.equal(domainAge(new Date("2010-03-15"), new Date("2022-06-20")), "12 years, 3 months");
});
