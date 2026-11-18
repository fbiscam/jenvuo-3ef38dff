import { describe, it } from "node:test";
import { expect } from "./chart/test-expect";
import { planFeatures } from "./plan-features";

describe("billing plan features", () => {
  it("shows JX Bot with its IPs and daily target when the plan includes it", () => {
    expect(planFeatures("pro")[1]).toBe("JX Bot on 2 IPs · 2% daily target");
    expect(planFeatures("elite")[1]).toBe("JX Bot on 3 IPs · 4% daily target");
    expect(planFeatures("ultra")[1]).toBe("JX Bot on 4 IPs · 6% daily target");
  });
  it("leaves JX Bot out when the plan is bought without a bot seat", () => {
    expect(planFeatures("pro", false)[1]).toBe("No JX Bot: this month's bot seats are full");
  });
  it("lists Terminal, API credit and keys", () => {
    const f = planFeatures("ultra");
    expect(f).toContain("Terminal paid strategies");
    expect(f).toContain("$59 API credit");
    expect(f).toContain("7 API keys");
  });
});
