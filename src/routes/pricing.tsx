import { DAILY_TARGET_PCT, DAILY_DRAWDOWN_PCT } from "@/lib/mt5-licenses";
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
import { JX_BOT_PRICE, PLAN_API_CREDIT, TERMINAL_API_PRICE, planPrice } from "@/lib/plan-pricing";
import { PLAN_DAILY_TOKEN_LIMITS } from "@/lib/plan-entitlements";
import { FREE_TRIAL_CREDIT_USD, FREE_TRIAL_DAYS, TRIAL_API_RPM } from "@/lib/free-trial";
import { MODEL_CATALOG } from "@/lib/model-catalog";
import { JxBotLogo, PlatformLogo, TerminalLogo } from "@/components/brand/ProductLogos";
import openAiLogo from "@/assets/model-logos/openai.svg";
import grokLogo from "@/assets/model-logos/grok.svg";
import claudeLogo from "@/assets/model-logos/claude-color.svg";
import geminiLogo from "@/assets/model-logos/gemini-color.svg";

const SANS = "font-['Google_Sans_Flex','Google_Sans','Product_Sans','Poppins',system-ui,sans-serif]";

export const FAQ = [
  ["Is this financial advice?", "No. Jenvu is an analysis tool. Every setup is for educational purposes and you remain responsible for your own trades."],
  ["Is there a free trial or open sign-up?", "Yes. Anyone can sign up (one person, one account) and every new account gets a free trial: $30 API credit and 14 days of Pro, including the Terminal's paid strategies. JX Bot is not part of the trial: apply at jenvu.com/founding, and once approved and ID-verified you get Pro or Elite for 30 days from the verification day, with JX Bot and the plan's API credit ($25 Pro, $50 Elite)."],
  ["What do the plans include?", "Every plan includes the Terminal's paid strategies, the Top AI Models and monthly API credit: Pro $29 a month with $25 credit, Elite $59 with $59 credit and Ultra $99 with $99 credit. Founding members get $25 (Pro) or $50 (Elite) credit for their Founding month. JX Bot for MetaTrader 5 (1, 2 or 5 IPs, verified by IP address, no license key) is offered only to verified Founding Program members, who pay the bot's cost on top: Pro $49, Elite $99 or Ultra $169."],
  ["Who gets JX Bot?", "JX Bot is only for approved Founding Program members. After approval and ID verification, the first month is free. After that, members keep the bot by buying Pro ($49), Elite ($99) or Ultra ($169), which include the JX Bot cost. A plan bought without Founding membership covers the Terminal and API only. Credit alone never unlocks JX Bot. Apply at jenvu.com/founding."],
  ["When does JX Bot trade?", `New trades open Monday to Thursday between 01:00 and 14:00 broker time and on Friday until 13:00. It trades only the Asia and London sessions: it skips the London open (06:15–09:00 UTC), the whole New York session (no new trades after 12:00 UTC) and weekends. It stops for the day at a fixed daily target of ${DAILY_TARGET_PCT.pro}% (Pro), ${DAILY_TARGET_PCT.elite}% (Elite) or ${DAILY_TARGET_PCT.ultra}% (Ultra) of the day's starting balance, or at the fixed ${DAILY_DRAWDOWN_PCT}% daily drawdown guard (counted from the day's highest closed balance, so profit already closed today is protected).`],
  ["Who can use the Terminal?", "Every signed-in user can open the Terminal. Its paid strategies need a plan, a running free trial (14 days of Pro and $30 API credit at sign-up, one per person) or an approved Founding membership."],
  ["Can I cancel anytime?", "Yes. Plans are month-to-month with no lock-in. You keep access until the end of the period you already paid for."],
  ["What markets are covered?", "The Terminal covers Gold (XAU/USD), Bitcoin (BTC/USD) and Euro (EUR/USD). JX Bot trades EUR/USD only."],
];

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Jenvu Pricing — Pro, Elite and Ultra Plans" },
      { name: "description", content: "Transparent Jenvu pricing: Pro $29, Elite $59 and Ultra $99 a month for the Terminal and API, $3 per million tokens, with a free trial of Pro at sign-up." },
      { property: "og:title", content: "Jenvu pricing" },
      { property: "og:description", content: "Pro, Elite and Ultra plans for the Terminal and Top AI Models, with a free trial of Pro at sign-up." },
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
type Mark = boolean | string;
/** One comparison row: values for Free trial, Pro, Elite, Ultra and Enterprise. */
type Row = { f: string; v: [Mark, Mark, Mark, Mark, Mark]; logo?: string; invert?: boolean };
type GroupIcon = "terminal" | "bot" | "platform" | "models" | null;
type Group = { title: string; icon: GroupIcon; rows: Row[]; bot?: boolean };

const TOKENS = (id: string) => `${PLAN_DAILY_TOKEN_LIMITS[id] / 1_000_000}M`;
const MODEL_COUNT = MODEL_CATALOG.length;

const GROUPS: ReadonlyArray<Group> = [
  {
    title: "Usage",
    icon: null,
    rows: [
      { f: "Usage", v: ["Limited", "Basic", "3x Pro", "6x Pro", "Pooled"] },
      { f: "Monthly API credit", v: [`$${FREE_TRIAL_CREDIT_USD} once`, `$${PLAN_API_CREDIT.pro}`, `$${PLAN_API_CREDIT.elite}`, `$${PLAN_API_CREDIT.ultra}`, "Custom"] },
      { f: "Daily token limit", v: [TOKENS("pro"), TOKENS("pro"), TOKENS("elite"), TOKENS("ultra"), "Custom"] },
      { f: "Balance-based quota ($3 = 1M tokens)", v: [true, true, true, true, true] },
      { f: "API requests per minute", v: [`${TRIAL_API_RPM}`, "Standard", "Standard", "Standard", "Custom"] },
    ],
  },
  {
    title: "Top AI Models",
    icon: "models",
    rows: [
      { f: "ChatGPT 5.5 Pro primary analysis", logo: openAiLogo, invert: true, v: [true, true, true, true, true] },
      { f: "Grok 4.6 chat", logo: grokLogo, invert: true, v: [true, true, true, true, true] },
      { f: "Claude Fable 5.1 senior review", logo: claudeLogo, v: [false, false, true, true, true] },
      { f: `${MODEL_COUNT} latest models (Claude, Gemini, DeepSeek & more)`, logo: geminiLogo, v: [true, true, true, true, true] },
      { f: "Chat / primary request", v: ["$0.03", "$0.03", "$0.03", "$0.03", "Volume"] },
      { f: "Senior-reviewed analysis", v: [false, false, "$0.20", "$0.20", "Volume"] },
    ],
  },
  {
    title: "Jenvu Terminal",
    icon: "terminal",
    rows: [
      { f: "Live Gold, Bitcoin and EUR/USD charts", v: [true, true, true, true, true] },
      { f: "Paid ICT/SMC strategies", v: ["14 days", true, true, true, true] },
      { f: "Ask Jenvu on the chart", v: [true, true, true, true, true] },
    ],
  },
  {
    title: "JX Bot (MT5)",
    icon: "bot",
    bot: true,
    rows: [
      { f: "JX Bot cost (Founding members)", v: [false, `+$${JX_BOT_PRICE.pro}`, `+$${JX_BOT_PRICE.elite}`, `+$${JX_BOT_PRICE.ultra}`, "Custom"] },
      { f: "IPs (PC or RDP)", v: [false, "1", "2", "5", "Custom"] },
      { f: "Daily target per IP", v: [false, `${DAILY_TARGET_PCT.pro}%`, `${DAILY_TARGET_PCT.elite}%`, `${DAILY_TARGET_PCT.ultra}%`, "Custom"] },
      { f: `Auto-stop at target or ${DAILY_DRAWDOWN_PCT}% drawdown`, v: [false, true, true, true, true] },
      { f: "Safe hours: London open block, New York off", v: [false, true, true, true, true] },
      { f: "Download, presets & updates", v: [false, true, true, true, true] },
    ],
  },
  {
    title: "Platform & API",
    icon: "platform",
    rows: [
      { f: "Active API keys", v: ["2", "2", "3", "5", "Custom"] },
      { f: "API access & webhooks", v: [false, false, true, true, true] },
      { f: "API usage controls & request logs", v: [false, false, true, true, true] },
    ],
  },
  {
    title: "Support",
    icon: null,
    rows: [
      { f: "Help center & email support", v: [true, true, true, true, true] },
      { f: "Priority desk support", v: [false, false, false, true, true] },
      { f: "Named account team", v: [false, false, false, false, true] },
    ],
  },
];

const BOT_ONE_LINE: Row = { f: "JX Bot (MT5)", v: [false, "Founding only", "Founding only", "Founding only", "Founding only"] };

const CUSTOM: ReadonlyArray<[string, string]> = [
  ["Custom rate limits", "Tailored throughput for your workload."],
  ["Dedicated support", "Named account team and onboarding."],
  ["Team seats & roles", "Give your desk its own access."],
  ["Custom API models", "Pick the models your workflow needs."],
  ["Volume pricing", "Discounts at scale."],
];

function GroupMark({ icon }: { icon: GroupIcon }) {
  if (icon === "terminal") return <TerminalLogo className="h-[18px] w-[18px]" />;
  if (icon === "bot") return <JxBotLogo className="h-[18px] w-[18px]" />;
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

function PricingPage() {
  const currentPlan = useCurrentPlan();
  const upgradeLock = useUpgradeLock();
  const trial = useTrial();
  const signedOut = currentPlan === null;
  const [billing, setBilling] = React.useState<"monthly" | "annual">("monthly");
  // Only verified Founding members see JX Bot in the plans and pay the bot-included price.
  const membershipFn = useServerFn(getFoundingMembership);
  const [founding, setFounding] = React.useState(false);
  // Buying is only for admins and ID-verified Founding members; others apply first.
  const [buyGate, setBuyGate] = React.useState<PurchaseGate>({ canBuy: false, reason: "apply" });
  const navigate = useNavigate();
  React.useEffect(() => {
    if (signedOut) { setFounding(false); setBuyGate({ canBuy: false, reason: "apply" }); return; }
    let alive = true;
    membershipFn()
      .then((r) => {
        if (!alive) return;
        setFounding(!!r.verified);
        setBuyGate(purchaseGate({ isAdmin: !!r.isAdmin, member: !!r.member, verified: !!r.verified }));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [signedOut, membershipFn]);

  const priceOf = (price: number) =>
    billing === "annual" && price > 0 ? Math.round((price * 12 * 0.83) / 10) * 10 : price;
  const suffix = billing === "annual" ? "/ year" : "/ month";
  const [open, setOpen] = React.useState<number | null>(0);

  const plans: Array<{ key: PlanKey; name: string; description: string; big: string; bigLabel: string; features: string[]; ips: number }> = [
    { key: "pro", name: "Pro", description: "Terminal & AI for everyday trading", big: "$25", bigLabel: "API credit every month", ips: 1, features: ["Terminal paid strategies", "ChatGPT 5.5 Pro and Grok 4.6", "1.5M daily tokens", "2 API keys"] },
    { key: "elite", name: "Elite", description: "More AI usage with senior review.", big: "$59", bigLabel: "API credit & senior review", ips: 2, features: ["Claude Fable 5.1 senior review", "5M daily tokens", "3 API keys, webhooks & logs"] },
    { key: "ultra", name: "Ultra", description: "Maximum limits & priority support", big: "$99", bigLabel: "API credit & priority desk", ips: 5, features: ["10M daily tokens", "5 API keys", "Priority desk support"] },
  ];

  const bigBase = "flex h-10 w-full items-center justify-center rounded-full text-[15px] font-medium transition";
  const bigStyle = (solid: boolean) =>
    solid ? `${bigBase} bg-foreground text-background hover:opacity-90` : `${bigBase} border border-gc-line bg-background text-foreground hover:bg-gc-pill`;
  // Compare-table pills (xAI style): small grey pill, the highlighted plan in black.
  const smallBase = "flex h-[30px] w-full items-center justify-center whitespace-nowrap rounded-full px-3 text-[13px] font-medium transition";
  const smallStyle = (solid: boolean) =>
    solid ? `${smallBase} bg-foreground text-background hover:opacity-90` : `${smallBase} bg-gc-pill text-foreground hover:bg-gc-line`;
  const name = (k: PlanKey) => k[0].toUpperCase() + k.slice(1);

  // Free trial column: offered once at sign-up.
  const trialCta = () => {
    if (signedOut) return <Link to="/auth" search={{ mode: "signup" } as never} className={smallStyle(false)}>Get Free Trial</Link>;
    if (trial.active) return <div className={`${smallBase} bg-gc-pill text-gc-ink-muted`}>Active</div>;
    return <div className={`${smallBase} bg-gc-pill text-gc-ink-muted`}>Used</div>;
  };

  const planCta = (key: PlanKey, small = false) => {
    const solid = key === "elite";
    const btnBase = small ? smallBase : bigBase;
    const btnStyle = small ? smallStyle : bigStyle;
    const trialPro = trial.active && key === "pro";
    const isCurrent = currentPlan === key && !trialPro;
    const disabled = currentPlan !== null && !isCurrent && !trialPro && upgradeLock.locked;
    // Pro during a running free trial shows the trial as the user's status.
    const quiet = small ? "bg-gc-pill text-gc-ink-muted" : "border border-gc-line bg-background text-gc-ink-muted";
    if (trialPro) return <div className={`${btnBase} ${quiet}`}>{small ? "On trial" : "You Got Free Trial"}</div>;
    if (isCurrent) return <div className={`${btnBase} ${quiet}`}>Current plan</div>;
    if (disabled) return <button type="button" disabled className={`${btnBase} cursor-not-allowed ${quiet}`}>Locked in trial</button>;
    if (!signedOut && !buyGate.canBuy) {
      return (
        <button type="button" onClick={() => showBuyBlocked(buyGate.reason === "verify_id" ? "verify_id" : "apply", (t) => navigate({ to: t }))} className={btnStyle(solid)}>
          {small ? `Get ${name(key)}` : "Buy now"}
        </button>
      );
    }
    // Signed out: Pro offers the free trial (14 days of Pro + API credit at sign-up); the
    // other paid plans say Buy now and send the visitor to sign up first.
    if (signedOut) {
      return (
        <Link to="/auth" search={{ mode: "signup" } as never} className={btnStyle(solid)}>
          {small ? `Get ${name(key)}` : key === "pro" ? "Get Free Trial" : "Buy now"}
        </Link>
      );
    }
    return (
      <Link to="/dashboard/pay" className={btnStyle(solid)}>
        {currentPlan !== null && currentPlan !== "free" ? "Upgrade" : small ? `Get ${name(key)}` : "Buy now"}
      </Link>
    );
  };

  const groups = GROUPS.map((g) => (g.bot && !founding ? { ...g, rows: [BOT_ONE_LINE] } : g));

  return (
    <div className={`public-cloudflare min-h-dvh w-full bg-background text-gc-ink ${SANS} antialiased`}>
      <SiteHeader />

      {/* HEADER */}
      <section className="mx-auto max-w-[900px] px-5 pb-10 pt-16 text-center sm:px-8 sm:pt-24">
        <div className="mx-auto flex items-center justify-center gap-3.5" aria-label="Terminal, JX Bot and Platform">
          {([["Terminal", TerminalLogo], ["JX Bot", JxBotLogo], ["Platform", PlatformLogo]] as const).map(([label, Logo]) => (
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
              {b === "monthly" ? "Monthly" : (<>Annual <span className="ml-1 text-[12px] text-gc-ink-muted">−17%</span></>)}
            </button>
          ))}
        </div>
      </section>

      {/* PLAN CARDS */}
      <section id="plans" className="scroll-mt-24 mx-auto max-w-7xl px-5 pb-16 sm:px-8">
        <div className="mx-auto grid max-w-[1100px] gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-[40px] font-medium leading-none tracking-tight">${priceOf(planPrice(plan.key, founding))}</span>
                <span className="text-[13px] text-gc-ink-muted">{suffix}</span>
              </div>
              <p className="mt-1.5 min-h-[18px] text-[12px] leading-[18px] text-gc-ink-muted">
                {founding
                  ? `Terminal + API $${TERMINAL_API_PRICE[plan.key]} + JX Bot $${JX_BOT_PRICE[plan.key]}`
                  : "Terminal + API"}
              </p>
              <div className="mt-4">{planCta(plan.key)}</div>
              <p className="mt-6 min-h-[20px] text-[13px] text-gc-ink-muted">
                {plan.key === "elite" ? "Everything in Pro, and:" : plan.key === "ultra" ? "Everything in Elite, and:" : plan.description}
              </p>
              <Summary big={plan.big} label={plan.bigLabel} />
              <FeatureList title="Platform & AI" items={plan.features} />
              <FeatureList
                title="JX Bot (MT5)"
                items={
                  founding
                    ? [`${plan.ips} IP${plan.ips > 1 ? "s" : ""} included`, `${DAILY_TARGET_PCT[plan.key]}% daily target per IP`, `${DAILY_DRAWDOWN_PCT}% drawdown guard`]
                    : ["Founding members only"]
                }
                muted={!founding}
              />
            </article>
          ))}
        </div>
        <p className="mt-5 text-center text-[13px] text-gc-ink-muted">
          Prices in USD. Live market data is free on every plan. Plans can be bought after your ID is verified.
        </p>
      </section>


      {/* COMPARE */}
      <section id="compare" className="scroll-mt-24 mx-auto max-w-7xl px-5 py-14 sm:px-8">
        <h2 className="text-center text-[30px] font-medium leading-tight tracking-tight sm:text-[40px]">Compare features across plans</h2>
        <div className="mt-12 overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-[14px]">
            <thead>
              <tr className="border-b border-gc-line">
                <th className="w-[28%] pb-5 text-left align-bottom text-[14px] font-normal text-gc-ink-muted">Feature</th>
                {[
                  { key: "trial", label: "Free trial", price: `$0 · ${FREE_TRIAL_DAYS} days`, cta: trialCta() },
                  ...(["pro", "elite", "ultra"] as const).map((k) => ({
                    key: k,
                    label: name(k),
                    price: `$${priceOf(planPrice(k, founding))}${billing === "annual" ? "/year" : "/month"}`,
                    cta: planCta(k, true),
                  })),
                  { key: "enterprise", label: "Enterprise", price: "Custom", cta: <Link to="/contact" className={smallStyle(false)}>Contact Sales</Link> },
                ].map((c) => (
                  <th key={c.key} className="px-1.5 pb-5 text-center align-bottom font-normal">
                    <div className="text-[15px] font-medium text-gc-ink">
                      {c.label}
                      {currentPlan === c.key && <span className="ml-1 text-[11px] font-normal text-gc-ink-muted">· current</span>}
                    </div>
                    <div className="mt-1 text-[12.5px] text-gc-ink-muted">{c.price}</div>
                    <div className="mt-3">{c.cta}</div>
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
                    <td className="py-4 pr-4 text-gc-ink">
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
                          <span className="text-gc-ink">{v}</span>
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

      {/* TOP-UPS */}
      <section id="top-up" className="scroll-mt-24 mx-auto max-w-7xl px-5 py-14 sm:px-8">
        <div className="flex flex-col justify-between gap-6 rounded-2xl bg-gc-surface p-7 sm:p-9 lg:flex-row lg:items-center">
          <div className="max-w-[620px]">
            <h2 className="text-[24px] font-medium tracking-tight sm:text-[28px]">Need more wallet balance?</h2>
            <p className="mt-2 text-[15px] leading-[1.6] text-gc-ink-muted">
              Top up from $5. $1 = $1 wallet, every $3 unlocks 1M tokens. Primary requests cost $0.03; senior-reviewed analysis $0.20.
            </p>
          </div>
          <TopUp canBuy={buyGate.canBuy} signedOut={signedOut} />
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
        {title.startsWith("JX") ? <JxBotLogo className="h-3.5 w-3.5" /> : title.includes("Terminal") ? <TerminalLogo className="h-3.5 w-3.5" /> : <PlatformLogo className="h-3.5 w-3.5" />}
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

function TopUp({ canBuy, signedOut }: { canBuy: boolean; signedOut: boolean }) {
  const [amount, setAmount] = React.useState<number>(25);
  const safe = Math.max(5, Math.min(1000, Number.isFinite(amount) ? amount : 5));
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-3">
      <div className="flex gap-1.5">
        {[5, 10, 25, 50].map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setAmount(v)}
            className={`h-10 rounded-full px-4 text-[14px] font-medium transition ${safe === v ? "bg-foreground text-background" : "bg-background text-foreground hover:bg-gc-pill"}`}
          >
            ${v}
          </button>
        ))}
      </div>
      <div className="flex h-10 items-center overflow-hidden rounded-full border border-gc-line bg-background pl-4">
        <span className="text-[14px] text-gc-ink-muted">$</span>
        <input
          type="number"
          min={5}
          step={1}
          aria-label="Top-up amount in dollars"
          value={Number.isFinite(amount) ? amount : ""}
          onChange={(e) => setAmount(parseInt(e.target.value || "0", 10))}
          className="w-16 bg-transparent px-2 text-[14px] tabular-nums outline-none"
        />
      </div>
      <Link
        to={canBuy ? "/dashboard/pay" : signedOut ? "/auth" : "/founding"}
        search={canBuy ? ({ amount: safe } as never) : signedOut ? ({ mode: "signup" } as never) : undefined}
        className="inline-flex h-10 items-center justify-center whitespace-nowrap rounded-full bg-foreground px-5 text-[14px] font-medium text-background hover:opacity-90"
      >
        Buy now
      </Link>
      {amount < 5 && <p className="w-full text-[13px] text-destructive">Minimum top-up is $5.</p>}
    </div>
  );
}
