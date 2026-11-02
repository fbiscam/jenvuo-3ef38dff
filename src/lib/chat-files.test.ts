import { describe, it } from "node:test";
import { expect } from "./chart/test-expect";
import { CHAT_MAX_FILES, codeRequestKind, extractReplyDocument, extractReplyFiles, looksLikeCodeRequest, looksLikeDocRequest, looksLikeImageRequest, mergeWorkspace, parseRenameRequest, frameLimitBlock, findMentionedFile } from "./chat-files";

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
  it("keeps every new file (no small file limit)", () => {
    const r = mergeWorkspace([f("a.py")], [f("b.py"), f("c.py"), f("d.py"), f("e.py")]);
    expect(CHAT_MAX_FILES).toBe(999);
    expect(r.files.length).toBe(5);
    expect(r.dropped).toEqual([]);
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

import { wantsNewFile } from "./chat-files";
describe("new file requests", () => {
  it("never overwrites an open file", () => {
    expect(wantsNewFile("ab new file banao RSI ki")).toBe(true);
    expect(wantsNewFile("is file ma stop loss add kro")).toBe(false);
    const cur = [{ name: "rsi.py", code: "a\n", lang: "python" }];
    const r = mergeWorkspace(cur, [{ name: "rsi.py", code: "b\n", lang: "python" }], 4, true);
    expect(r.files.map((f) => f.name)).toEqual(["rsi.py", "rsi_2.py"]);
    expect(r.files[0]?.code).toBe("a\n");
  });
});

describe("looksLikeImageRequest", () => {
  it("image banao is an image request", () => expect(looksLikeImageRequest("ek gold bull ki image banao")).toBe(true));
  it("draw a logo is an image request", () => expect(looksLikeImageRequest("Draw a logo for my trading app")).toBe(true));
  it("describing an attached image is not", () => expect(looksLikeImageRequest("Describe what you see in the attached image")).toBe(false));
  it("writing code is not", () => expect(looksLikeImageRequest("write an MT5 bot")).toBe(false));
});

import { shortFileName } from "./chat-files";
describe("shortFileName", () => {
  it("keeps 2-word names", () => expect(shortFileName("RSI_AllInOne.pine")).toBe("RSI_AllInOne.pine"));
  it("cuts longer names to 2 words", () => expect(shortFileName("gold_sweep_strategy_v2.mq5")).toBe("gold_sweep.mq5"));
});
describe("SEO and leads open as documents", () => {
  it("seo report", () => expect(looksLikeDocRequest("example.com ka SEO report banao")).toBe(true));
  it("leads", () => expect(looksLikeDocRequest("dentists ki leads nikalo aur list banao")).toBe(true));
});

describe("frame holds max 4 files", () => {
  const full = { codeFiles: 2, image: true, doc: true, upload: false, site: false };
  it("allows a new image when 4 files are open", () => {
    expect(frameLimitBlock("image", { codeFiles: 2, image: false, doc: true, upload: true, site: false })).toBe(null);
  });
  it("allows a fifth and sixth code file", () => {
    expect(frameLimitBlock("code-new", { codeFiles: 5, image: false, doc: false, upload: false, site: false })).toBe(null);
  });
  it("lets an open file be edited when full", () => {
    expect(frameLimitBlock("code-edit", full)).toBe(null);
  });
  it("lets the open image be replaced when full", () => {
    expect(frameLimitBlock("image", full)).toBe(null);
  });
  it("allows a new code file with room", () => {
    expect(frameLimitBlock("code-new", { codeFiles: 1, image: true, doc: false, upload: false, site: false })).toBe(null);
  });
});

describe("findMentionedFile", () => {
  const names = ["gold_sweep_strategy.mq5", "backtest.py"];
  it("finds a file by full name", () => {
    expect(findMentionedFile("backtest.py ma changes kro", names)).toBe(1);
  });
  it("finds a file by its short tab name", () => {
    expect(findMentionedFile("gold_sweep.mq5 ma stop loss add kro", names)).toBe(0);
  });
  it("finds a file by a name word", () => {
    expect(findMentionedFile("change the backtest file", names)).toBe(1);
  });
  it("returns -1 when no file is named", () => {
    expect(findMentionedFile("add RSI filter", names)).toBe(-1);
  });
});

import { parseDuplicateRequest, copyName } from "./chat-files";

describe("parseDuplicateRequest", () => {
  it("copies the open file into a new _copy file without calling the AI", () => {
    expect(parseDuplicateRequest("is file ko copy krka duplicate krdo aur new file banao", ["gold.mq5"], "gold.mq5")).toEqual({ from: "gold.mq5", to: "gold_copy.mq5", withChanges: false });
  });
  it("uses the name the user gives", () => {
    expect(parseDuplicateRequest("duplicate gold.mq5 as gold_v2.mq5", ["gold.mq5", "rsi.py"])).toEqual({ from: "gold.mq5", to: "gold_v2.mq5", withChanges: false });
  });
  it("changes asked later do not trigger an edit now", () => {
    expect(parseDuplicateRequest("file duplicate krdo changes bad ma bataunga", ["a.pine"], "a.pine")?.withChanges).toBe(false);
  });
  it("changes asked now are sent for the copy", () => {
    expect(parseDuplicateRequest("duplicate this file and add a stop loss", ["a.pine"], "a.pine")?.withChanges).toBe(true);
  });
  it("plain edits are not duplicates", () => {
    expect(parseDuplicateRequest("add a stop loss to a.pine", ["a.pine"], "a.pine")).toBe(null);
  });
  it("never reuses a taken copy name", () => {
    expect(copyName("a.pine", ["a.pine", "a_copy.pine"])).toBe("a_copy_2.pine");
  });
});
