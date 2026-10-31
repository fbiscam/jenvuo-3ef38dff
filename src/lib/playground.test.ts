import { describe, it } from "node:test";
import { expect } from "./chart/test-expect";
import { buildPlaygroundMessages, clampMaxTokens, sanitizePlaygroundImages, PLAYGROUND_MAX_IMAGE_CHARS, PLAYGROUND_DEFAULT_MODEL } from "./playground";

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

describe("playground images", () => {
  const png = "data:image/png;base64,iVBORw0KGgo=";
  it("keeps at most 4 real image data URLs", () => {
    const out = sanitizePlaygroundImages([png, png, png, png, png, "https://x.com/a.png", "data:text/html;base64,PGI+", 5]);
    expect(out).toHaveLength(4);
  });
  it("drops images over the size cap", () => {
    expect(sanitizePlaygroundImages(["data:image/png;base64," + "A".repeat(PLAYGROUND_MAX_IMAGE_CHARS)])).toHaveLength(0);
  });
  it("attaches images to the latest user message only", () => {
    const msgs = buildPlaygroundMessages([{ role: "user", content: "a" }, { role: "assistant", content: "b" }, { role: "user", content: "what is this?" }], "", [png]);
    expect(typeof msgs[0].content).toBe("string");
    const last = msgs[2].content as { type: string }[];
    expect(last.map((p) => p.type)).toEqual(["text", "image_url"]);
  });
  it("opens on the cheap GPT-5.6 Luna model", () => {
    expect(PLAYGROUND_DEFAULT_MODEL).toBe("gpt-5.6-luna");
  });
});
