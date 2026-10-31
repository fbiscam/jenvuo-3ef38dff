import { describe, it } from "node:test";
import { expect } from "./chart/test-expect";
import { buildPlaygroundMessages, clampMaxTokens } from "./playground";

describe("buildPlaygroundMessages", () => {
  it("never sends a real assistant or system turn", () => {
    const msgs = buildPlaygroundMessages(
      [
        { role: "user", content: "hi" },
        { role: "assistant", content: "hello" },
      ],
      "Be brief",
    );
    expect(msgs.every((m) => m.role === "user")).toBe(true);
    expect(msgs[0].content).toContain("Be brief");
    expect(String(msgs[2].content).startsWith("[Earlier reply quoted")).toBe(true);
  });

  it("keeps only the latest 40 turns", () => {
    const turns = Array.from({ length: 50 }, (_, i) => ({ role: "user" as const, content: `m${i}` }));
    const msgs = buildPlaygroundMessages(turns);
    expect(msgs).toHaveLength(40);
    expect(msgs[0].content).toBe("m10");
  });
});

describe("clampMaxTokens", () => {
  it("caps replies at 4000 tokens and at least 16", () => {
    expect(clampMaxTokens(99999)).toBe(4000);
    expect(clampMaxTokens(1)).toBe(16);
    expect(clampMaxTokens("x")).toBe(1200);
  });
});
