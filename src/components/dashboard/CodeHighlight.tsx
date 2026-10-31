import * as React from "react";

const RULES: [RegExp, string][] = [
  [/^(#[^\n]*|\/\/[^\n]*)/, "text-[#6a9955]"],
  [/^("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)/, "text-[#ce9178]"],
  [/^\$[A-Z_]+/, "text-[#4fc1ff]"],
  [/^-{1,2}[A-Za-z][\w-]*/, "text-[#c586c0]"],
  [/^\b(from|import|const|let|await|async|new|return|print|curl|export|def|for|in|if|else)\b/, "text-[#c586c0]"],
  [/^\b(true|false|null|None)\b/, "text-[#569cd6]"],
  [/^\b\d+(\.\d+)?\b/, "text-[#b5cea8]"],
  [/^[A-Za-z_]\w*(?=\s*\()/, "text-[#dcdcaa]"],
  [/^\b[A-Z]\w*/, "text-[#4ec9b0]"],
  [/^[A-Za-z_]\w*(?=\s*=[^=])/, "text-[#9cdcfe]"],
];

/** Editor-style syntax colours for the short REST / Python / Node examples. */
export function highlight(code: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let rest = code;
  let plain = "";
  let k = 0;
  while (rest.length) {
    let hit = false;
    for (const [re, cls] of RULES) {
      const m = re.exec(rest);
      if (m && m[0]) {
        if (plain) { out.push(plain); plain = ""; }
        out.push(<span key={k++} className={cls}>{m[0]}</span>);
        rest = rest.slice(m[0].length);
        hit = true;
        break;
      }
    }
    if (!hit) {
      // consume a whole word so keywords are not matched mid-identifier
      const w = /^[A-Za-z_]\w*|^[\s\S]/.exec(rest)![0];
      plain += w;
      rest = rest.slice(w.length);
    }
  }
  if (plain) out.push(plain);
  return out;
}
