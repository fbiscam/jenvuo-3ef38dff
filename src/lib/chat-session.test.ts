import { describe, it } from "node:test";
import { expect } from "./chart/test-expect";
import { CHAT_SESSION_MAX_TURNS, chatSessionKey, parseSavedSession, toSavedSession } from "./chat-session";

const base = { workspace: [], activeFile: 0, doc: null, docOpen: false };

describe("saved chat", () => {
  it("comes back after a reload exactly as saved", () => {
    const saved = toSavedSession({
      ...base,
      turns: [
        { id: "1", role: "user", content: "hi" },
        { id: "2", role: "assistant", content: "hello", model: "m" },
      ],
      workspace: [{ name: "a.py", code: "x=1", lang: "python" }],
    });
    const back = parseSavedSession(JSON.stringify(saved));
    expect(back?.turns.map((t) => t.content)).toEqual(["hi", "hello"]);
    expect(back?.workspace[0]?.name).toBe("a.py");
  });

  it("is kept per account, so another account never sees it", () => {
    expect(chatSessionKey("a") === chatSessionKey("b")).toBe(false);
  });

  it("drops image data but keeps the file name", () => {
    const saved = toSavedSession({
      ...base,
      turns: [{ id: "1", role: "user", content: "see", files: [{ name: "c.png", kind: "image", url: "data:image/png;base64,AAAA" }] }],
    });
    expect(JSON.stringify(saved).includes("base64")).toBe(false);
    expect(saved.turns[0]?.files?.[0]?.name).toBe("c.png");
  });

  it("keeps only the newest turns", () => {
    const turns = Array.from({ length: CHAT_SESSION_MAX_TURNS + 10 }, (_, i) => ({ id: String(i), role: "user" as const, content: String(i) }));
    const saved = toSavedSession({ ...base, turns });
    expect(saved.turns).toHaveLength(CHAT_SESSION_MAX_TURNS);
    expect(saved.turns[0]?.content).toBe("10");
  });

  it("treats an empty or broken saved chat as none (New chat state)", () => {
    expect(parseSavedSession(null)).toBe(null);
    expect(parseSavedSession("{bad")).toBe(null);
    expect(parseSavedSession(JSON.stringify(toSavedSession({ ...base, turns: [] })))).toBe(null);
  });
});
