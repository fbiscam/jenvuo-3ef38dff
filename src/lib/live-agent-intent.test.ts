import { describe, it } from "node:test";
import { expect } from "./chart/test-expect";
import { wantsLiveAgent } from "./live-agent-intent";

describe("wantsLiveAgent", () => {
  it("hands over when the visitor asks for a person", () => {
    expect(wantsLiveAgent("I want to talk to a human")).toBe(true);
    expect(wantsLiveAgent("Can I speak with an agent?")).toBe(true);
    expect(wantsLiveAgent("live chat please")).toBe(true);
    expect(wantsLiveAgent("mujhe agent se baat krni ha")).toBe(true);
  });

  it("hands over for 'contact with agent' style requests", () => {
    expect(wantsLiveAgent("contact with agent")).toBe(true);
    expect(wantsLiveAgent("connect me to an agent")).toBe(true);
    expect(wantsLiveAgent("I need an agent")).toBe(true);
    expect(wantsLiveAgent("agent chahiye")).toBe(true);
    expect(wantsLiveAgent("How do I connect my API key?")).toBe(false);
  });

  it("keeps normal questions with the assistant", () => {
    expect(wantsLiveAgent("What does the Terminal show?")).toBe(false);
    expect(wantsLiveAgent("How much is the Pro plan?")).toBe(false);
    expect(wantsLiveAgent("")).toBe(false);
  });
});
