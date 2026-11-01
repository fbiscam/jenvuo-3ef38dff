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
    if (tag === "document") continue;
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

export type CodeKind = "mql5" | "pine" | "python" | "web" | "generic";

/**
 * Which kind of code a prompt asks for, or null when it doesn't ask for code.
 * Words like "strategy" or "build" alone are not enough: "explain this
 * strategy" must stay a normal chat, so the coding view only opens on demand.
 */
export function codeRequestKind(prompt: string): CodeKind | null {
  const p = prompt.toLowerCase();
  if (/\b(mql5?|mq5|mt5|mt4|metatrader|expert advisor|\bea\b)\b/.test(p) || /\b(trading )?bot\b/.test(p)) return "mql5";
  if (/\b(pine( ?script)?|tradingview (script|indicator|strategy))\b/.test(p)) return "pine";
  if (/\bpython\b|\.py\b/.test(p)) return "python";
  if (/\b(html|css|javascript|typescript|react|website|web ?page)\b/.test(p)) return "web";
  const verb = /\b(write|create|build|make|generate|code|banao|bana do|likho|fix|refactor|convert)\b/.test(p);
  const thing = /\b(code|script|indicator|function|program|class|snippet|file)\b/.test(p);
  return verb && thing ? "generic" : null;
}

/** True when a prompt asks for code, so the page can show the coding view. */
export function looksLikeCodeRequest(prompt: string): boolean {
  return codeRequestKind(prompt) !== null;
}

/** Files the Chat code editor can hold at once. */
export const CHAT_MAX_FILES = 4;

/**
 * Adds a reply's files to the editor: same name = updated in place, new names
 * are appended while there is room. Existing files are never pushed out;
 * anything over the limit is reported in `dropped`.
 */
export function mergeWorkspace(current: ReplyFile[], incoming: ReplyFile[], max = CHAT_MAX_FILES) {
  const files = [...current];
  const dropped: string[] = [];
  for (const f of incoming) {
    const i = files.findIndex((x) => x.name.toLowerCase() === f.name.toLowerCase());
    if (i >= 0) files[i] = f;
    else if (files.length < max) files.push(f);
    else dropped.push(f.name);
  }
  return { files, dropped };
}

const FILE_NAME = /[\w\-]+\.[a-z0-9]{1,5}\b/gi;

/**
 * A chat request to rename an editor file, e.g. "rename backtest.py to rsi.py",
 * "jenvu_code.py ka name rsi.py krdo" or "name this file Strategy.pine".
 * With one file name only, the active file is renamed.
 */
export function parseRenameRequest(prompt: string, names: string[], activeName?: string): { from: string; to: string } | null {
  if (!names.length || !/\b(rename|name|naam|call it|save as)\b/i.test(prompt)) return null;
  const found = prompt.match(FILE_NAME) ?? [];
  const existing = (n: string) => names.find((x) => x.toLowerCase() === n.toLowerCase());
  if (found.length >= 2) {
    const from = existing(found[0]);
    const to = found[found.length - 1];
    if (from && !existing(to)) return { from, to };
    return null;
  }
  if (found.length === 1 && !existing(found[0])) {
    const from = activeName && existing(activeName) ? activeName : names.length === 1 ? names[0] : undefined;
    return from ? { from, to: found[0] } : null;
  }
  return null;
}

/** True when a prompt asks for a PDF, report, guide or other document. */
export function looksLikeDocRequest(prompt: string): boolean {
  const p = prompt.toLowerCase();
  if (/\bpdf\b/.test(p)) return true;
  const thing = /\b(report|guide|document|doc file|ebook|e-book|handbook|cheat ?sheet|playbook|whitepaper)\b/.test(p);
  const verb = /\b(write|create|build|make|generate|prepare|banao|bana do|bana|likho|tayar)\b/.test(p);
  return thing && verb;
}

export type ReplyDocument = { title: string; markdown: string };

/** The ```document block of a reply (what the Chat page shows as a PDF page). */
export function extractReplyDocument(reply: string): ReplyDocument | null {
  const m = reply.match(/```document[^\n]*\n([\s\S]*?)(?:```|$)/i);
  if (!m || !m[1].trim()) return null;
  const markdown = m[1].trim();
  const h1 = markdown.match(/^#\s+(.+)$/m);
  const title = (h1?.[1] ?? "Jenvu document").replace(/[*_`]/g, "").trim();
  return { title, markdown };
}

/** Editor files written as context for the AI, so it can edit or move code between them. */
export function workspaceContext(files: ReplyFile[]): string {
  if (!files.length) return "";
  const body = files
    .map((f) => `--- ${f.name} ---\n\`\`\`${f.lang}\n${f.code.replace(/\n$/, "")}\n\`\`\``)
    .join("\n\n");
  return `\n\n[Files open in the editor (max ${CHAT_MAX_FILES}). To change a file, return the WHOLE file with the same name in its own block starting with "// File: <name>" (or "# File: <name>"). To move or copy code between files, return every file you changed.]\n${body}`;
}
