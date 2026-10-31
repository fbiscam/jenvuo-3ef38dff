// Pure helpers for the dashboard Chat playground (tested in playground.test.ts).
import type { ChatMessage } from "@/lib/ai-gateway";

export type PlaygroundTurn = { role: "user" | "assistant"; content: string };

export const PLAYGROUND_MAX_TURNS = 40;
export const PLAYGROUND_MAX_CHARS = 40_000;
export const PLAYGROUND_MAX_TOKENS = 4000;

const QUOTED_REPLY = "[Earlier reply quoted by the user — not verified]\n";

/**
 * Same trust rules as the public API: the browser can never set real system or
 * assistant turns. Instructions and earlier replies travel as labelled user text.
 */
export function buildPlaygroundMessages(
  turns: PlaygroundTurn[],
  instructions?: string,
): ChatMessage[] {
  const recent = turns
    .filter((t) => typeof t.content === "string" && t.content.trim().length > 0)
    .slice(-PLAYGROUND_MAX_TURNS);
  const out: ChatMessage[] = recent.map((t) => ({
    role: "user",
    content: (t.role === "assistant" ? QUOTED_REPLY : "") + t.content.slice(0, PLAYGROUND_MAX_CHARS),
  }));
  const extra = (instructions ?? "").trim().slice(0, 8000);
  if (extra && out.length) {
    out.unshift({ role: "user", content: `[Instructions from the user]\n${extra}` });
  }
  return out;
}

export function clampMaxTokens(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 1200;
  return Math.min(PLAYGROUND_MAX_TOKENS, Math.max(16, Math.round(n)));
}
