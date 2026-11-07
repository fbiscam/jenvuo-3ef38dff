import { DAILY_TARGET_PCT, DAILY_DRAWDOWN_PCT } from "@/lib/mt5-licenses";
// Builds the knowledge text the "Ask Jenvu" assistant answers from.
// Sources: hand-written core facts + Help Center articles + support guides + stories.
import { collections, type Block } from "@/lib/help-content";
import { SUPPORT_GUIDES } from "@/lib/support-guides";
import { STORIES } from "@/lib/stories";

const CORE_FACTS = `
# Jenvu core facts
- Jenvu is an AI trading platform focused on EUR/USD (Euro / US Dollar). Website: jenvu.com. Dashboard: dash.jenvu.com. Sign in: auth.jenvu.com/sign-in. Blog: blogs.jenvu.com. Help: support.jenvu.com. Docs: jenvu.com/docs.
- Main products: JX Bot, Jenvu's Expert Advisor for MetaTrader 5 on EUR/USD M15 for approved Founding Program members only (download, IP setup and install guide at dash.jenvu.com/jx-bot), and the Top AI Models (ChatGPT 5.5 Pro, Claude Fable 5.1, Grok 4.6) through Ask Jenvu, the AI chat and the developer API. Also: alerts, a browser extension and an MCP server. Jenvu no longer offers a demo trading account.
- JX Bot uses IP verification, not license keys: the user adds the public IP address of the PC or RDP that runs MT5 at dash.jenvu.com/jx-bot (find it by opening whatismyip.com on that machine), then types the same IP into the bot's MyIP input. When the bot starts it checks with jenvu.com that the IP it connects from matches the registered IP and that the plan is active; if it doesn't match, the bot won't trade. One IP works with one MT5 account (the first account that runs on it), and one IP can be registered by only one user. If the PC or RDP IP changes, the user deletes the old IP on the website and adds the new one. MT5 must allow WebRequest for https://jenvu.com (Tools → Options → Expert Advisors). On an RDP/VPS, the IP to register is the outbound internet IP shown by whatismyip.com on the RDP, which can differ from the IP used to log in. The bot (current version EA 3.94) trades EUR/USD on M15 (auto lot 0.05 per $1,000 balance, ${DAILY_DRAWDOWN_PCT}% daily drawdown guard). Built-in trading hours (broker server time): new trades Monday to Thursday 01:00-14:00, Friday until 13:00, no trading on Saturday and Sunday, and no new trades during the London open (07:00-09:00 UTC) and New York open (13:00-15:00 UTC); open trades are still managed outside these hours. It pauses for the day when the fixed daily target is reached: ${DAILY_TARGET_PCT.pro}% (Pro), ${DAILY_TARGET_PCT.elite}% (Elite) or ${DAILY_TARGET_PCT.ultra}% (Ultra) of the day's starting balance, set by the Jenvu server so users can't change it; the ${DAILY_DRAWDOWN_PCT}% daily drawdown guard is fixed too. Before each entry it checks the H1 trend, spread (max 2 pips), a confirming candle body and skips spike candles, so some days have fewer trades. After an update users must re-download, attach the bot again and load the preset "Jenvu EURUSD 15M.set" in Inputs. Each registered IP has its own daily target: when one MT5 account reaches it, that bot closes its trades and resumes the next day, while the user's other accounts keep running. Users see profit, balance, equity and trades per account at Dashboard → Usage → Bot Usage (dash.jenvu.com/bot-usage). Plans: Pro 1 IP (${DAILY_TARGET_PCT.pro}% daily target); Elite 2 IPs (${DAILY_TARGET_PCT.elite}%); Ultra 5 IPs (${DAILY_TARGET_PCT.ultra}%). JX Bot is only for verified Founding Program members (approved and ID verified): the first Founding month is free, then they keep it with a paid plan that includes the bot cost. A plan bought without Founding membership, and the free trial, never unlock JX Bot. Credit alone never unlocks it. Targets are stop limits, not promised profits. Do not explain the bot's internal strategy, indicators, entry rules or settings values; say these are proprietary and point to the install guide.
- The Jenvu Terminal (live charts for XAU/USD gold [default], BTC/USD bitcoin and EUR/USD, switched from the pair buttons next to the timeframe controls; BTC updates trade by trade and trades 24/7, gold and EUR/USD about once a second and close on weekends; with with ICT/SMC analysis: swings, BOS/CHoCH, supply and demand zones, fair value gaps, BSL/SSL liquidity sweeps, volume and RVOL) is only for approved Founding Program members (and accounts on a paid plan); after approval the member has 2 days to verify their ID or the Terminal locks until they send it.
- Chart price feed: Binance EURUSDT candles (prices shown to 5 decimals). Forex is traded over the counter, so volume is a feed-based estimate, not centralized market order flow. Markets close on weekends.
- Plans (per month, Terminal + API): Pro $29, Elite $59, Ultra $99. Verified Founding members pay the JX Bot cost on top (Pro +$20 = $49, Elite +$40 = $99, Ultra +$70 = $169) because their plan includes JX Bot. Annual billing saves about 17%. Usage is $3 per 1,000,000 tokens; wallet top-ups start at $5 ($5, $10, $25, $50 or a custom amount). Daily token allowance resets at 00:00 UTC.
- Access model: Jenvu is Founding-members-only. Public sign-up and the free trial are closed; accounts are created only when a Founding application is approved (the member gets an email to set their password). The Terminal, JX Bot and API credit are only for approved Founding members. Plans and credit top-ups can be bought only by Founding members whose ID is verified (on any day of their Founding month); until then Payments plans are locked. Non-members apply at jenvu.com/founding.
- Terminal credits: with Terminal access, the chart, indicators, SMC tools (swings, BOS/CHoCH, FVGs, liquidity sweeps), drawing tools and news are included and use no credits. Fresh sweep, Swing price action and the Zone + FVG (supply/demand) strategy are also included with Terminal access and cost no credits. Only AI features use credits: Ask AI / AI desk chat (including attached chart images), voice answers, and signal scans that return BUY or SELL (WAIT is free). AI replies cost only the tokens used at $3 per 1,000,000 tokens, with no fixed fee; failed requests are free. Charges are checked and deducted on the server, so they cannot be bypassed. Daily AI allowance: Free 100K, Pro 1.5M, Elite 5M, Ultra 10M tokens, also limited by balance ($3 = 1M tokens), resetting at 00:00 UTC. AI chat needs Pro, Elite or Ultra (Founding members get their plan on approval). When the balance is too low, the AI stops answering but the chart keeps working; add credits at Dashboard → Payments. Balance and rate show under the Terminal chat box; per-reply costs are on Dashboard → Usage. Help article: support.jenvu.com/help/plans-credits-billing/terminal-credits.
- Access (current rules): sign-up and the free trial are closed; Jenvu accounts are created only when a Founding Program application is approved. The Founding Program has 100 seats a month; when they are full, seats reopen on the 1st of the next month at 00:00 UTC. After approval the member has 2 days to upload their ID. The Terminal and JX Bot open only once the ID is verified. The $200 Founding API credit is added by the Jenvu team (funded from the admin panel) after the ID is verified, never automatically on approval. The Founding month lasts 30 days from approval: after that the Terminal, JX Bot and Founding credit all close. To continue, the member buys a plan on the Payments page (Pro $49, Elite $99, Ultra $169 for verified Founding members, JX Bot included), pays and submits the transaction ID; the plan starts once the team verifies the payment. Plans can only be bought after ID verification; signed-out visitors see "Apply now" buttons and signed-in members see "Buy now". Credit never unlocks the Terminal. JX Bot is only for verified Founding members (Pro 1 IP, Elite 2 IPs, Ultra 5 IPs).
- Business / B2B: companies, teams, brokers and partners can use "Contact sales" (in the site header, on jenvu.com/contact, or the Contact sales form inside Ask Jenvu) to tell the team what they need.
- Account rules: one person, one account. Public sign-up is closed; approved Founding members receive a secure link by email to set their password, then sign in at auth.jenvu.com/sign-in.
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
