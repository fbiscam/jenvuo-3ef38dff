import { it } from "node:test";
import assert from "node:assert/strict";
import { isUpcomingHighImpact } from "./upcoming-news";

const now = Date.parse("2026-11-26T12:22:00Z");
it("shows only High impact, never Medium or Low", () => {
  const date = "2026-11-26T13:00:00Z";
  assert.equal(isUpcomingHighImpact({ date, impact: "High" }, now), true);
  assert.equal(isUpcomingHighImpact({ date, impact: "Medium" }, now), false);
  assert.equal(isUpcomingHighImpact({ date, impact: "Low" }, now), false);
});
it("hides released events, including at the exact release time", () => {
  assert.equal(isUpcomingHighImpact({ date: "2026-11-26T12:21:00Z", impact: "High" }, now), false);
  assert.equal(isUpcomingHighImpact({ date: "2026-11-26T12:22:00Z", impact: "High" }, now), false);
  assert.equal(isUpcomingHighImpact({ date: "2026-11-26T13:00:00Z", impact: "High", actual: 0 }, now), false);
  assert.equal(isUpcomingHighImpact({ date: "invalid", impact: "High" }, now), false);
});