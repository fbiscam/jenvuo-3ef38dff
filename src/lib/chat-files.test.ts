import { describe, it } from "node:test";
import { expect } from "./chart/test-expect";
import { CHAT_MAX_FILES, codeRequestKind, extractReplyDocument, extractReplyFiles, looksLikeCodeRequest, looksLikeDocRequest, mergeWorkspace, parseRenameRequest } from "./chat-files";

describe("extractReplyFiles", () => {
  it("names an MQL5 block .mq5", () => {
    const files = extractReplyFiles("Here:\n```mql5\n#property strict\nvoid OnTick(){}\n```");
    expect(files).toHaveLength(1);
    expect(files[0].name).toBe("jenvu_code.mq5");
  });

  it("uses the Pine indicator title as the file name", () => {
    const files = extractReplyFiles('```\n//@version=6\nindicator("ICT FVG", overlay=true)\n```');
    expect(files[0].name).toBe("ICT_FVG.pine");
  });

  it("uses a file name written in the code", () => {
    const files = extractReplyFiles("```cpp\n// File: Gold_M15_EA.mq5\nint x;\n```");
    expect(files[0].name).toBe("Gold_M15_EA.mq5");
  });

  it("keeps two files with the same name apart", () => {
    const files = extractReplyFiles("```python\nprint(1)\n```\n```python\nprint(2)\n```");
    expect(files.map((f) => f.name)).toEqual(["jenvu_code.py", "jenvu_code_2.py"]);
  });

  it("returns nothing for a reply without code", () => {
    expect(extractReplyFiles("No code here.")).toEqual([]);
  });
});

describe("looksLikeCodeRequest", () => {
  it("detects bot requests", () => expect(looksLikeCodeRequest("Gold M15 MT5 bot banao")).toBe(true));
  it("ignores plain questions", () => expect(looksLikeCodeRequest("What is a liquidity sweep?")).toBe(false));
});

describe("codeRequestKind", () => {
  it("MT5 bot → mql5", () => expect(codeRequestKind("Build a Gold MT5 EA")).toBe("mql5"));
  it("Pine indicator → pine", () => expect(codeRequestKind("Pine Script v6 FVG indicator banao")).toBe("pine"));
  it("python script → python", () => expect(codeRequestKind("write a python script for RSI")).toBe("python"));
  it("explaining a strategy is not code", () => expect(codeRequestKind("Explain the ICT silver bullet strategy")).toBe(null));
  it("plain build question is not code", () => expect(codeRequestKind("How do I build discipline?")).toBe(null));
});


const f = (name: string, code = "x\n") => ({ name, code, lang: "txt" });

describe("mergeWorkspace", () => {
  it("holds at most 4 files and reports the rest", () => {
    const r = mergeWorkspace([f("a.py"), f("b.py"), f("c.py")], [f("d.py"), f("e.py")]);
    expect(CHAT_MAX_FILES).toBe(4);
    expect(r.files.map((x) => x.name)).toEqual(["a.py", "b.py", "c.py", "d.py"]);
    expect(r.dropped).toEqual(["e.py"]);
  });

  it("updates a file with the same name in place", () => {
    const r = mergeWorkspace([f("a.py", "old\n"), f("b.py")], [f("A.py", "new\n")]);
    expect(r.files.length).toBe(2);
    expect(r.files[0].code).toBe("new\n");
  });
});

describe("parseRenameRequest", () => {
  it("renames one named file to another name", () => {
    expect(parseRenameRequest("rename backtest.py to rsi.py", ["backtest.py"])).toEqual({ from: "backtest.py", to: "rsi.py" });
  });

  it("understands Urdu wording", () => {
    expect(parseRenameRequest("jenvu_code.py ka name rsi_check.py krdo", ["jenvu_code.py", "a.pine"])).toEqual({ from: "jenvu_code.py", to: "rsi_check.py" });
  });

  it("renames the active file when only the new name is given", () => {
    expect(parseRenameRequest("name this file Strategy.pine", ["a.pine", "b.py"], "a.pine")).toEqual({ from: "a.pine", to: "Strategy.pine" });
  });

  it("ignores normal code requests", () => {
    expect(parseRenameRequest("add an RSI filter to backtest.py", ["backtest.py"])).toBe(null);
  });
});

describe("documents", () => {
  it("detects PDF and report requests", () => {
    expect(looksLikeDocRequest("RSI ki PDF file banao")).toBe(true);
    expect(looksLikeDocRequest("write a report on gold sessions")).toBe(true);
    expect(looksLikeDocRequest("explain RSI")).toBe(false);
  });

  it("reads the document block and its title, and keeps it out of code files", () => {
    const reply = "Here:\n```document\nGUIDE\n# RSI Guide\n## 1. Overview\nText\n```";
    expect(extractReplyDocument(reply)?.title).toBe("RSI Guide");
    expect(extractReplyFiles(reply)).toHaveLength(0);
  });
});
