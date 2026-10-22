/** Gifts / Notifications titles are capped at this many words. */
export const NOTICE_TITLE_MAX_WORDS = 3;

/** First three words of a title (punctuation at the cut is trimmed). */
export function shortTitle(title: string | null | undefined, maxWords = NOTICE_TITLE_MAX_WORDS): string {
  const words = String(title ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return words.join(" ");
  return words.slice(0, maxWords).join(" ").replace(/[\s,;:·—–-]+$/u, "");
}
