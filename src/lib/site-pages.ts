export type SitePage = { to: string; label: string; keywords?: string };

/** Public site pages the dashboard search can jump to, with extra words people may type. */
export const SITE_PAGES: SitePage[] = [
  { to: "/", label: "Home", keywords: "homepage start jenvu" },
  { to: "/about", label: "Overview", keywords: "about company story team" },
  { to: "/strategies/ict-gold-trading", label: "Solutions", keywords: "ict smc strategy gold trading" },
  { to: "/ai-engine", label: "Products", keywords: "ai engine features terminal api" },
  { to: "/pricing", label: "Pricing", keywords: "plans price pro elite ultra buy upgrade cost" },
  { to: "/insights", label: "Blog", keywords: "articles insights news posts" },
  { to: "/help", label: "Support", keywords: "help center support guides faq questions" },
  { to: "/docs", label: "Docs", keywords: "documentation api reference developers" },
  { to: "/contact", label: "Contact us", keywords: "contact sales email phone support team live chat message" },
  { to: "/founding", label: "Founding Program", keywords: "founding apply application invite" },
  { to: "/founder", label: "Founder", keywords: "founder ceo" },
  { to: "/killzones", label: "Killzones", keywords: "sessions london new york asia times" },
  { to: "/scam-check", label: "Scam Check", keywords: "scam fraud check broker safety" },
  { to: "/download", label: "Download", keywords: "extension app install chrome mobile" },
  { to: "/terms", label: "Terms of service", keywords: "terms legal conditions" },
  { to: "/privacy", label: "Privacy policy", keywords: "privacy data cookies gdpr" },
  { to: "/refund", label: "Refund policy", keywords: "refund money back" },
  { to: "/cancellation", label: "Cancellation policy", keywords: "cancel subscription" },
  { to: "/disclaimer", label: "Risk disclaimer", keywords: "risk disclaimer warning" },
];

/** Pages whose name or extra words match the typed text (whole text or any word of 3+ letters). */
export function matchSitePages<T extends SitePage>(q: string, pages: readonly T[], limit = 6): T[] {
  const t = q.trim().toLowerCase();
  if (!t) return [];
  const words = t.split(/\s+/).filter((w) => w.length >= 3);
  const seen = new Set<string>();
  return pages
    .filter((l) => {
      const label = `${l.label} ${l.keywords ?? ""}`.toLowerCase();
      const hit = label.includes(t) || words.some((w) => label.includes(w));
      return hit && !seen.has(l.to) && seen.add(l.to);
    })
    .slice(0, limit);
}
