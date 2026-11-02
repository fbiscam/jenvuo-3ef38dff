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

/** True when a prompt asks for a separate, new file instead of editing the open one. */
export function wantsNewFile(prompt: string): boolean {
  return /\b(new|another|separate|second|alag|nayi|naya|dusri|doosri)\s+(file|script|tab)\b|\bnew file\b|\bfile\s+(alag|nayi|naya)\b/i.test(prompt);
}

/** Files the Chat code editor can hold at once. */
export const CHAT_MAX_FILES = 2;

/**
 * Adds a reply's files to the editor: same name = updated in place, new names
 * are appended while there is room. Existing files are never pushed out;
 * anything over the limit is reported in `dropped`.
 */
export function mergeWorkspace(current: ReplyFile[], incoming: ReplyFile[], max = CHAT_MAX_FILES, asNew = false) {
  const files = [...current];
  const dropped: string[] = [];
  for (const src of incoming) {
    let f = src;
    const taken = (n: string) => files.some((x) => x.name.toLowerCase() === n.toLowerCase());
    // "new file" requests never overwrite an open file: give it a fresh name.
    if (asNew && taken(f.name)) {
      const dot = f.name.lastIndexOf(".");
      let n = 2;
      while (taken(`${f.name.slice(0, dot)}_${n}${f.name.slice(dot)}`)) n++;
      f = { ...f, name: `${f.name.slice(0, dot)}_${n}${f.name.slice(dot)}` };
    }
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
  const found: string[] = Array.from(prompt.match(FILE_NAME) ?? []);
  const existing = (n: string) => names.find((x) => x.toLowerCase() === n.toLowerCase());
  if (found.length >= 2) {
    const from = existing(found[0] ?? "");
    const to = found[found.length - 1] ?? "";
    if (from && !existing(to)) return { from, to };
    return null;
  }
  if (found.length === 1 && found[0] && !existing(found[0])) {
    const from = activeName && existing(activeName) ? activeName : names.length === 1 ? names[0] : undefined;
    return from ? { from, to: found[0] } : null;
  }
  return null;
}

/**
 * True when a prompt asks the AI to create a picture ("image banao", "draw a
 * gold bull logo"). Asking about an attached image is not a request to create one.
 */
export function looksLikeImageRequest(prompt: string): boolean {
  const p = prompt.toLowerCase();
  if (/\b(describe|explain|analy[sz]e|read|what is in|what's in|kya hai|batao)\b/.test(p)) return false;
  const thing = /\b(image|images|picture|pic|photo|tasveer|tasvir|illustration|logo|poster|wallpaper|artwork|drawing|thumbnail|banner|icon)\b/.test(p);
  const verb = /\b(create|generate|make|draw|design|paint|render|banao|bana do|bana|banado|banaye|banaen)\b/.test(p);
  return thing && verb;
}

/** True when a prompt asks for a PDF, report, guide or other document. */
export function looksLikeDocRequest(prompt: string): boolean {
  const p = prompt.toLowerCase();
  if (/\bpdf\b/.test(p)) return true;
  const thing = /\b(report|guide|document|doc file|leads?|proposal|ebook|e-book|handbook|cheat ?sheet|playbook|whitepaper|seo|audit|article|cover letter|resume|cv)\b/.test(p);
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
  return `\n\n[Files open in the editor (max ${CHAT_MAX_FILES}). To change a file, return the WHOLE file with the same name in its own block starting with "// File: <name>" (or "# File: <name>"). To move or copy code between files, return every file you changed. When the user asks for a NEW file, use a new file name that is not open yet and leave the open files unchanged.]\n${body}`;
}

/**
 * Tab label for a file: at most 2 words of its name plus the extension
 * ("gold_sweep_strategy_v2.mq5" -> "gold_sweep.mq5"), so 4 tabs fit in one row.
 */
export function shortFileName(name: string): string {
  const dot = name.lastIndexOf(".");
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  const words = stem.split(/[\s_\-]+/).filter(Boolean);
  if (words.length <= 2) return name;
  return `${words.slice(0, 2).join("_")}${ext}`;
}

/** Items the frame beside the chat holds at once (code files, image, document, upload, website). */
export const FRAME_MAX_ITEMS = 4;

export type FrameState = { codeFiles: number; image: boolean; doc: boolean; upload: boolean; site: boolean };

export function frameUsed(s: FrameState): number {
  return s.codeFiles + (s.image ? 1 : 0) + (s.doc ? 1 : 0) + (s.upload ? 1 : 0) + (s.site ? 1 : 0);
}

export type FrameAsk = "code-new" | "code-edit" | "image" | "doc" | "upload" | "site" | null;

/**
 * Whether a request would need a new frame tab while the frame is full.
 * Returns the message to show (the request is not sent), or null when it fits.
 * Editing an open file, or replacing the open image/document/upload/report, always fits.
 */
export function frameLimitBlock(ask: FrameAsk, s: FrameState): string | null {
  const used = frameUsed(s);
  const full = used >= FRAME_MAX_ITEMS;
  const msg = `The frame already has ${FRAME_MAX_ITEMS} files (max ${FRAME_MAX_ITEMS}). Please remove one file with the ✕ on its tab, then try again.`;
  if (ask === "code-new") {
    if (s.codeFiles >= CHAT_MAX_FILES) return `The editor already has ${CHAT_MAX_FILES} code files (max ${CHAT_MAX_FILES}). Please remove one code file with the ✕ on its tab, then try again.`;
    return full ? msg : null;
  }
  if (ask === "image") return full && !s.image ? msg : null;
  if (ask === "doc") return full && !s.doc ? msg : null;
  if (ask === "upload") return full && !s.upload ? msg : null;
  if (ask === "site") return full && !s.site ? msg : null;
  return null;
}

/**
 * The open file a message talks about ("gold_sweep.mq5 ma changes kro",
 * "change the backtest file"), by full name, short tab name or name words. -1 when none.
 */
export function findMentionedFile(prompt: string, names: string[]): number {
  const p = prompt.toLowerCase();
  const words = (s: string) => s.toLowerCase().replace(/\.[a-z0-9]{1,5}$/, "").split(/[\s_\-.]+/).filter((w) => w.length > 2);
  let best = -1;
  let bestScore = 0;
  names.forEach((n, i) => {
    const full = n.toLowerCase();
    let score = 0;
    if (p.includes(full)) score = 100;
    else if (p.includes(shortFileName(n).toLowerCase())) score = 90;
    else {
      const stem = full.replace(/\.[a-z0-9]{1,5}$/, "");
      if (stem.length > 2 && (p.includes(stem) || p.includes(stem.replace(/[_\-]+/g, " ")))) score = 80;
      else {
        const ws = words(n).filter((w) => !["jenvu", "code", "file"].includes(w));
        const hits = ws.filter((w) => new RegExp(`\\b${w.replace(/[^\w]/g, "")}\\b`).test(p)).length;
        if (hits) score = hits * 10;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  });
  return best;
}
