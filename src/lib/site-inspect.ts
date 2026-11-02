// Pure helpers for the chat's Website / SEO inspector panel.

const DOMAIN_RE = /\b((?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,24})(?:\/[^\s]*)?/i;
const INTENT_RE = /\b(seo|domain|website|site|web ?site|keywords?|ranking|rank|age|info|information|audit|check|analy[sz]e)\b/i;

/** Returns the bare domain when the message asks about a website, else null. */
export function siteInspectTarget(text: string): string | null {
  if (!INTENT_RE.test(text)) return null;
  const m = text.match(DOMAIN_RE);
  if (!m?.[1]) return null;
  const host = m[1].replace(/^https?:\/\//i, "").toLowerCase();
  if (/\.(py|ts|tsx|js|mq5|pine|pdf|png|jpg|docx|txt|md|json|csv)$/i.test(host)) return null;
  return host.replace(/^www\./, "");
}

/** Top words of the page text (3+ letters, common stop words removed). */
export function topKeywords(text: string, limit = 12): { word: string; count: number }[] {
  const stop = new Set("the and for with that this from your you are our was were have has not but all can will its into more about their they them than then also what when which who how why out use any one two new get may just".split(" "));
  const counts = new Map<string, number>();
  for (const w of text.toLowerCase().match(/[a-z][a-z0-9-]{2,}/g) ?? []) {
    if (stop.has(w)) continue;
    counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([word, count]) => ({ word, count }));
}

/** Whole years and months between two dates, e.g. "12 years, 3 months". */
export function domainAge(created: Date, now: Date): string {
  let months = (now.getUTCFullYear() - created.getUTCFullYear()) * 12 + (now.getUTCMonth() - created.getUTCMonth());
  if (now.getUTCDate() < created.getUTCDate()) months -= 1;
  if (months < 0) months = 0;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return `${y} year${y === 1 ? "" : "s"}, ${m} month${m === 1 ? "" : "s"}`;
}
