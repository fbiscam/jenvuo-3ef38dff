import { describe, it } from "node:test";
import { expect } from "./chart/test-expect";
import { extractReplyFiles, looksLikeCodeRequest } from "./chat-files";

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
