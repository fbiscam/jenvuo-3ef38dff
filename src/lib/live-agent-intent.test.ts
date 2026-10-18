import { describe, expect, it } from "vitest";
import { wantsLiveAgent } from "./live-agent-intent";

describe("wantsLiveAgent", () => {
  it("hands over when the visitor asks for a person", () => {
    expect(wantsLiveAgent("I want to talk to a human")).toBe(true);
    expect(wantsLiveAgent("Can I speak with an agent?")).toBe(true);
    expect(wantsLiveAgent("live chat please")).toBe(true);
    expect(wantsLiveAgent("mujhe agent se baat krni ha")).toBe(true);
  });

  it("keeps normal questions with the assistant", () => {
    expect(wantsLiveAgent("What does the Terminal show?")).toBe(false);
    expect(wantsLiveAgent("How much is the Pro plan?")).toBe(false);
    expect(wantsLiveAgent("")).toBe(false);
  });
});
