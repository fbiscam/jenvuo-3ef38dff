import { DAILY_TARGET_PCT, DAILY_DRAWDOWN_PCT, FREE_BOT, dailyTargetLabel, MT5_PLANS, TARGET_DISCLAIMER } from "@/lib/mt5-licenses";
import { FOUNDING_SEATS_PER_MONTH } from "@/lib/founding-seats";
import { showBuyBlocked } from "@/components/BuyNowButton";
import SiteHeader from "@/components/SiteHeader";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { Check, Minus, Plus } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import { useCurrentPlan } from "@/hooks/useCurrentPlan";
import { useUpgradeLock } from "@/hooks/useUpgradeLock";
import { useTrial } from "@/hooks/useTrial";
import { useServerFn } from "@tanstack/react-start";
import { getFoundingMembership } from "@/lib/mt5-licenses.functions";
import { purchaseGate, type PurchaseGate } from "@/lib/founding-bot";
import { ANNUAL_DISCOUNT_PCT, DEFAULT_BILLING_CYCLE, PLAN_API_CREDIT, TERMINAL_API_PRICE, annualFullPrice, annualPrice, currentPlanBasis, isPaidPlanId, planPrice } from "@/lib/plan-pricing";
import { PLAN_DAILY_TOKEN_LIMITS } from "@/lib/plan-entitlements";
import { PLAN_API_RPM } from "@/lib/plan-entitlements";
import { FREE_PLAN_API_KEYS, FREE_PLAN_CREDIT_USD, PLAN_API_KEYS, TERMINAL_DAILY_HOURS } from "@/lib/free-plan";
import { MODEL_CATALOG } from "@/lib/model-catalog";
import { JxBotLogo, NewsLogo, PlatformLogo, TerminalLogo } from "@/components/brand/ProductLogos";
import { RELEASES_PER_EVENT } from "@/lib/news-impact";
import openAiLogo from "@/assets/model-logos/openai.svg";
import grokLogo from "@/assets/model-logos/grok.svg";
import claudeLogo from "@/assets/model-logos/claude-color.svg";
import geminiLogo from "@/assets/model-logos/gemini-color.svg";

const SANS = "font-['Google_Sans_Flex','Google_Sans','Product_Sans','Poppins',system-ui,sans-serif]";

export const FAQ = [
  ["Is this financial advice?", "No. Jenvu is an analysis tool. Every setup is for educational purposes and you remain responsible for your own trades."],
  ["Is there a free plan?", `Yes. Anyone can sign up and use Jenvu on the Free plan. Multiple accounts are allowed; each email can belong to only one account. Free includes $${FREE_PLAN_CREDIT_USD} API credit every month, ${FREE_PLAN_API_KEYS} API key, ${TERMINAL_DAILY_HOURS.free} hours a day of the Terminal's paid indicators (Fresh sweep, price action, Zone + FVG). Free also includes JX Bot on ${FREE_BOT.licenses} IP with a ${dailyTargetLabel("free")} daily profit stop and live Bot Usage updates; profit is not guaranteed. When the day's Terminal time is used up the indicators lock until 00:00 UTC.`],
  ["What do the plans include?", `Every plan includes the Terminal's paid indicators for a set time each day, the Top AI Models and monthly API credit: Free $0 with $${FREE_PLAN_CREDIT_USD} credit and ${TERMINAL_DAILY_HOURS.free} hours a day; Pro $${PLAN_API_CREDIT.pro} credit and ${TERMINAL_DAILY_HOURS.pro} hours; Elite $${PLAN_API_CREDIT.elite} credit and ${TERMINAL_DAILY_HOURS.elite} hours; Ultra $${PLAN_API_CREDIT.ultra} credit, all day. Every plan also includes JX Bot (Free: ${FREE_BOT.licenses} IP, ${dailyTargetLabel("free")} daily target): Pro $${TERMINAL_API_PRICE.pro}, Elite $${TERMINAL_API_PRICE.elite}, Ultra $${TERMINAL_API_PRICE.ultra} a month. Plans only: credit top-ups are not sold.`],
  ["Who gets JX Bot?", `Every account gets JX Bot, with no limit on how many people can join. Free includes ${FREE_BOT.licenses} IP, a fixed ${dailyTargetLabel("free")} daily profit stop and live Bot Usage updates. Targets: Pro ${DAILY_TARGET_PCT.pro}% on ${MT5_PLANS.pro.licenses} IPs, Elite ${DAILY_TARGET_PCT.elite}% on ${MT5_PLANS.elite.licenses} IPs and Ultra ${DAILY_TARGET_PCT.ultra}% on ${MT5_PLANS.ultra.licenses} IPs. ${TARGET_DISCLAIMER} Founding members (${FOUNDING_SEATS_PER_MONTH} seats a month) also get JX Bot during their 30-day Founding month.`],
  ["When does JX Bot trade?", `New trades open Monday to Thursday between 01:00 and 14:00 broker time and on Friday until 13:00. It trades only the Asia and London sessions: it skips the London open (06:15–09:00 UTC), the whole New York session (no new trades after 12:00 UTC) and weekends. It stops for the day at ${dailyTargetLabel("free")} profit on Free, or a fixed daily target of ${DAILY_TARGET_PCT.pro}% (Pro), ${DAILY_TARGET_PCT.elite}% (Elite) or ${DAILY_TARGET_PCT.ultra}% (Ultra) of the day's starting balance, or at the fixed ${DAILY_DRAWDOWN_PCT}% daily drawdown guard (counted from the day's highest closed balance, so profit already closed today is protected).`],
  ["Who can use the Terminal?", `Every signed-in user can open the Terminal. Its paid indicators run for a set time each UTC day by plan: Free ${TERMINAL_DAILY_HOURS.free} hours, Pro ${TERMINAL_DAILY_HOURS.pro}, Elite ${TERMINAL_DAILY_HOURS.elite} and Ultra all day. Time counts only while one of them is switched on and the Terminal is open; when it is used up they lock and disappear until 00:00 UTC.`],
  ["Is News Trading free?", `Yes. The News Trading page is free on every plan, including Free. It counts down to the next US high-impact release (NFP, CPI, FOMC, PCE, PPI, GDP) and shows how Gold moved after the same kind of result in the last ${RELEASES_PER_EVENT} real releases. It is a read of past reactions, not a promise of the next move.`],
  ["Can I cancel anytime?", "Yes. Plans are month-to-month with no lock-in. You keep access until the end of the period you already paid for."],
  ["What markets are covered?", "The Terminal covers Gold (XAU/USD), Bitcoin (BTC/USD) and Euro (EUR/USD). JX Bot trades EUR/USD only."],
];

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Jenvu Pricing — Free, Pro, Elite and Ultra Plans" },
      { name: "description", content: "Jenvu pricing: Free includes $35 monthly API credit and JX Bot on 1 IP with a $10 daily target. Pro $69, Elite $139 and Ultra $239 include JX Bot too." },
      { property: "og:title", content: "Jenvu pricing" },
      { property: "og:description", content: "Compare Jenvu Free, Pro, Elite and Ultra. JX Bot is included on every plan; Free has 1 IP and a $10 daily target, not guaranteed profit." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:url", content: "https://jenvu.com/pricing" },
    ],
    links: [{ rel: "canonical", href: "https://jenvu.com/pricing" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
        }),
      },
    ],
  }),
  component: PricingPage,
});

type PlanKey = "pro" | "elite" | "ultra";
type CardKey = "free" | PlanKey;
type Mark = boolean | string;
/** One comparison row: values for Free, Pro, Elite, Ultra and Enterprise. */
type Row = { f: string; v: [Mark, Mark, Mark, Mark, Mark]; logo?: string; invert?: boolean };
type GroupIcon = "terminal" | "bot" | "news" | "platform" | "models" | null;
type Group = { title: string; icon: GroupIcon; rows: Row[]; bot?: boolean };

const TOKENS = (id: string) => `${PLAN_DAILY_TOKEN_LIMITS[id] / 1_000_000}M`;
const MODEL_COUNT = MODEL_CATALOG.length;

/** News Trading bullets on every plan card: the page is free for every signed-in account. */
const NEWS_ITEMS = ["Free on every plan", "Next US news countdown", "Gold UP / DOWN read"];

const K = (n: number) => `${n} key${n > 1 ? "s" : ""}`;
const H = (h: number) => (h >= 24 ? "All day" : `${h}h a day`);
const ALL: [Mark, Mark, Mark, Mark, Mark] = [true, true, true, true, true];
const PAID: [Mark, Mark, Mark, Mark, Mark] = [false, true, true, true, true];
const ELITE_UP: [Mark, Mark, Mark, Mark, Mark] = [false, false, true, true, true];

function buildGroups(): ReadonlyArray<Group> {
  // Every plan includes JX Bot; Free uses the server's fixed-dollar target.
  const BOT: [Mark, Mark, Mark, Mark, Mark] = ALL;
  const botVal = (v: string): Mark => v;
  return [
  {
    title: "Usage",
    icon: null,
    rows: [
      { f: "Usage", v: ["Limited", "Basic", "3x Pro", "6x Pro", "Pooled"] },
      { f: "Monthly API credit", v: [`$${FREE_PLAN_CREDIT_USD}`, `$${PLAN_API_CREDIT.pro}`, `$${PLAN_API_CREDIT.elite}`, `$${PLAN_API_CREDIT.ultra}`, "Custom"] },
      { f: "Daily token limit", v: [TOKENS("free"), TOKENS("pro"), TOKENS("elite"), TOKENS("ultra"), "Custom"] },
      { f: "Daily tokens reset at 00:00 UTC", v: ALL },
      { f: "Balance-based quota ($3 = 1M tokens)", v: ALL },
      { f: "API requests per minute", v: [`${PLAN_API_RPM.free} RPM`, `${PLAN_API_RPM.pro} RPM`, `${PLAN_API_RPM.elite} RPM`, `${PLAN_API_RPM.ultra} RPM`, "Custom"] },
      { f: "Usage page in the dashboard", v: ALL },
    ],
  },
  {
    title: "Top AI Models",
    icon: "models",
    rows: [
      { f: "ChatGPT 5.5 Pro primary analysis", logo: openAiLogo, invert: true, v: ALL },
      { f: "Grok 4.6 chat", logo: grokLogo, invert: true, v: ALL },
      { f: "Claude Fable 5.1 senior review", logo: claudeLogo, v: ELITE_UP },
      { f: `${MODEL_COUNT} models (Claude, Gemini, Open AI )`, logo: geminiLogo, v: ALL },
      { f: "Dashboard Chat playground", v: ALL },
      { f: "Images, documents and file uploads in Chat", v: ALL },
      { f: "Live web and Google Maps data in Chat", v: ALL },
      { f: "Chat / primary request", v: ["$0.03", "$0.03", "$0.03", "$0.03", "Volume"] },
      { f: "Senior-reviewed analysis", v: [false, false, "$0.20", "$0.20", "Volume"] },
    ],
  },
  {
    title: "Jenvu Terminal",
    icon: "terminal",
    rows: [
      { f: "Live Gold, Bitcoin and EUR/USD charts", v: ALL },
      { f: "TradingView-style candlesticks, all timeframes", v: ALL },
      { f: "Indicators ( Fresh sweep, price action, Zone )", v: [H(TERMINAL_DAILY_HOURS.free), H(TERMINAL_DAILY_HOURS.pro), H(TERMINAL_DAILY_HOURS.elite), H(TERMINAL_DAILY_HOURS.ultra), "All day"] },
      { f: "Fresh liquidity sweep", v: ALL },
      { f: "Swing price action verdicts", v: ALL },
      { f: "Zone + FVG with non-overlapping BSL / SSL", v: ALL },
      { f: "Time left shown on the chart", v: ALL },
      { f: "Ask Jenvu on the chart", v: ALL },
    ],
  },
  {
    title: "JX Bot (MT5)",
    icon: "bot",
    bot: true,
    rows: [
      { f: "Included with every plan", v: BOT },
      { f: "IPs (PC or RDP)", v: [String(FREE_BOT.licenses), botVal(String(MT5_PLANS.pro.licenses)), botVal(String(MT5_PLANS.elite.licenses)), botVal(String(MT5_PLANS.ultra.licenses)), "Custom"] },
      { f: "Daily profit target per IP (not guaranteed)", v: [dailyTargetLabel("free"), botVal(`${DAILY_TARGET_PCT.pro}%`), botVal(`${DAILY_TARGET_PCT.elite}%`), botVal(`${DAILY_TARGET_PCT.ultra}%`), "Custom"] },
      { f: `Auto-stop at target or ${DAILY_DRAWDOWN_PCT}% drawdown`, v: BOT },
      { f: "IP sign-in, no license key", v: BOT },
      { f: "Live Bot Usage updates & ON / OFF log", v: BOT },
      { f: "Safe hours: London open block, New York off", v: BOT },
      { f: "Download, presets & updates", v: BOT },
    ],
  },
  {
    title: "News Trading",
    icon: "news",
    rows: [
      { f: "Free on every plan, no extra cost", v: ALL },
      { f: "NFP, CPI, FOMC, PCE, PPI and GDP releases", v: ALL },
      { f: "Live countdown to next US high-impact release", v: ALL },
      { f: "Last-hour pre-news banner", v: ALL },
      { f: "Gold UP / DOWN if the number beats or misses", v: ALL },
      { f: `Confidence from the last ${RELEASES_PER_EVENT} real releases`, v: ALL },
      { f: "Measured 5-minute price reactions", v: ALL },
    ],
  },
  {
    title: "Platform & API",
    icon: "platform",
    rows: [
      { f: "Active API keys", v: [K(PLAN_API_KEYS.free), K(PLAN_API_KEYS.pro), K(PLAN_API_KEYS.elite), K(PLAN_API_KEYS.ultra), "Custom"] },
      { f: "OpenAI-compatible API endpoint", v: ALL },
      { f: "MCP server for AI assistants", v: ALL },
      { f: "Key rotation and instant revoke", v: ALL },
      { f: "API access & webhooks", v: ELITE_UP },
      { f: "API usage controls & request logs", v: ELITE_UP },
      { f: "Invoices and billing history", v: ALL },
    ],
  },
  {
    title: "Security",
    icon: null,
    rows: [
      { f: "Two-factor sign-in (authenticator app)", v: ALL },
      { f: "New sign-in alerts", v: ALL },
      { f: "One account per person, bot protection", v: ALL },
    ],
  },
  {
    title: "Support",
    icon: null,
    rows: [
      { f: "Help center, docs & Ask Jenvu", v: ALL },
      { f: "Email support", v: ALL },
      { f: "Priority desk support", v: [false, false, false, true, true] },
      { f: "Named account team", v: [false, false, false, false, true] },
    ],
  },
  ];
}


const CUSTOM: ReadonlyArray<[string, string]> = [
  ["Custom rate limits", "Tailored throughput for your workload."],
  ["Dedicated support", "Named account team and onboarding."],
  ["Team seats & roles", "Give your desk its own access."],
  ["Custom API models", "Pick the models your coding and analysis tasks need."],
  ["Volume pricing", "Discounts at scale."],
];

function GroupMark({ icon }: { icon: GroupIcon }) {
  if (icon === "terminal") return <TerminalLogo className="h-[18px] w-[18px]" />;
  if (icon === "bot") return <JxBotLogo className="h-[18px] w-[18px]" />;
  if (icon === "news") return <NewsLogo className="h-[18px] w-[18px]" />;
  if (icon === "platform") return <PlatformLogo className="h-[18px] w-[18px]" />;
  if (icon === "models") {
    return (
      <span className="flex -space-x-1.5" aria-hidden>
        {[openAiLogo, grokLogo, claudeLogo].map((src, i) => (
          <span key={src} className="flex h-5 w-5 items-center justify-center rounded-full border border-gc-line bg-background">
            <img src={src} alt="" className={`h-3 w-3 ${i < 2 ? "dark:invert" : ""}`} />
          </span>
        ))}
      </span>
    );
  }
  return null;
}

type CompareCol = { key: string; label: string; price: React.ReactNode; ctaFor: (basis: MobileBasis) => React.ReactNode };

/** Mobile compare columns: the left one is always monthly, the right one always yearly. */
const MOBILE_BASES = ["monthly", "annual"] as const;
type MobileBasis = (typeof MOBILE_BASES)[number];

/** Mobile-only compare table: two plan dropdowns side by side (x.ai pricing style). */
function MobileCompare({ cols, groups, currentPlan, priceOf }: { cols: CompareCol[]; groups: ReadonlyArray<Group>; currentPlan: string | null | undefined; priceOf: (key: string, basis: MobileBasis) => React.ReactNode }) {
  const [a, setA] = React.useState(1);
  const [b, setB] = React.useState(2);
  const picks = [a, b];
  const cell = (v: Mark) =>
    v === true ? <Check className="mx-auto h-3.5 w-3.5 text-foreground" aria-label="Included" />
    : v === false ? <Minus className="mx-auto h-3.5 w-3.5 text-gc-ink-muted/50" aria-label="Not included" />
    : <span className="text-[12px] text-ink-strong">{v}</span>;
  return (
    <div className="mt-10 md:hidden">
      <div className="sticky top-[60px] z-20 grid grid-cols-[1fr_92px_92px] items-end gap-2 border-b border-gc-line bg-background pb-3 pt-3">
        <span className="pb-1 text-[12px] text-gc-ink-muted">Feature</span>
        {picks.map((idx, n) => {
          const c = cols[idx];
          const basis = MOBILE_BASES[n];
          return (
            <div key={n} className="flex flex-col items-center gap-1 text-center">
              <span className={`text-[10px] font-medium uppercase tracking-wide ${basis === "annual" ? "text-foreground" : "text-gc-ink-muted"}`}>
                {basis === "annual" ? "Yearly" : "Monthly"}
              </span>
              <select
                aria-label={basis === "annual" ? "Yearly plan" : "Monthly plan"}
                value={idx}
                onChange={(e) => (n === 0 ? setA : setB)(Number(e.target.value))}
                className="h-9 w-full rounded-lg border border-gc-line bg-background px-2 text-[13px] text-gc-ink"
              >
                {cols.map((o, i) => <option key={o.key} value={i}>{o.label}{currentPlan === o.key ? " ·" : ""}</option>)}
              </select>
              <span className="whitespace-nowrap text-[9.5px] text-gc-ink-muted">{c ? priceOf(c.key, basis) : null}</span>
              <div className="w-full [&_a]:w-full [&_button]:w-full [&_a]:text-[11px] [&_button]:text-[11px]">{c ? c.ctaFor(basis) : null}</div>
            </div>
          );
        })}
      </div>
      {groups.map((g) => (
        <div key={g.title}>
          <div className="flex items-center gap-2 border-b border-gc-line pb-3 pt-7 text-[13px] font-medium text-gc-ink">
            <GroupMark icon={g.icon} />{g.title}
          </div>
          {g.rows.map((row) => (
            <div key={row.f} className="grid grid-cols-[1fr_92px_92px] items-center gap-2 border-b border-gc-line py-3">
              <span className="text-[12.5px] text-ink-strong">{row.f}</span>
              <span className="text-center">{cell(row.v[a] as Mark)}</span>
              <span className="text-center">{cell(row.v[b] as Mark)}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function PricingPage() {
  const currentPlan = useCurrentPlan();
  const upgradeLock = useUpgradeLock();
  const trial = useTrial();
  const signedOut = currentPlan === null;
  // Yearly is the default so the page opens on the discounted price; Monthly stays one tap away.
  const [billing, setBilling] = React.useState<"monthly" | "annual">(DEFAULT_BILLING_CYCLE);
  // Plans are open to everyone; approved Founding members still waiting on ID verify first.
  const membershipFn = useServerFn(getFoundingMembership);
  const [buyGate, setBuyGate] = React.useState<PurchaseGate>({ canBuy: true, reason: "ok" });
  const navigate = useNavigate();
  React.useEffect(() => {
    if (signedOut) { setBuyGate({ canBuy: true, reason: "ok" }); return; }
    let alive = true;
    membershipFn()
      .then((r) => {
        if (!alive) return;
        setBuyGate(purchaseGate({ isAdmin: !!r.isAdmin, member: !!r.member, verified: !!r.verified, kind: "plan" }));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [signedOut, membershipFn]);


  const annual = billing === "annual";
  const money = (n: number) => `$${n.toLocaleString("en-US")}`;
  const priceFor = (k: PlanKey) => (annual ? annualPrice(k) : planPrice(k));
  const suffix = billing === "annual" ? "/ year" : "/ month";
  const [open, setOpen] = React.useState<number | null>(null);

  const plans: Array<{ key: CardKey; name: string; description: string; big: string; bigLabel: string; features: string[]; ips: number }> = [
    { key: "free", name: "Free", description: "Try the Terminal, API & JX Bot", big: `$${FREE_PLAN_CREDIT_USD}`, bigLabel: "API credit every month", ips: FREE_BOT.licenses, features: [`Terminal indicators ${TERMINAL_DAILY_HOURS.free}h a day`, "ChatGPT 5.5 Pro and Grok 4.6", `${TOKENS("free")} daily tokens`, `${FREE_PLAN_API_KEYS} API key`] },
    { key: "pro", name: "Pro", description: "Terminal & AI for everyday trading", big: `$${PLAN_API_CREDIT.pro}`, bigLabel: "API credit every month", ips: MT5_PLANS.pro.licenses, features: [`Terminal indicators ${TERMINAL_DAILY_HOURS.pro}h a day`, "ChatGPT 5.5 Pro and Grok 4.6", `${TOKENS("pro")} daily tokens`, `${PLAN_API_KEYS.pro} API keys`] },
    { key: "elite", name: "Elite", description: "More AI usage with senior review.", big: `$${PLAN_API_CREDIT.elite}`, bigLabel: "API credit & senior review", ips: MT5_PLANS.elite.licenses, features: [`Terminal indicators ${TERMINAL_DAILY_HOURS.elite}h a day`, "Claude Fable 5.1 senior review", `${TOKENS("elite")} daily tokens`, `${PLAN_API_KEYS.elite} API keys, webhooks & logs`] },
    { key: "ultra", name: "Ultra", description: "Maximum limits & priority support", big: `$${PLAN_API_CREDIT.ultra}`, bigLabel: "API credit & priority desk", ips: MT5_PLANS.ultra.licenses, features: ["Terminal indicators all day", `${TOKENS("ultra")} daily tokens`, `${PLAN_API_KEYS.ultra} API keys`, "Priority desk support"] },
  ];

  const bigBase = "flex h-10 w-full items-center justify-center rounded-full text-[15px] font-medium transition";
  const bigStyle = (solid: boolean) =>
    solid ? `${bigBase} bg-foreground text-background hover:opacity-90` : `${bigBase} border border-gc-line bg-background text-foreground hover:bg-gc-pill`;
  // Compare-table pills (xAI style): small grey pill, the highlighted plan in black.
  const smallBase = "flex h-[30px] w-full items-center justify-center whitespace-nowrap rounded-full px-3 text-[13px] font-medium transition";
  const smallStyle = (solid: boolean) =>
    solid ? `${smallBase} bg-foreground text-background hover:opacity-90` : `${smallBase} bg-gc-pill text-foreground hover:bg-gc-line`;
  const name = (k: PlanKey) => k[0].toUpperCase() + k.slice(1);
  // The plan the account already holds: a plain white chip, never a green CTA.
  const currentStyle = (small: boolean) => `${small ? smallBase : bigBase} border border-gc-line bg-background text-foreground`;

  // Free plan: every sign-up starts on it. Free costs nothing on either basis, so it stays
  // "Current plan" in both mobile columns.
  const freeCta = (small = false, basis: MobileBasis = "monthly") => {
    const btnBase = small ? smallBase : bigBase;
    const quiet = small ? "bg-gc-pill text-gc-ink-muted" : "border border-gc-line bg-background text-gc-ink-muted";
    if (signedOut) {
      return <Link to="/auth" search={{ mode: "signup" } as never} className={small ? smallStyle(false) : bigStyle(false)}>Sign up free</Link>;
    }
    const basisOfCurrent = currentPlanBasis(currentPlan);
    const onThisBasis = basisOfCurrent === "both" || basisOfCurrent === basis;
    const onFree = (currentPlan === "free" || currentPlan === null) && !trial.active && onThisBasis;
    return <div className={`${btnBase} ${onFree ? currentStyle(small) : quiet}`}>{onFree ? "Current plan" : "Included"}</div>;
  };

  const planCta = (key: PlanKey, small = false, basis: MobileBasis = "monthly") => {
    const solid = key === "elite";
    const btnBase = small ? smallBase : bigBase;
    const btnStyle = small ? smallStyle : bigStyle;
    const trialPro = trial.active && key === "pro";
    // "Current plan" only belongs to the basis the account is actually billed on (monthly: the
    // Payments page charges the monthly price), so the yearly column never repeats it.
    const basisOfCurrent = currentPlanBasis(currentPlan);
    const onThisBasis = basisOfCurrent === "both" || basisOfCurrent === basis;
    const isCurrent = currentPlan === key && !trialPro && onThisBasis;
    const disabled = currentPlan !== null && !isCurrent && !trialPro && upgradeLock.locked;
    // Pro during a running free trial shows the trial as the user's status.
    const quiet = small ? "bg-gc-pill text-gc-ink-muted" : "border border-gc-line bg-background text-gc-ink-muted";
    if (trialPro) return <div className={`${btnBase} ${quiet}`}>{small ? "On trial" : "You Got Free Trial"}</div>;
    if (isCurrent) return <div className={currentStyle(small)}>Current plan</div>;
    // The plan the account holds, shown under the other billing basis.
    if (currentPlan === key && !trialPro) return <div className={`${btnBase} ${quiet}`}>Monthly plan</div>;
    if (disabled) return <button type="button" disabled className={`${btnBase} cursor-not-allowed ${quiet}`}>Locked in trial</button>;
    if (!signedOut && !buyGate.canBuy) {
      return (
        <button type="button" onClick={() => showBuyBlocked(buyGate.reason === "ok" ? "verify_id" : buyGate.reason, (t) => navigate({ to: t }))} className={btnStyle(solid)}>
          {small ? `Get ${name(key)}` : "Buy now"}
        </button>
      );
    }
    // Signed out: paid plans say Buy now and send the visitor to sign up first.
    if (signedOut) {
      return (
        <Link to="/auth" search={{ mode: "signup" } as never} className={btnStyle(solid)}>
          {small ? `Get ${name(key)}` : "Buy now"}
        </Link>
      );
    }
    return (
      <Link to="/dashboard/pay" className={btnStyle(solid)}>
        {currentPlan !== null && currentPlan !== "free" ? "Upgrade" : small ? `Get ${name(key)}` : "Buy now"}
      </Link>
    );
  };

  // One price row per plan and billing basis: used by the desktop table and both mobile columns.
  // The mobile columns pass badge=false so the yearly cell stays plain.
  const colPrice = (k: string, basis: "monthly" | "annual", badge = true): React.ReactNode => {
    if (k === "free") return basis === "annual" ? "$0/year" : "$0/month";
    if (k === "enterprise") return "Custom";
    if (!isPaidPlanId(k)) return "";
    return basis === "annual"
      ? <><span className="line-through">{money(annualFullPrice(k))}</span> {money(annualPrice(k))}/year {badge && <span className="ml-0.5 rounded-full bg-destructive px-1.5 py-px text-[10px] font-semibold text-destructive-foreground">−{ANNUAL_DISCOUNT_PCT}%</span>}</>
      : `${money(planPrice(k))}/month`;
  };

  const groups = buildGroups();
  const cols: CompareCol[] = [
                  { key: "free", label: "Free", price: colPrice("free", billing), ctaFor: (b: MobileBasis) => freeCta(true, b) } as CompareCol,
                  ...(["pro", "elite", "ultra"] as const).map((k) => ({
                    key: k,
                    label: name(k),
                    price: colPrice(k, billing),
                    ctaFor: (b: MobileBasis) => planCta(k, true, b),
                  })),
                  { key: "enterprise", label: "Enterprise", price: "Custom", ctaFor: () => <Link to="/contact" className={smallStyle(false)}>Contact Sales</Link> },
                ];

  return (
    <div className={`public-cloudflare min-h-dvh w-full bg-background text-gc-ink ${SANS} antialiased`}>
      <SiteHeader />

      {/* HEADER */}
      <section className="mx-auto max-w-[900px] px-5 pb-10 pt-16 text-center sm:px-8 sm:pt-24">
        <div className="mx-auto flex items-center justify-center gap-3.5" aria-label="Terminal, JX Bot, News Trading and Platform">
          {([["Terminal", TerminalLogo], ["JX Bot", JxBotLogo], ["News Trading", NewsLogo], ["Platform", PlatformLogo]] as const).map(([label, Logo]) => (
            <Logo key={label} className="h-[22px] w-[22px] text-foreground" />
          ))}
        </div>
        <h1 className="mt-4 text-[2.8rem] font-medium leading-[1.05] tracking-tight sm:text-[4rem]">Pricing</h1>
        <p className="mx-auto mt-4 max-w-[600px] text-[17px] leading-[1.6] text-gc-ink-muted">One subscription. Access to everything.</p>
        <div className="mx-auto mt-8 inline-flex items-center rounded-full bg-gc-pill p-1" role="group" aria-label="Billing cycle">
          {(["monthly", "annual"] as const).map((b) => (
            <button
              key={b}
              type="button"
              aria-pressed={billing === b}
              onClick={() => setBilling(b)}
              className={`rounded-full px-5 py-2 text-[14px] font-medium transition ${billing === b ? "bg-background text-foreground shadow-sm" : "text-gc-ink-muted hover:text-gc-ink"}`}
            >
              {b === "monthly" ? "Monthly" : (<>Yearly <span className="ml-1.5 rounded-full bg-destructive px-2 py-0.5 text-[11px] font-semibold text-destructive-foreground">Save {ANNUAL_DISCOUNT_PCT}%</span></>)}
            </button>
          ))}
        </div>
      </section>


      {/* PLAN CARDS */}
      <section id="plans" className="scroll-mt-24 mx-auto max-w-7xl px-5 pb-16 sm:px-8">
        <div className="mx-auto grid max-w-[1240px] gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => (
            <article
              key={plan.key}
              className="relative flex flex-col rounded-[20px] bg-gc-surface p-6 sm:p-7"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[15px] font-medium">{plan.name}</h3>
                {plan.key === "elite" && (
                  <span className="rounded-full bg-background px-2.5 py-0.5 text-[11px] font-medium text-gc-ink-muted">Most popular</span>
                )}
              </div>
              <div className="mt-3 flex min-h-[20px] items-center gap-2">
                {annual && plan.key !== "free" && (
                  <>
                    <span className="text-[14px] text-gc-ink-muted line-through">{money(annualFullPrice(plan.key))}</span>
                    <span className="rounded-full bg-destructive px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-destructive-foreground">Save {ANNUAL_DISCOUNT_PCT}%</span>
                  </>
                )}
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-[40px] font-medium leading-none tracking-tight">{plan.key === "free" ? "$0" : money(priceFor(plan.key))}</span>
                <span className="text-[13px] text-gc-ink-muted">{suffix}</span>
              </div>
              <p className="mt-1.5 min-h-[18px] text-[12px] leading-[18px] text-gc-ink-muted">
                {plan.key === "free"
                  ? "Free forever, start with your email"
                  : "Terminal, API & JX Bot"}
              </p>
              <div className="mt-4">{plan.key === "free" ? freeCta() : planCta(plan.key)}</div>
              <p className="mt-6 min-h-[20px] text-[13px] text-gc-ink-muted">
                {plan.key === "pro" ? "Everything in Free, and:" : plan.key === "elite" ? "Everything in Pro, and:" : plan.key === "ultra" ? "Everything in Elite, and:" : plan.description}
              </p>
              <Summary big={plan.big} label={plan.bigLabel} />
              <FeatureList title="Platform & AI" items={plan.features} />
              <FeatureList
                title="JX Bot (MT5)"
                items={[`${plan.ips} IP${plan.ips > 1 ? "s" : ""} included`, `${dailyTargetLabel(plan.key)} daily target per IP`, `${DAILY_DRAWDOWN_PCT}% drawdown guard`, "Auto-stop at daily target", "Live Bot Usage updates"]}
              />
              <FeatureList title="News Trading" items={NEWS_ITEMS} />
            </article>
          ))}
        </div>
        <p className="mt-5 text-center text-[13px] text-gc-ink-muted">
          Prices in USD. Live market data is free on every plan. Terminal hours reset at 00:00 UTC. {TARGET_DISCLAIMER}
        </p>
      </section>


      {/* COMPARE */}
      <section id="compare" className="scroll-mt-24 mx-auto max-w-7xl px-5 py-14 sm:px-8">
        <h2 className="text-center text-[30px] font-medium leading-tight tracking-tight sm:text-[40px]">Compare features across plans</h2>
        <MobileCompare cols={cols} groups={groups} currentPlan={currentPlan} priceOf={(k, basis) => colPrice(k, basis, false)} />
        <div className="mt-12 hidden overflow-x-auto md:block lg:overflow-visible">
          <table className="w-full min-w-[860px] border-collapse text-[14px]">
            <thead>
              <tr className="border-b border-gc-line">
                <th className="w-[28%] bg-background pb-5 pt-4 text-left align-bottom text-[14px] font-normal text-gc-ink-muted lg:sticky lg:top-[60px] lg:z-20">Feature</th>
                {cols.map((c) => (
                  <th key={c.key} className="bg-background px-1.5 pb-5 pt-4 text-center align-bottom font-normal lg:sticky lg:top-[60px] lg:z-20">
                    <div className="text-[15px] font-medium text-gc-ink">
                      {c.label}
                      {currentPlan === c.key && <span className="ml-1 text-[11px] font-normal text-gc-ink-muted">· current</span>}
                    </div>
                    <div className="mt-1 text-[12.5px] text-gc-ink-muted">{c.price}</div>
                    <div className="mt-3">{c.ctaFor("monthly")}</div>
                  </th>
                ))}
              </tr>
            </thead>
            {groups.map((g) => (
              <tbody key={g.title}>
                <tr className="border-b border-gc-line">
                  <th colSpan={6} className="pb-4 pt-9 text-left text-[15px] font-medium text-gc-ink">
                    <span className="flex items-center gap-2.5">
                      <GroupMark icon={g.icon} />
                      {g.title}
                    </span>
                  </th>
                </tr>
                {g.rows.map((row) => (
                  <tr key={row.f} className="border-b border-gc-line">
                    <td className="py-4 pr-4 text-ink-strong">
                      <span className="flex items-center gap-2.5">
                        {row.logo && <img src={row.logo} alt="" className={`h-4 w-4 shrink-0 ${row.invert ? "dark:invert" : ""}`} />}
                        {row.f}
                      </span>
                    </td>
                    {row.v.map((v, i) => (
                      <td key={i} className="px-1.5 py-4 text-center">
                        {v === true ? (
                          <Check className="mx-auto h-4 w-4 text-foreground" aria-label="Included" />
                        ) : v === false ? (
                          <Minus className="mx-auto h-4 w-4 text-gc-ink-muted/50" aria-label="Not included" />
                        ) : (
                          <span className="text-ink-strong">{v}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      </section>

      {/* CUSTOM PLAN */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid gap-10 border-y border-gc-line py-20 md:grid-cols-2 md:items-center md:gap-14 md:py-24">
          <div>
            <p className="text-[14px] text-gc-ink-muted">Enterprise</p>
            <h2 className="mt-3 text-[30px] font-medium leading-tight tracking-tight sm:text-[36px]">Need a custom plan?</h2>
            <p className="mt-4 max-w-[460px] text-[16px] leading-[1.65] text-gc-ink">
              Talk to our sales team about custom rate limits, team seats, API models and volume pricing for your trading desk.
            </p>
            <Link to="/contact" className="mt-8 inline-flex h-10 items-center justify-center rounded-full bg-foreground px-5 text-[15px] font-medium text-background transition hover:opacity-90">
              Contact Sales
            </Link>
            <p className="mt-4 text-[14px] text-gc-ink-muted">
              Or email <a href="mailto:sales@jenvu.com" className="text-gc-ink underline underline-offset-2">sales@jenvu.com</a>
            </p>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2">
            {CUSTOM.map(([t, d]) => (
              <li key={t} className="rounded-xl bg-gc-surface px-5 py-5">
                <p className="flex items-center gap-2.5 text-[15px] text-gc-ink">
                  <Check className="h-3.5 w-3.5 shrink-0 text-gc-ink-muted" aria-hidden />
                  {t}
                </p>
                <p className="mt-1.5 pl-6 text-[13px] text-gc-ink-muted">{d}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto grid max-w-7xl gap-10 px-5 pb-24 pt-14 sm:px-8 md:grid-cols-[1fr_1.6fr] md:gap-14">
        <h2 className="text-[30px] font-medium leading-tight tracking-tight sm:text-[40px]">Frequently asked questions</h2>
        <div className="border-t border-gc-line">
          {FAQ.map(([q, a], i) => {
            const isOpen = open === i;
            return (
              <div key={q} className="border-b border-gc-line">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 py-5 text-left text-[16px] font-medium sm:text-[17px]"
                >
                  {q}
                  <Plus className={`h-5 w-5 shrink-0 text-gc-ink-muted transition-transform ${isOpen ? "rotate-45" : ""}`} />
                </button>
                {isOpen && <p className="pb-6 pr-8 text-[15px] leading-relaxed text-gc-ink-muted">{a}</p>}
              </div>
            );
          })}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function Summary({ big, label }: { big: string; label: string }) {
  return (
    <div className="mt-2">
      <p className="text-[24px] font-medium leading-tight tracking-tight">{big}</p>
      <p className="mt-0.5 text-[13px] text-gc-ink">{label}</p>
    </div>
  );
}

function FeatureList({ title, items, muted }: { title: string; items: string[]; muted?: boolean }) {
  return (
    <div className="mt-6">
      <p className="flex items-center gap-2 border-b border-gc-line pb-2.5 text-[13px] text-gc-ink-muted">
        {title.startsWith("JX") ? <JxBotLogo className="h-3.5 w-3.5" /> : title.startsWith("News") ? <NewsLogo className="h-3.5 w-3.5" /> : title.includes("Terminal") ? <TerminalLogo className="h-3.5 w-3.5" /> : <PlatformLogo className="h-3.5 w-3.5" />}
        {title}
      </p>
      <ul className="mt-3.5 space-y-2.5 text-[13.5px]">
        {items.map((it) => (
          <li key={it} className={`flex items-start gap-2.5 ${muted ? "text-gc-ink-muted" : "text-gc-ink"}`}>
            {muted ? <Minus className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> : <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />}
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}
