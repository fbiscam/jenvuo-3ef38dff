import * as React from "react";

const RULES: [RegExp, string][] = [
  [/^#(property|include|define)\b/, "tok-keyword"],
  [/^(#[^\n]*|\/\/[^\n]*)/, "tok-comment"],
  [/^("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)/, "tok-string"],
  [/^\$[A-Z_]+/, "tok-env"],
  [/^-{1,2}[A-Za-z][\w-]*/, "tok-keyword"],
  [/^\b(from|import|const|let|var|await|async|new|return|print|curl|export|def|for|while|in|if|else|class|void|input|double|int|bool|string|datetime|static|extern|indicator|strategy|plot|ta|math|request|series|float|color)\b/, "tok-keyword"],
  [/^\b(true|false|null|None)\b/, "tok-const"],
  [/^\b\d+(\.\d+)?\b/, "tok-number"],
  [/^[A-Za-z_]\w*(?=\s*\()/, "tok-func"],
  [/^\b[A-Z]\w*/, "tok-type"],
  [/^[A-Za-z_]\w*(?=\s*=[^=])/, "tok-var"],
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
