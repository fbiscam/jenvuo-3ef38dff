import { describe, it } from "node:test";
import { expect } from "./chart/test-expect";
import { planFeatures } from "./plan-features";

describe("billing plan features", () => {
  it("never lists JX Bot (discontinued)", () => {
    for (const p of ["pro", "elite", "ultra"] as const) {
      expect(planFeatures(p).some((f) => f.includes("JX Bot"))).toBe(false);
    }
  });
  it("lists Terminal, News/Scam Protection, API credit and keys", () => {
    const f = planFeatures("ultra");
    expect(f).toContain("Terminal paid strategies");
    expect(f).toContain("News and Scam Protection");
    expect(f).toContain("$90 API credit");
    expect(f).toContain("7 API keys");
  });
});
