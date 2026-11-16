import { describe, it } from "node:test";
import { expect } from "./chart/test-expect";
import { TRIAL_API_RPM, trialRateBlock } from "./free-trial";

describe("Free plan / trial API rate limit", () => {
  it("allows trial API calls under 30 per minute", () => {
    expect(trialRateBlock({ isFreeTrial: true, requestsLastMinute: 29 })).toBe(null);
  });
  it("blocks the 31st trial API call in a minute", () => {
    expect(TRIAL_API_RPM).toBe(30);
    expect(trialRateBlock({ isFreeTrial: true, requestsLastMinute: 30 }) !== null).toBe(true);
  });
  it("never limits accounts that are not on the free trial", () => {
    expect(trialRateBlock({ isFreeTrial: false, requestsLastMinute: 500 })).toBe(null);
  });
});
