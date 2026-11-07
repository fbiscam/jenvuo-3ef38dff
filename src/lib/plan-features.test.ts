import { describe, it } from "node:test";
import { expect } from "./chart/test-expect";
import { planFeatures } from "./plan-features";

describe("billing plan features", () => {
  it("shows JX Bot per plan to Founding members", () => {
    expect(planFeatures("elite", true)[1]).toBe("JX Bot on 2 IPs +$40");
    expect(planFeatures("pro", true)[1]).toBe("JX Bot on 1 IP +$20");
  });
  it("hides JX Bot from everyone else and shows Terminal and API credit", () => {
    const f = planFeatures("ultra", false);
    expect(f.some((x) => x.includes("JX Bot"))).toBe(false);
    expect(f).toContain("Terminal paid strategies");
    expect(f).toContain("$99 API credit");
  });
});
