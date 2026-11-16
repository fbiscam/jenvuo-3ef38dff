import { describe, it } from "node:test";
import { expect } from "./chart/test-expect";
import { planFeatures } from "./plan-features";

describe("billing plan features", () => {
  it("shows JX Bot with its IPs and daily target on every plan", () => {
    expect(planFeatures("pro")[1]).toBe("JX Bot on 2 IPs · 2% daily target");
    expect(planFeatures("elite")[1]).toBe("JX Bot on 3 IPs · 4% daily target");
    expect(planFeatures("ultra")[1]).toBe("JX Bot on 5 IPs · 6% daily target");
  });
  it("lists Terminal, API credit and keys", () => {
    const f = planFeatures("ultra");
    expect(f).toContain("Terminal paid strategies");
    expect(f).toContain("$99 API credit");
    expect(f).toContain("7 API keys");
  });
});
