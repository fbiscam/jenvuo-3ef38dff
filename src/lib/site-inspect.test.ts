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

import { isInspectableUrl } from "./site-inspect";
test("inspector opens only public websites", () => {
  assert.equal(isInspectableUrl("https://example.org/"), true);
  assert.equal(isInspectableUrl("http://shop.example.co.uk/a"), true);
  assert.equal(isInspectableUrl("http://127.0.0.1/"), false);
  assert.equal(isInspectableUrl("http://[::1]/"), false);
  assert.equal(isInspectableUrl("http://169.254.169.254/latest"), false);
  assert.equal(isInspectableUrl("http://localhost/"), false);
  assert.equal(isInspectableUrl("http://db.internal/"), false);
  assert.equal(isInspectableUrl("https://dash.jenvu.com/"), false);
  assert.equal(isInspectableUrl("https://abc.supabase.co/rest/v1"), false);
  assert.equal(isInspectableUrl("http://10.0.0.1.nip.io/"), false);
  assert.equal(isInspectableUrl("https://example.org:8443/"), false);
  assert.equal(isInspectableUrl("ftp://example.org/"), false);
  assert.equal(isInspectableUrl("https://user:pw@example.org/"), false);
});
