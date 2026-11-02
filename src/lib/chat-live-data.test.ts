import { test } from "node:test";
import assert from "node:assert/strict";
import { extractEmails, leadsAsk, leadsCount, webAsk, websiteAsk } from "./chat-live-data";

test("leads with a place search Google Maps", () => {
  const a = leadsAsk("Give me 30 Google Maps leads for dentists in Lahore");
  assert.equal(a?.count, 30);
  assert.match(a!.query, /dentists/i);
  assert.match(a!.query, /Lahore/);
});

test("leads without a place are not searched (AI asks first)", () => {
  assert.equal(leadsAsk("I need leads for dentists"), null);
});

test("follow-up city answer uses the earlier leads request", () => {
  const a = leadsAsk("Karachi", "dentist leads please");
  assert.match(a!.query, /dentist/i);
  assert.match(a!.query, /Karachi/);
});

test("lead count defaults to 20 and is capped at 60", () => {
  assert.equal(leadsCount("plumbers in Dubai"), 20);
  assert.equal(leadsCount("500 plumbers in Dubai"), 60);
});

test("emails are requested only when asked", () => {
  assert.equal(leadsAsk("leads for gyms in London with emails")?.emails, true);
  assert.equal(leadsAsk("leads for gyms in London")?.emails, false);
});

test("website and web questions are detected", () => {
  assert.equal(websiteAsk("SEO report for jenvu.com"), "jenvu.com");
  assert.ok(webAsk("search the web for gold price news"));
  assert.equal(webAsk("write an MQL5 EA"), null);
});

test("emails are extracted without image file names", () => {
  assert.deepEqual(extractEmails("Mail info@shop.pk or logo@2x.png, sales@shop.pk."), ["info@shop.pk", "sales@shop.pk"]);
});
