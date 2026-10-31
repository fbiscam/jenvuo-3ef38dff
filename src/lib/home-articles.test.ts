import { describe, expect, it } from "vitest";
import { shortTitle } from "./home-articles";

describe("shortTitle", () => {
  it("keeps titles of 6 words or fewer unchanged", () => {
    expect(shortTitle("Gold holds above key support today")).toBe("Gold holds above key support today");
  });
  it("cuts longer titles to 6 words", () => {
    expect(shortTitle("Gold holds above key support as dollar weakens")).toBe("Gold holds above key support as…");
  });
  it("drops trailing punctuation before the ellipsis", () => {
    expect(shortTitle("Fed decision: what it means, for gold traders now")).toBe("Fed decision: what it means…");
  });
});
