// Builds the knowledge text the "Ask Jenvu" assistant answers from.
// Sources: hand-written core facts + Help Center articles + support guides.
import { collections, type Block } from "@/lib/help-content";
import { SUPPORT_GUIDES } from "@/lib/support-guides";

const CORE_FACTS = `
# Jenvu core facts
- Jenvu is an AI trading platform focused on EUR/USD (Euro / US Dollar). Website: jenvu.com. Dashboard: dash.jenvu.com. Sign in: auth.jenvu.com/sign-in. Blog: blogs.jenvu.com. Help: support.jenvu.com. Docs: jenvu.com/docs.
- Main products (exactly three): the Jenvu Terminal, News (upcoming high-impact releases and calendar at dash.jenvu.com/news), the API Platform (Top AI Models: ChatGPT 5.5 Pro, Claude Fable 5.1, Grok 4.6 through Ask Jenvu, the AI chat and the developer API). Also: a browser extension and an MCP server. JX Bot (the MT5 Expert Advisor) has been discontinued and is no longer offered or downloadable; if asked, say so and suggest the Terminal. Scam Protection has been removed and is no longer offered. Jenvu no longer offers alerts (no price, signal or session alerts). Jenvu no longer offers a demo trading account.
- The Jenvu Terminal (live charts for XAU/USD gold [default], BTC/USD bitcoin and EUR/USD, switched from the pair buttons next to the timeframe controls; BTC updates trade by trade and trades 24/7, gold and EUR/USD about once a second and close on weekends; with with ICT/SMC analysis: swings, BOS/CHoCH, supply and demand zones, fair value gaps, BSL/SSL liquidity sweeps, volume and RVOL) is open to every signed-in account, Free included; only the paid indicators (Fresh sweep, price action, Zone + FVG) are limited by daily plan hours.
- Chart price feed: Binance EURUSDT candles (prices shown to 5 decimals). Forex is traded over the counter, so volume is a feed-based estimate, not centralized market order flow. Markets close on weekends.
- Plans (per month, same price for everyone): Pro $69, Elite $139, Ultra $239. Monthly API credit included: Free $35, Pro $40, Elite $70, Ultra $90 (a plan payment adds only this credit). Yearly billing saves 22% on every paid plan (Pro $645, Elite $1,301, Ultra $2,237 a year). Usage is $3 per 1,000,000 tokens. Plans only: credit top-ups are no longer sold. Daily token allowance resets at 00:00 UTC. Plan comparison (jenvu.com/pricing): Free ($0, $35 API credit every month, 1M daily tokens, 10 API requests a minute, 1 API key, Terminal paid indicators 2 hours a day, no senior review); Pro (basic usage, 4M daily tokens, 20 API requests a minute, 3 API keys, Terminal paid indicators 8 hours a day, ChatGPT 5.5 Pro and Grok 4.6); Elite (about 3x Pro usage, Terminal paid indicators 16 hours a day, 10M daily tokens, 40 API requests a minute, 5 API keys, Claude Fable 5.1 senior review at $0.20, webhooks and request logs); Ultra (about 6x Pro usage, Terminal paid indicators all day, 20M daily tokens, 80 API requests a minute, 7 API keys, priority desk support); Enterprise (custom price, pooled usage, custom rate limits, team seats, custom API models, named account team: contact sales@jenvu.com or jenvu.com/contact). Every plan including Free includes live Gold, Bitcoin and EUR/USD charts, Ask Jenvu on the chart and all models on the Models page; chat requests cost $0.03.
- Access model: anyone can sign up at auth.jenvu.com (multiple accounts per person/device/network are allowed; each email belongs to only one account; email verification and security checks still apply). Every new account starts on the Free plan: $35 API credit every month (added every 30 days), 1 API key limited to 10 requests per minute (Pro 20, Elite 40, Ultra 80), and 2 hours a day of the Terminal's paid indicators. The 14-day free trial has ended for new sign-ups (trials already running finish normally). Any signed-in user can buy Pro, Elite or Ultra on the Payments page (plans are open to everyone and can be picked or upgraded anytime). Credit top-ups are no longer sold. The Founding Program (jenvu.com/founding) gives approved, ID-verified members their chosen plan (Pro or Elite) free for 30 days from the day the ID is verified, exactly like a paid plan.
- Terminal credits: with Terminal access, the chart, indicators, SMC tools (swings, BOS/CHoCH, FVGs, liquidity sweeps), drawing tools and news are included and use no credits. Fresh sweep, Swing price action and the Zone + FVG (supply/demand) strategy cost no credits but run for a set time each UTC day by plan: Free 2 hours, Pro 8, Elite 16, Ultra all day; time counts only while one of them is on and the Terminal is open, and when it is used up they lock and disappear until 00:00 UTC. Only AI features use credits: Ask AI / AI desk chat (including attached chart images), voice answers, and signal scans that return BUY or SELL (WAIT is free). AI replies cost only the tokens used at $3 per 1,000,000 tokens, with no fixed fee; failed requests are free. Charges are checked and deducted on the server, so they cannot be bypassed. Daily AI allowance: Free 1M, Pro 4M, Elite 10M, Ultra 20M tokens, also limited by balance ($3 = 1M tokens), resetting at 00:00 UTC. AI chat works on every plan, Free included, while there is credit. When the balance is too low, the AI stops answering but the chart keeps working; upgrade the plan at Dashboard → Payments. Balance and rate show under the Terminal chat box; per-reply costs are on Dashboard → Usage. Help article: support.jenvu.com/help/plans-credits-billing/terminal-credits.
- Access (current rules): sign-up is open and new accounts start on the Free plan ($35 API credit a month). The Founding Program has 50 seats a month; when they are full, seats reopen on the 1st of the next month at 00:00 UTC. After approval the member has 2 days to upload their ID. Their Founding plan (Terminal hours) starts only once the ID is verified; meanwhile they use the Terminal like any Free account. Founding members get only their plan's API credit (Founding Pro $40, Founding Elite $70; there is no separate $200 credit), added by the Jenvu team (funded from the admin panel) after the ID is verified, never automatically on approval. The Founding month lasts 30 days from the day the ID is verified and works like a paid plan (Terminal hours and API keys of that plan); after that the account returns to Free. To continue, the member buys a plan on the Payments page (Pro $69, Elite $139, Ultra $239), pays and submits the transaction ID; the plan starts once the team verifies the payment. Founding members pick a plan only after ID verification (the plan already given for the Founding month can't be bought again during that month); before verification members can open every dashboard page but can't take actions there (no API keys, no Chat) except on Billing and Payments; signed-out visitors see "Sign up" buttons; on Pricing (Free, Pro, Elite and Ultra, no Founding card) signed-out visitors see "Sign up free" on Free and "Buy now" on paid plans; signed in, the current plan shows "Current plan", Pro shows "You Got Free Trial" for a trial still running and other plans show "Buy now"; the header button reads "Sign up" signed out and "Try Jenvu" signed in, with an arrow that opens a menu. The Terminal is open on every plan, Free included.
- Business / B2B: companies, teams, brokers and partners can use "Contact sales" (in the site header, on jenvu.com/contact, or the Contact sales form inside Ask Jenvu) to tell the team what they need.
- Account rules: multiple accounts per person, device or network are allowed. Each email address can be linked to only one account; remove it from the old account before linking it elsewhere. Sign up or sign in at auth.jenvu.com/sign-in; approved Founding members who applied without an account receive a secure link by email to set their password.
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
  sections = out.map((text) => ({ text, words: new Set(tokenize(text)) }));
  return sections;
}

/**
 * Core facts + the best-matching sections for the latest question.
 * `maxChars` budgets the matched sections only: the core facts alone are
 * longer than the old shared budget, which silently dropped every article.
 */
export function getRelevantJenvuKnowledge(question: string, maxChars = 6000): string {
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
  let size = 0;
  for (const { s } of scored) {
    if (size + s.text.length > maxChars) continue;
    parts.push(s.text);
    size += s.text.length;
    if (parts.length > 6) break;
  }
  return parts.join("\n\n");
}
