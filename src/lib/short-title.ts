export const HOME_TITLE_MAX_WORDS = 6;

/** Cuts a title to at most `max` words, adding "…" when shortened. */
export function shortTitle(title: string, max = HOME_TITLE_MAX_WORDS): string {
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length <= max) return words.join(" ");
  return `${words.slice(0, max).join(" ").replace(/[,:;.\-–—]+$/, "")}…`;
}
