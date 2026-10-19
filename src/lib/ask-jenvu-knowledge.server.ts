// Builds the knowledge text the "Ask Jenvu" assistant answers from.
// Sources: hand-written core facts + Help Center articles + support guides + stories.
import { collections, type Block } from "@/lib/help-content";
import { SUPPORT_GUIDES } from "@/lib/support-guides";
import { STORIES } from "@/lib/stories";

const CORE_FACTS = `
# Jenvu core facts
- Jenvu is an AI trading platform focused only on gold (XAU/USD). Website: jenvu.com. Dashboard: dash.jenvu.com. Sign in: auth.jenvu.com/sign-in. Blog: blogs.jenvu.com. Help: support.jenvu.com. Docs: jenvu.com/docs.
- Main products: the Jenvu Terminal (live gold chart with ICT/SMC analysis: swings, BOS/CHoCH, supply and demand zones, fair value gaps, BSL/SSL liquidity sweeps, volume and RVOL), AI chat about the chart, seven rule-based analysis engines, alerts, a $100,000 demo trading account, a browser extension, and an API for developers.
- Chart price feed: Gate XAU_USDT gold contract, with Binance only as a fallback. Gold is traded over the counter, so volume is a feed-based estimate, not centralized market order flow. Markets close on weekends.
- Plans (per month): Pro $10, Elite $25, Ultra $50. Annual billing saves about 17%. Usage is $3 per 1,000,000 tokens; wallet top-ups start at $5 ($5, $10, $25, $50 or a custom amount). Daily token allowance resets at 00:00 UTC.
- Free trial: new accounts can claim $100 credit plus 14 days of Pro once, by clicking "Start free" in the dashboard top banner. Sign up is free and public.
- Terminal access: available to admins and approved Founding Program members. The Founding Program is invite-only: apply at jenvu.com/founding. Approval grants 3 months of the requested plan plus $250 credit right away, with 2 days to complete ID verification. Founding members who are already in the program see "You are already in a program" on their dashboard.
- Account rules: one person, one account. Sign-up checks the device, the network (IP), VPN/proxy use, throwaway emails and email aliases (like dots or +tags in Gmail). A device or network can hold at most 2 accounts, and the free trial can be claimed only once per person and device. Accounts are verified with a 6-digit email code.
- Support: support@jenvu.com, Monday to Friday, 09:00 – 18:00 UTC. Contact form at jenvu.com/contact.
- Developers: create API keys in the dashboard (dash.jenvu.com/api); AI assistants can connect to Jenvu through its MCP server.
- Jenvu gives analysis and education, not financial advice. Trading carries risk. Never promise profits or a fixed win rate.
`;

function blockText(b: Block): string {
  if (b.type === "ul" || b.type === "ol") return b.items.map((i) => `- ${i}`).join("\n");
  if (b.type === "code") return "";
  return b.content;
}

let cached: string | null = null;

export function getJenvuKnowledge(): string {
  if (cached) return cached;
  const parts: string[] = [CORE_FACTS.trim(), "\n# Help Center articles"];
  for (const c of collections) {
    parts.push(`\n## ${c.title}`);
    for (const a of c.articles) {
      const body = a.body.map(blockText).filter(Boolean).join("\n");
      parts.push(`### ${a.title}\n${a.summary}\n${body}`);
    }
  }
  parts.push("\n# Platform guides");
  for (const g of SUPPORT_GUIDES) parts.push(`- ${g.title}: ${g.text}`);
  parts.push("\n# Stories");
  for (const s of STORIES) parts.push(`- ${s.title}: ${s.intro}`);
  cached = parts.join("\n").slice(0, 60000);
  return cached;
}

// ---- Question-focused knowledge --------------------------------------------
// Sending all ~26k characters with every question made answers slow (the
// model reads the whole prompt first). Instead send the core facts plus only
// the few sections that match the question's words.

type Section = { text: string; words: Set<string> };
let sections: Section[] | null = null;

const STOP = new Set(
  "the a an and or of to in on for is are what how do does can i you my me it with about this that jenvu be at by from as your".split(" "),
);
const tokenize = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9$+\s/-]/g, " ").split(/[\s/-]+/).filter((w) => w.length > 1 && !STOP.has(w));

function getSections(): Section[] {
  if (sections) return sections;
  const out: string[] = [];
  for (const c of collections) {
    for (const a of c.articles) {
      const body = a.body.map(blockText).filter(Boolean).join("\n");
      out.push(`### ${c.title} — ${a.title}\n${a.summary}\n${body}`);
    }
  }
  for (const g of SUPPORT_GUIDES) out.push(`### Guide — ${g.title}\n${g.text}`);
  for (const s of STORIES) out.push(`### Story — ${s.title}\n${s.intro}`);
  sections = out.map((text) => ({ text, words: new Set(tokenize(text)) }));
  return sections;
}

/** Core facts + the best-matching sections for the latest question (bounded size). */
export function getRelevantJenvuKnowledge(question: string, maxChars = 7000): string {
  const q = tokenize(question);
  const scored = getSections()
    .map((s) => {
      const title = s.text.split("\n", 1)[0].toLowerCase();
      let score = 0;
      for (const w of q) {
        if (s.words.has(w)) score += 1;
        if (title.includes(w)) score += 2;
      }
      return { s, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  const parts = [CORE_FACTS.trim()];
  let size = parts[0].length;
  for (const { s } of scored) {
    if (size + s.text.length > maxChars) continue;
    parts.push(s.text);
    size += s.text.length;
    if (parts.length > 6) break;
  }
  return parts.join("\n\n");
}
