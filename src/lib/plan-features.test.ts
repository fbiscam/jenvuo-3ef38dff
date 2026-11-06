import { describe, expect, it } from "bun:test";
import { planFeatures } from "./plan-features";

describe("billing plan features", () => {
  it("shows JX Bot per plan to Founding members", () => {
    expect(planFeatures("elite", true)[0]).toBe("JX Bot on 2 IPs");
    expect(planFeatures("pro", true)[0]).toBe("JX Bot on 1 IP");
  });
  it("hides JX Bot from everyone else and shows Terminal and API credit", () => {
    const f = planFeatures("ultra", false);
    expect(f.some((x) => x.includes("JX Bot"))).toBe(false);
    expect(f).toContain("Terminal paid strategies");
    expect(f).toContain("$50 API credit");
  });
});
