// Turns code blocks in an AI reply into downloadable files (Chat page).

export type ReplyFile = { name: string; code: string; lang: string };

const EXT: Record<string, string> = {
  mql5: "mq5", mq5: "mq5", mql: "mq5", mql4: "mq4", mq4: "mq4",
  pine: "pine", pinescript: "pine",
  python: "py", py: "py",
  javascript: "js", js: "js", typescript: "ts", ts: "ts", tsx: "tsx", jsx: "jsx",
  json: "json", html: "html", css: "css", sql: "sql",
  bash: "sh", sh: "sh", shell: "sh",
  cpp: "cpp", "c++": "cpp", c: "c", csharp: "cs", cs: "cs", java: "java", go: "go", rust: "rs",
  yaml: "yaml", yml: "yaml", markdown: "md", md: "md", txt: "txt", text: "txt",
};

/** Guess a language from code when the block has no tag. */
export function guessLang(code: string): string {
  if (/^\s*\/\/@version=\d/m.test(code) || /\b(indicator|strategy)\s*\(/.test(code)) return "pine";
  if (/#property\s+|OnTick\s*\(|OnInit\s*\(|CTrade\b/.test(code)) return "mql5";
  if (/^\s*(def |import |from \w+ import )/m.test(code)) return "python";
  return "txt";
}

/** A file name written in the code itself, e.g. "// File: Gold_M15_EA.mq5". */
function namedInCode(code: string): string | null {
  const m = code.match(/(?:\/\/|#|--)\s*(?:file(?:name)?|save as)\s*:\s*([\w.\- ]+\.\w{1,5})/i);
  return m ? m[1].trim().replace(/\s+/g, "_") : null;
}

/** Title inside Pine indicator()/strategy() or MQL5 #property description. */
function titleInCode(code: string, lang: string): string | null {
  const m =
    lang === "pine"
      ? code.match(/\b(?:indicator|strategy)\s*\(\s*["']([^"']+)["']/)
      : lang === "mql5"
        ? code.match(/#property\s+description\s+"([^"]+)"/)
        : null;
  if (!m) return null;
  const slug = m[1].replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "_");
  return slug || null;
}

/** Every fenced code block in a reply, each with a sensible file name. */
export function extractReplyFiles(reply: string): ReplyFile[] {
  const out: ReplyFile[] = [];
  const used = new Set<string>();
  const re = /```([\w+#.-]*)[^\n]*\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(reply))) {
    const code = m[2].replace(/\s+$/, "") + "\n";
    if (!code.trim()) continue;
    const tag = m[1].toLowerCase();
    const lang = EXT[tag] ? tag : guessLang(code);
    const ext = EXT[lang] ?? "txt";
    let name = namedInCode(code) ?? `${titleInCode(code, EXT[lang] === "mq5" ? "mql5" : lang) ?? "jenvu_code"}.${ext}`;
    if (used.has(name)) {
      const dot = name.lastIndexOf(".");
      let i = 2;
      while (used.has(`${name.slice(0, dot)}_${i}${name.slice(dot)}`)) i++;
      name = `${name.slice(0, dot)}_${i}${name.slice(dot)}`;
    }
    used.add(name);
    out.push({ name, code, lang });
  }
  return out;
}

/** True when a prompt asks for code, so the page can show the coding animation. */
export function looksLikeCodeRequest(prompt: string): boolean {
  return /\b(code|script|bot|ea|expert advisor|indicator|strategy|pine|mql5?|mt5|mt4|function|program|python|javascript|build|banao|likho)\b/i.test(prompt);
}
