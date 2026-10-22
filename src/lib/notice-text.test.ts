import { describe, expect, test } from "bun:test";
import { shortTitle } from "./notice-text";

describe("notice titles", () => {
  test("keeps titles of 3 words or fewer", () => {
    expect(shortTitle("Free trial credit")).toBe("Free trial credit");
  });
  test("cuts longer titles to 3 words", () => {
    expect(shortTitle("New BUY signal on XAU/USD")).toBe("New BUY signal");
  });
  test("trims a dash at the cut", () => {
    expect(shortTitle("Plan renewed — Pro active now")).toBe("Plan renewed");
  });
});
