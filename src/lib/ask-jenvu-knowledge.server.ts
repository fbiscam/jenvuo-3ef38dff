// Builds the knowledge text the "Ask Jenvu" assistant answers from.
// Sources: hand-written core facts + Help Center articles + support guides + stories.
import { collections, type Block } from "@/lib/help-content";
import { SUPPORT_GUIDES } from "@/lib/support-guides";
import { STORIES } from "@/lib/stories";

const CORE_FACTS = `
# Jenvu core facts
- Jenvu is an AI trading platform focused on EUR/USD (Euro / US Dollar). Website: jenvu.com. Dashboard: dash.jenvu.com. Sign in: auth.jenvu.com/sign-in. Blog: blogs.jenvu.com. Help: support.jenvu.com. Docs: jenvu.com/docs.
- Main products for all users: JX Bot, Jenvu's Expert Advisor for MetaTrader 5 on EUR/USD M15 (download, IP setup and install guide at dash.jenvu.com/jx-bot), and the Top AI Models (ChatGPT 5.5 Pro, Claude Fable 5.1, Grok 4.6) through Ask Jenvu, the AI chat and the developer API. Also: alerts, a browser extension and an MCP server. Jenvu no longer offers a demo trading account.
- JX Bot uses IP verification, not license keys: the user adds the public IP address of the PC or RDP that runs MT5 at dash.jenvu.com/jx-bot (find it by opening whatismyip.com on that machine), then types the same IP into the bot's MyIP input. When the bot starts it checks with jenvu.com that the IP it connects from matches the registered IP and that the plan is active; if it doesn't match, the bot won't trade. One IP works with one MT5 account (the first account that runs on it), and one IP can be registered by only one user. If the PC or RDP IP changes, the user deletes the old IP on the website and adds the new one. MT5 must allow WebRequest for https://jenvu.com (Tools → Options → Expert Advisors). On an RDP/VPS, the IP to register is the outbound internet IP shown by whatismyip.com on the RDP, which can differ from the IP used to log in. The bot trades EUR/USD on M15 (auto lot 0.08 per $1,000 balance, 4.7% daily drawdown guard), and pauses for the day when the daily target (monthly target / 20) is reached. Each registered IP has its own daily target: when one MT5 account reaches it, that bot closes its trades and resumes the next day, while the user's other accounts keep running. Users see profit, balance, equity and trades per account at Dashboard → Usage → Bot Usage (dash.jenvu.com/bot-usage). Plans: Pro 1 IP, $600 monthly / $30 daily target; Elite 2 IPs, $1,500 / $75; Ultra 5 IPs, $3,000 / $150. JX Bot is unlocked by an active Pro, Elite or Ultra plan, Founding membership, or the 14-day free trial (Pro limits: 1 IP); when the trial ends the bot stops until the user buys a plan. Credit alone never unlocks it. Targets are stop limits, not promised profits. Do not explain the bot's internal strategy, indicators, entry rules or settings values; say these are proprietary and point to the install guide.
- The Jenvu Terminal (live EUR/USD chart with ICT/SMC analysis: swings, BOS/CHoCH, supply and demand zones, fair value gaps, BSL/SSL liquidity sweeps, volume and RVOL) is reserved for approved Founding Program members, free of cost.
- Chart price feed: Binance EURUSDT candles (prices shown to 5 decimals). Forex is traded over the counter, so volume is a feed-based estimate, not centralized market order flow. Markets close on weekends.
- Plans (per month): Pro $49, Elite $99, Ultra $169. Annual billing saves about 17%. Usage is $3 per 1,000,000 tokens; wallet top-ups start at $5 ($5, $10, $25, $50 or a custom amount). Daily token allowance resets at 00:00 UTC.
- Free trial: new accounts can claim $100 credit plus 14 days of Pro (including JX Bot) once, by clicking "Start free" in the dashboard top banner. Sign up is free and public.
- Terminal credits: with Terminal access, the chart, indicators, SMC tools (swings, BOS/CHoCH, FVGs, liquidity sweeps), drawing tools and news are included and use no credits. Fresh sweep, Swing price action and the Zone + FVG (supply/demand) strategy are also included with Terminal access and cost no credits. Only AI features use credits: Ask AI / AI desk chat (including attached chart images), voice answers, and signal scans that return BUY or SELL (WAIT is free). AI replies cost only the tokens used at $3 per 1,000,000 tokens, with no fixed fee; failed requests are free. Charges are checked and deducted on the server, so they cannot be bypassed. Daily AI allowance: Free 100K, Pro 1.5M, Elite 5M, Ultra 10M tokens, also limited by balance ($3 = 1M tokens), resetting at 00:00 UTC. AI chat needs Pro, Elite or Ultra (or the 14-day Pro trial). When the balance is too low, the AI stops answering but the chart keeps working; add credits at Dashboard → Payments. Balance and rate show under the Terminal chat box; per-reply costs are on Dashboard → Usage. Help article: support.jenvu.com/help/plans-credits-billing/terminal-credits.
- Terminal access is only for approved Founding Program members (free of cost) and admins. Pro, Elite and Ultra plans, the free trial and credit do not unlock the Terminal; plans cover JX Bot (IP slots) and the Top AI Models, and credit pays for API usage and AI. Every other page (dashboard, JX Bot, Usage, API keys, Billing, Payments, Settings, Help) stays open. The Founding Program is invite-only: apply at jenvu.com/founding. Approval grants 3 months of the requested plan plus $250 credit right away and Terminal access, with 2 days to complete ID verification. Founding members who are already in the program see "You are already in a program" on their dashboard.
- Account rules: one person, one account. Sign-up checks the device, the network (IP), VPN/proxy use, throwaway emails and email aliases (like dots or +tags in Gmail). A device or network can hold at most 2 accounts, and the free trial can be claimed only once per person and device. Accounts are verified with a 6-digit email code.
- SMC tools and indicators guide: the Terminal's left rail has Jenvu SMC and Indicators menus. Explain any tool step by step from the Help article "How to use SMC tools and indicators" (support.jenvu.com/help/signal-engine/smc-tools-indicators).
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
