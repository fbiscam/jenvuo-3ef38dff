import { describe, it as test } from "node:test";
import assert from "node:assert/strict";
import { dayGridBoundaries } from "./day-grid";

const utc = (value: string) => Date.parse(value) / 1000;
describe("Terminal daily display grid", () => {
  test("Sunday has a short 17:00 UTC block before Monday's full day", () => {
    assert.deepEqual(dayGridBoundaries(utc("2026-11-22T00:00:00Z"), utc("2026-11-24T00:00:00Z"), true), [
      utc("2026-11-22T17:00:00Z"), utc("2026-11-23T00:00:00Z"), utc("2026-11-24T00:00:00Z"),
    ]);
  });
  test("24/7 markets keep every UTC day boundary", () => {
    assert.deepEqual(dayGridBoundaries(utc("2026-11-21T00:00:00Z"), utc("2026-11-23T00:00:00Z"), false), [
      utc("2026-11-21T00:00:00Z"), utc("2026-11-22T00:00:00Z"), utc("2026-11-23T00:00:00Z"),
    ]);
  });
});