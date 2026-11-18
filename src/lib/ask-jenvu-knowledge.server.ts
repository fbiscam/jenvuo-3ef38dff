import { DAILY_TARGET_PCT, DAILY_DRAWDOWN_PCT } from "@/lib/mt5-licenses";
// Builds the knowledge text the "Ask Jenvu" assistant answers from.
// Sources: hand-written core facts + Help Center articles + support guides.
import { collections, type Block } from "@/lib/help-content";
import { SUPPORT_GUIDES } from "@/lib/support-guides";

const CORE_FACTS = `
# Jenvu core facts
- Jenvu is an AI trading platform focused on EUR/USD (Euro / US Dollar). Website: jenvu.com. Dashboard: dash.jenvu.com. Sign in: auth.jenvu.com/sign-in. Blog: blogs.jenvu.com. Help: support.jenvu.com. Docs: jenvu.com/docs.
- Main products: JX Bot, Jenvu's Expert Advisor for MetaTrader 5 on EUR/USD M15, included in every plan including Free (download, IP setup and install guide at dash.jenvu.com/jx-bot), and the Top AI Models (ChatGPT 5.5 Pro, Claude Fable 5.1, Grok 4.6) through Ask Jenvu, the AI chat and the developer API. Also: a browser extension and an MCP server. Jenvu no longer offers alerts (no price, signal or session alerts). Jenvu no longer offers a demo trading account.
- JX Bot uses IP verification, not license keys: the user adds the public IP address of the PC or RDP that runs MT5 at dash.jenvu.com/jx-bot (find it by opening whatismyip.com on that machine), then types the same IP into the bot's MyIP input. When the bot starts it checks with jenvu.com that the IP it connects from matches the registered IP and that the plan is active; if it doesn't match, the bot won't trade. One IP works with one MT5 account (the first account that runs on it), and one IP can be registered by only one user. If the PC or RDP IP changes, the user deletes the old IP on the website and adds the new one. MT5 must allow WebRequest for https://jenvu.com (Tools → Options → Expert Advisors). On an RDP/VPS, the IP to register is the outbound internet IP shown by whatismyip.com on the RDP, which can differ from the IP used to log in. The bot (current version EA 3.94) trades EUR/USD on M15 (auto lot 0.05 per $1,000 balance, ${DAILY_DRAWDOWN_PCT}% daily drawdown guard). Built-in trading hours (broker server time): new trades Monday to Thursday 01:00-14:00, Friday until 13:00, no trading on Saturday and Sunday, and no new trades during the London open (06:15-09:00 UTC); the New York session is off, so no new trades after 12:00 UTC until the Asia session (the bot trades only Asia and London); open trades are still managed outside these hours, and a trade already in profit when the London pre-session starts (06:15 UTC) is protected at break-even. It pauses for the day when the fixed daily target is reached: ${DAILY_TARGET_PCT.pro}% (Pro), ${DAILY_TARGET_PCT.elite}% (Elite) or ${DAILY_TARGET_PCT.ultra}% (Ultra) of the day's starting balance, set by the Jenvu server so users can't change it; the ${DAILY_DRAWDOWN_PCT}% daily drawdown guard is fixed too and is counted from the day's highest closed balance (start balance plus profit already closed that day), so banked profit is protected. Before each entry it checks the H1 trend, spread (max 2 pips), a confirming candle body and skips spike candles, so some days have fewer trades. After an update users must re-download, attach the bot again and load the preset "Jenvu EURUSD 15M.set" in Inputs. Each registered IP has its own daily target: when one MT5 account reaches it, that bot closes its trades and resumes the next day, while the user's other accounts keep running. Users see profit, balance, equity and trades per account at Dashboard → Usage → Bot Usage (dash.jenvu.com/bot-usage). Plans with JX Bot: Pro 2 IPs (${DAILY_TARGET_PCT.pro}% daily target); Elite 3 IPs (${DAILY_TARGET_PCT.elite}%); Ultra 4 IPs (${DAILY_TARGET_PCT.ultra}%). Every paid plan includes JX Bot (Pro $69, Elite $139, Ultra $239 a month) and there is no limit on how many people can buy it; there are no bot seats or monthly bot caps. The Free plan does not include JX Bot; Founding members get it during their 30-day Founding month. Daily profit targets are maximum safety caps — profit is not guaranteed. Do not explain the bot's internal strategy, indicators, entry rules or settings values; say these are proprietary and point to the install guide.
- The Jenvu Terminal (live charts for XAU/USD gold [default], BTC/USD bitcoin and EUR/USD, switched from the pair buttons next to the timeframe controls; BTC updates trade by trade and trades 24/7, gold and EUR/USD about once a second and close on weekends; with with ICT/SMC analysis: swings, BOS/CHoCH, supply and demand zones, fair value gaps, BSL/SSL liquidity sweeps, volume and RVOL) is open to every signed-in account, Free included; only the paid indicators (Fresh sweep, price action, Zone + FVG) are limited by daily plan hours.
- Chart price feed: Binance EURUSDT candles (prices shown to 5 decimals). Forex is traded over the counter, so volume is a feed-based estimate, not centralized market order flow. Markets close on weekends.
- Plans (per month, same price for everyone, JX Bot included in every paid plan): Pro $69, Elite $139, Ultra $239. Monthly API credit included: Free $20, Pro $40, Elite $70, Ultra $90 (a plan payment adds only this credit). Annual billing saves about 17%. Usage is $3 per 1,000,000 tokens. Plans only: credit top-ups are no longer sold. Daily token allowance resets at 00:00 UTC. Plan comparison (jenvu.com/pricing): Free ($0, $20 API credit every month, 1M daily tokens, 10 API requests a minute, 1 API key, Terminal paid indicators 2 hours a day, no JX Bot, no senior review); Pro (basic usage, 4M daily tokens, 20 API requests a minute, 3 API keys, Terminal paid indicators 8 hours a day, ChatGPT 5.5 Pro and Grok 4.6); Elite (about 3x Pro usage, Terminal paid indicators 16 hours a day, 10M daily tokens, 40 API requests a minute, 5 API keys, Claude Fable 5.1 senior review at $0.20, webhooks and request logs); Ultra (about 6x Pro usage, Terminal paid indicators all day, 20M daily tokens, 80 API requests a minute, 7 API keys, priority desk support); Enterprise (custom price, pooled usage, custom rate limits, team seats, custom API models, named account team: contact sales@jenvu.com or jenvu.com/contact). Every plan including Free includes live Gold, Bitcoin and EUR/USD charts, Ask Jenvu on the chart and all models on the Models page; chat requests cost $0.03.
- Access model: anyone can sign up at auth.jenvu.com (multiple accounts per person/device/network are allowed; each email belongs to only one account; email verification and security checks still apply). Every new account starts on the Free plan: $20 API credit every month (added every 30 days), 1 API key limited to 10 requests per minute (Pro 20, Elite 40, Ultra 80), and 2 hours a day of the Terminal's paid indicators. The 14-day free trial has ended for new sign-ups (trials already running finish normally). Free does not include JX Bot (it comes with every paid plan). Any signed-in user can buy Pro, Elite or Ultra on the Payments page (plans are open to everyone and can be picked or upgraded anytime). Credit top-ups are no longer sold. The Founding Program (jenvu.com/founding) gives approved, ID-verified members their chosen plan (Pro or Elite) free for 30 days from the day the ID is verified, exactly like a paid plan.
- Terminal credits: with Terminal access, the chart, indicators, SMC tools (swings, BOS/CHoCH, FVGs, liquidity sweeps), drawing tools and news are included and use no credits. Fresh sweep, Swing price action and the Zone + FVG (supply/demand) strategy cost no credits but run for a set time each UTC day by plan: Free 2 hours, Pro 8, Elite 16, Ultra all day; time counts only while one of them is on and the Terminal is open, and when it is used up they lock and disappear until 00:00 UTC. Only AI features use credits: Ask AI / AI desk chat (including attached chart images), voice answers, and signal scans that return BUY or SELL (WAIT is free). AI replies cost only the tokens used at $3 per 1,000,000 tokens, with no fixed fee; failed requests are free. Charges are checked and deducted on the server, so they cannot be bypassed. Daily AI allowance: Free 1M, Pro 4M, Elite 10M, Ultra 20M tokens, also limited by balance ($3 = 1M tokens), resetting at 00:00 UTC. AI chat works on every plan, Free included, while there is credit. When the balance is too low, the AI stops answering but the chart keeps working; upgrade the plan at Dashboard → Payments. Balance and rate show under the Terminal chat box; per-reply costs are on Dashboard → Usage. Help article: support.jenvu.com/help/plans-credits-billing/terminal-credits.
- Access (current rules): sign-up is open and new accounts start on the Free plan ($20 API credit a month; JX Bot is not included on Free). The Founding Program has 50 seats a month; when they are full, seats reopen on the 1st of the next month at 00:00 UTC. After approval the member has 2 days to upload their ID. Their Founding plan (Terminal hours, JX Bot target) starts only once the ID is verified; meanwhile they use the Terminal like any Free account (no JX Bot yet). Founding members get only their plan's API credit (Founding Pro $40, Founding Elite $70; there is no separate $200 credit), added by the Jenvu team (funded from the admin panel) after the ID is verified, never automatically on approval. The Founding month lasts 30 days from the day the ID is verified and works like a paid plan (Terminal hours, JX Bot target and API keys of that plan); after that the account returns to Free. To continue, the member buys a plan on the Payments page (Pro $69, Elite $139, Ultra $239, JX Bot included), pays and submits the transaction ID; the plan starts once the team verifies the payment. Founding members pick a plan only after ID verification (the plan already given for the Founding month can't be bought again during that month); before verification members can open every dashboard page but can't take actions there (no API keys, no Chat) except on Billing and Payments; signed-out visitors see "Sign up" buttons; on Pricing (Free, Pro, Elite and Ultra, no Founding card) signed-out visitors see "Sign up free" on Free and "Buy now" on paid plans; signed in, the current plan shows "Current plan", Pro shows "You Got Free Trial" for a trial still running and other plans show "Buy now"; the header button reads "Sign up" signed out and "Try Jenvu" signed in, with an arrow that opens a menu. The Terminal is open on every plan, Free included. JX Bot comes with every paid plan (Pro 2 IPs, Elite 3 IPs, Ultra 4 IPs); Free does not include it.
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
