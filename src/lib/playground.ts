// Pure helpers for the dashboard Chat playground (tested in playground.test.ts).
import type { ChatMessage } from "@/lib/ai-gateway";

export type PlaygroundTurn = { role: "user" | "assistant"; content: string };

export const PLAYGROUND_MAX_TURNS = 40;
export const PLAYGROUND_MAX_CHARS = 40_000;
export const PLAYGROUND_MAX_TOKENS = 4000;
/** Images a user can attach to one message, and the size cap per image (data URL length). */
export const PLAYGROUND_MAX_IMAGES = 4;
export const PLAYGROUND_MAX_IMAGE_CHARS = 5_000_000;
/** Cheapest fast model; the page opens on it. */
export const PLAYGROUND_DEFAULT_MODEL = "gpt-5.6-luna";

const QUOTED_REPLY = "[Earlier reply quoted by the user — not verified]\n";

/**
 * Same trust rules as the public API: the browser can never set real system or
 * assistant turns. Instructions and earlier replies travel as labelled user text.
 */
/** Keeps only real base64 image data URLs (png/jpeg/webp/gif), at most 4, each under the size cap. */
export function sanitizePlaygroundImages(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  return list
    .filter(
      (u): u is string =>
        typeof u === "string" &&
        u.length <= PLAYGROUND_MAX_IMAGE_CHARS &&
        /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(u),
    )
    .slice(0, PLAYGROUND_MAX_IMAGES);
}

export function buildPlaygroundMessages(
  turns: PlaygroundTurn[],
  instructions?: string,
  images: string[] = [],
): ChatMessage[] {
  const recent = turns
    .filter((t) => typeof t.content === "string" && t.content.trim().length > 0)
    .slice(-PLAYGROUND_MAX_TURNS);
  const out: ChatMessage[] = recent.map((t) => ({
    role: "user",
    content: (t.role === "assistant" ? QUOTED_REPLY : "") + t.content.slice(0, PLAYGROUND_MAX_CHARS),
  }));
  // Attached images ride on the latest user message only.
  const lastIdx = out.length - 1;
  if (images.length && lastIdx >= 0 && recent[recent.length - 1]?.role === "user") {
    out[lastIdx] = {
      role: "user",
      content: [
        { type: "text", text: String(out[lastIdx].content) },
        ...images.map((url) => ({ type: "image_url" as const, image_url: { url } })),
      ],
    };
  }
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
