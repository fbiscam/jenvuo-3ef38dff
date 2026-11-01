// Keeps the Chat page conversation in the browser until the user clicks New chat
// (survives refresh, leaving the page and signing out). One saved chat per account.

export const CHAT_SESSION_VERSION = 1;
/** Keep the saved chat small enough for browser storage. */
export const CHAT_SESSION_MAX_TURNS = 60;

export const chatSessionKey = (userId: string) => `jenvu.chat.session.v${CHAT_SESSION_VERSION}.${userId}`;

export type SavedTurn = {
  id: string;
  role: "user" | "assistant";
  content: string;
  display?: string;
  files?: { name: string; kind: "image" | "doc" }[];
  model?: string;
  tokens?: number;
  cost?: number;
  ms?: number;
  error?: boolean;
};

export type ChatSession = {
  turns: SavedTurn[];
  workspace: { name: string; code: string; lang: string }[];
  activeFile: number;
  doc: { title: string; markdown: string } | null;
  docOpen: boolean;
  model?: string;
};

type TurnLike = SavedTurn & { files?: { name: string; kind: "image" | "doc"; url?: string }[] };

/** What is stored: images are dropped (only their names stay) and old turns trimmed. */
export function toSavedSession(s: Omit<ChatSession, "turns"> & { turns: TurnLike[] }): ChatSession {
  const turns = s.turns.slice(-CHAT_SESSION_MAX_TURNS).map(({ files, ...t }) => ({
    ...t,
    ...(files?.length ? { files: files.map((f) => ({ name: f.name, kind: f.kind })) } : {}),
  }));
  return { ...s, turns, activeFile: Math.max(0, Math.min(s.activeFile, s.workspace.length - 1)) };
}

/** Reads a stored chat; anything malformed counts as no saved chat. */
export function parseSavedSession(raw: string | null): ChatSession | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<ChatSession>;
    if (!v || !Array.isArray(v.turns) || !Array.isArray(v.workspace)) return null;
    const turns = v.turns.filter(
      (t): t is SavedTurn => !!t && typeof t.id === "string" && (t.role === "user" || t.role === "assistant") && typeof t.content === "string",
    );
    const workspace = v.workspace.filter((f) => !!f && typeof f.name === "string" && typeof f.code === "string" && typeof f.lang === "string");
    const doc = v.doc && typeof v.doc.title === "string" && typeof v.doc.markdown === "string" ? v.doc : null;
    if (!turns.length && !workspace.length && !doc) return null;
    return {
      turns,
      workspace,
      activeFile: typeof v.activeFile === "number" ? Math.max(0, Math.min(v.activeFile, workspace.length - 1)) : 0,
      doc,
      docOpen: !!doc && v.docOpen === true,
      model: typeof v.model === "string" ? v.model : undefined,
    };
  } catch {
    return null;
  }
}
