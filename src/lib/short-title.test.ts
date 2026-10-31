import { describe, it } from "node:test";
import { expect } from "./chart/test-expect";
import { shortTitle } from "./short-title";

describe("shortTitle", () => {
  it("keeps titles of 6 words or fewer unchanged", () => {
    expect(shortTitle("Gold holds above key support today")).toBe("Gold holds above key support today");
  });
  it("cuts longer titles to 6 words", () => {
    expect(shortTitle("Gold holds above key support as dollar weakens")).toBe("Gold holds above key support as…");
  });
  it("drops trailing punctuation before the ellipsis", () => {
    expect(shortTitle("Gold slips as traders await Fed, then rebounds")).toBe("Gold slips as traders await Fed…");
  });
});
