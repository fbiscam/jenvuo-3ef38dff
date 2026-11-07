import { DAILY_TARGET_PCT, DAILY_DRAWDOWN_PCT } from "@/lib/mt5-licenses";
import { BuyBlockedDialog } from "@/components/BuyNowButton";
import SiteHeader from "@/components/SiteHeader";
import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import { Bot, Check, Cpu, LineChart, Minus, Plus, Sparkles } from "lucide-react";
import BlogFooter from "@/components/BlogFooter";
import { useCurrentPlan } from "@/hooks/useCurrentPlan";
import { useUpgradeLock } from "@/hooks/useUpgradeLock";
import { useTrial } from "@/hooks/useTrial";
import { useServerFn } from "@tanstack/react-start";
import { getFoundingMembership } from "@/lib/mt5-licenses.functions";
import { purchaseGate, type PurchaseGate } from "@/lib/founding-bot";
import { JX_BOT_PRICE, TERMINAL_API_PRICE, planPrice } from "@/lib/plan-pricing";

const SANS = "font-['Google_Sans_Flex','Google_Sans','Product_Sans','Poppins',system-ui,sans-serif]";

export const FAQ = [
  ["Is this financial advice?", "No. Jenvu is an analysis tool. Every setup is for educational purposes and you remain responsible for your own trades."],
  ["Is there a free trial or open sign-up?", "No. Sign-up and the free trial are closed. Jenvu accounts are created only for approved Founding Program members, who get Pro or Elite for 30 days, plus $200 credit once their ID is verified. Apply at jenvu.com/founding."],
  ["What do the plans include?", "Every plan includes the Terminal's paid strategies, the Top AI Models and monthly API credit: Pro $29, Elite $59 and Ultra $99 a month. JX Bot for MetaTrader 5 (1, 2 or 5 IPs, verified by IP address, no license key) is offered only to verified Founding Program members, who pay the bot's cost on top: Pro $49, Elite $99 or Ultra $169."],
  ["Who gets JX Bot?", "JX Bot is only for approved Founding Program members. After approval and ID verification, the first month is free. After that, members keep the bot by buying Pro ($49), Elite ($99) or Ultra ($169), which include the JX Bot cost. A plan bought without Founding membership covers the Terminal and API only. Credit alone never unlocks JX Bot. Apply at jenvu.com/founding."],
  ["When does JX Bot trade?", `New trades open Monday to Thursday between 01:00 and 14:00 broker time and on Friday until 13:00. The bot skips the London open (07:00–09:00 UTC), the New York open (13:00–15:00 UTC) and weekends. It stops for the day at a fixed daily target of ${DAILY_TARGET_PCT.pro}% (Pro), ${DAILY_TARGET_PCT.elite}% (Elite) or ${DAILY_TARGET_PCT.ultra}% (Ultra) of the day's starting balance, or at the fixed ${DAILY_DRAWDOWN_PCT}% daily drawdown guard.`],
  ["Who can use the Terminal?", "Only approved Founding Program members. After approval you have 2 days to verify your ID; if it isn't sent in time the Terminal locks until you send it. Plans can be bought only after your ID is verified."],
  ["Can I cancel anytime?", "Yes. Plans are month-to-month with no lock-in. You keep access until the end of the period you already paid for."],
  ["What markets are covered?", "The Terminal covers Gold (XAU/USD), Bitcoin (BTC/USD) and Euro (EUR/USD). JX Bot trades EUR/USD only."],
];

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Jenvu Pricing — Pro, Elite and Ultra Plans" },
      { name: "description", content: "Transparent Jenvu pricing: Pro $29, Elite $59 and Ultra $99 a month for the Terminal and API, $3 per million tokens, for approved Founding Program members." },
      { property: "og:title", content: "Jenvu pricing" },
      { property: "og:description", content: "Pro, Elite and Ultra plans for the Terminal and Top AI Models, with JX Bot for approved Founding members." },
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
type Row = { f: string; b: Mark; c: Mark; d: Mark };
type Group = { title: string; rows: Row[]; bot?: boolean };

const GROUPS: ReadonlyArray<Group> = [
  {
    title: "Usage",
    rows: [
      { f: "Terminal + API price", b: `$${TERMINAL_API_PRICE.pro}`, c: `$${TERMINAL_API_PRICE.elite}`, d: `$${TERMINAL_API_PRICE.ultra}` },
      { f: "Monthly AI wallet", b: "$10", c: "$25", d: "$50" },
      { f: "Daily token limit", b: "1.5M", c: "5M", d: "10M" },
      { f: "Balance-based quota ($3 = 1M tokens)", b: true, c: true, d: true },
      { f: "Active API keys", b: "2", c: "3", d: "5" },
    ],
  },
  {
    title: "AI Models",
    rows: [
      { f: "ChatGPT 5.5 Pro primary analysis", b: true, c: true, d: true },
      { f: "Grok 4.6 chat", b: true, c: true, d: true },
      { f: "Claude Fable 5.1 senior review", b: false, c: true, d: true },
      { f: "Chat / primary request", b: "$0.03", c: "$0.03", d: "$0.03" },
      { f: "Senior-reviewed analysis", b: false, c: "$0.20", d: "$0.20" },
    ],
  },
  {
    title: "Terminal & Strategies",
    rows: [
      { f: "Live Gold, Bitcoin and EUR/USD charts", b: true, c: true, d: true },
      { f: "Paid ICT/SMC strategies", b: true, c: true, d: true },
      { f: "Ask Jenvu on the chart", b: true, c: true, d: true },
      { f: "API access & webhooks", b: false, c: true, d: true },
      { f: "API usage controls & request logs", b: false, c: true, d: true },
    ],
  },
  {
    title: "JX Bot (MT5)",
    bot: true,
    rows: [
      { f: "JX Bot cost (Founding members)", b: `+$${JX_BOT_PRICE.pro}`, c: `+$${JX_BOT_PRICE.elite}`, d: `+$${JX_BOT_PRICE.ultra}` },
      { f: "IPs (PC or RDP)", b: "1", c: "2", d: "5" },
      { f: "Daily target per IP", b: `${DAILY_TARGET_PCT.pro}%`, c: `${DAILY_TARGET_PCT.elite}%`, d: `${DAILY_TARGET_PCT.ultra}%` },
      { f: `Auto-stop at target or ${DAILY_DRAWDOWN_PCT}% drawdown`, b: true, c: true, d: true },
      { f: "Safe hours, London & New York open block", b: true, c: true, d: true },
      { f: "Download, presets & updates", b: true, c: true, d: true },
    ],
  },
  {
    title: "Support",
    rows: [
      { f: "Help center & email support", b: true, c: true, d: true },
      { f: "Priority desk support", b: false, c: false, d: true },
    ],
  },
];

const BOT_ONE_LINE: Row = { f: "JX Bot (MT5)", b: "Founding members only", c: "Founding members only", d: "Founding members only" };

const CUSTOM = ["Custom rate limits", "Dedicated support", "Team seats & roles", "Volume pricing", "Custom API models"];

function PricingPage() {
  const currentPlan = useCurrentPlan();
  const upgradeLock = useUpgradeLock();
  const trial = useTrial();
  const signedOut = currentPlan === null;
  const [billing, setBilling] = React.useState<"monthly" | "annual">("monthly");
  // Only verified Founding members see JX Bot in the plans and pay the bot-included price.
  const membershipFn = useServerFn(getFoundingMembership);
  const [founding, setFounding] = React.useState(false);
  const [member, setMember] = React.useState(false);
  // Buying is only for admins and ID-verified Founding members; others apply first.
  const [buyGate, setBuyGate] = React.useState<PurchaseGate>({ canBuy: false, reason: "apply" });
  const [blocked, setBlocked] = React.useState<"verify_id" | "apply" | null>(null);
  React.useEffect(() => {
    if (signedOut) { setFounding(false); setMember(false); setBuyGate({ canBuy: false, reason: "apply" }); return; }
    let alive = true;
    membershipFn()
      .then((r) => {
        if (!alive) return;
        setFounding(!!r.verified);
        setMember(!!r.member);
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
    { key: "pro", name: "Pro", description: "The Terminal and AI for everyday trading.", big: "$10", bigLabel: "AI wallet every month", ips: 1, features: ["Terminal paid strategies", "ChatGPT 5.5 Pro and Grok 4.6", "1.5M daily tokens", "2 API keys"] },
    { key: "elite", name: "Elite", description: "More AI usage with senior review.", big: "$25", bigLabel: "AI wallet & senior review", ips: 2, features: ["Everything in Pro", "Claude Fable 5.1 senior review", "5M daily tokens", "3 API keys, webhooks & logs"] },
    { key: "ultra", name: "Ultra", description: "Maximum limits and priority support.", big: "$50", bigLabel: "AI wallet & priority desk", ips: 5, features: ["Everything in Elite", "10M daily tokens", "5 API keys", "Priority desk support"] },
  ];

  const btnBase = "flex h-11 w-full items-center justify-center rounded-full text-[15px] font-medium transition";
  const btnStyle = (solid: boolean) =>
    solid ? `${btnBase} bg-foreground text-background hover:opacity-90` : `${btnBase} border border-gc-line bg-background text-foreground hover:bg-gc-surface`;

  const planCta = (key: PlanKey) => {
    const solid = key === "elite";
    const trialPro = trial.active && key === "pro";
    const isCurrent = currentPlan === key && !trialPro;
    const disabled = currentPlan !== null && !isCurrent && !trialPro && upgradeLock.locked;
    if (isCurrent) return <div className={`${btnBase} border border-gc-line bg-gc-surface`}>Current plan</div>;
    if (disabled) return <button type="button" disabled className={`${btnBase} cursor-not-allowed border border-gc-line bg-gc-surface text-gc-ink-muted`}>Locked in trial</button>;
    if (!signedOut && !buyGate.canBuy) {
      return (
        <button type="button" onClick={() => setBlocked(buyGate.reason === "verify_id" ? "verify_id" : "apply")} className={btnStyle(solid)}>
          Buy now
        </button>
      );
    }
    return (
      <Link to={signedOut ? "/founding" : "/dashboard/pay"} className={btnStyle(solid)}>
        {signedOut ? "Apply now" : trialPro ? "Upgrade to Pro" : currentPlan !== null && currentPlan !== "free" ? "Upgrade" : "Buy now"}
      </Link>
    );
  };

  const groups = GROUPS.map((g) => (g.bot && !founding ? { ...g, rows: [BOT_ONE_LINE] } : g));

  return (
    <div className={`public-cloudflare min-h-dvh w-full bg-background text-gc-ink ${SANS} antialiased`}>
      <SiteHeader />

      {/* HEADER */}
      <section className="mx-auto max-w-[900px] px-5 pb-10 pt-16 text-center sm:px-8 sm:pt-24">
        <div aria-hidden className="mx-auto flex items-center justify-center gap-2.5">
          <span className="h-3.5 w-3.5 rounded-full bg-foreground" />
          <span className="h-3.5 w-3.5 rotate-45 rounded-[3px] border-2 border-foreground" />
          <span className="h-0 w-0 border-x-[8px] border-b-[14px] border-x-transparent border-b-foreground" />
        </div>
        <h1 className="mt-6 text-[2.8rem] font-medium leading-[1.05] tracking-tight sm:text-[4rem]">Pricing</h1>
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Founding */}
          <article className="flex flex-col rounded-2xl border border-gc-line bg-background p-6">
            <h3 className="text-[20px] font-medium tracking-tight">Founding</h3>
            <p className="mt-1.5 min-h-[44px] text-[14px] leading-[1.55] text-gc-ink-muted">Invite-only first month for approved members.</p>
            <div className="mt-5 flex items-baseline gap-1.5">
              <span className="text-[44px] font-medium leading-none tracking-tight">$0</span>
              <span className="text-[14px] text-gc-ink-muted">/ 30 days</span>
            </div>
            <div className="mt-5">
              {member ? (
                <div className={`${btnBase} border border-gc-line bg-gc-surface`}>You're a member</div>
              ) : (
                <Link to="/founding" className={btnStyle(false)}>Apply now</Link>
              )}
            </div>
            <Summary big="$200" label="credit after ID check" />
            <FeatureList title="Platform & AI" items={["Pro or Elite for 30 days", "Terminal after ID verification", "100 seats each month"]} />
            <FeatureList title="JX Bot (MT5)" items={["First month free", "Unlocked after ID verification"]} />
          </article>

          {plans.map((plan) => (
            <article
              key={plan.key}
              className={`relative flex flex-col rounded-2xl border bg-background p-6 ${plan.key === "elite" ? "border-foreground" : "border-gc-line"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[20px] font-medium tracking-tight">{plan.name}</h3>
                {plan.key === "elite" && (
                  <span className="rounded-full bg-gc-pill px-2.5 py-0.5 text-[12px] font-medium text-foreground">Most popular</span>
                )}
              </div>
              <p className="mt-1.5 min-h-[44px] text-[14px] leading-[1.55] text-gc-ink-muted">{plan.description}</p>
              <div className="mt-5 flex items-baseline gap-1.5">
                <span className="text-[44px] font-medium leading-none tracking-tight">${priceOf(planPrice(plan.key, founding))}</span>
                <span className="text-[14px] text-gc-ink-muted">{suffix}</span>
              </div>
              {founding && (
                <p className="mt-1.5 text-[12px] text-gc-ink-muted">
                  Terminal + API ${TERMINAL_API_PRICE[plan.key]} + JX Bot ${JX_BOT_PRICE[plan.key]}
                </p>
              )}
              <div className="mt-5">{planCta(plan.key)}</div>
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

      <BuyBlockedDialog open={blocked !== null} onOpenChange={(v) => !v && setBlocked(null)} reason={blocked ?? "apply"} />

      {/* COMPARE */}
      <section id="compare" className="scroll-mt-24 mx-auto max-w-7xl px-5 py-14 sm:px-8">
        <h2 className="text-center text-[30px] font-medium leading-tight tracking-tight sm:text-[40px]">Compare features across plans</h2>
        <div className="mt-10 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-[14px]">
            <thead>
              <tr>
                <th className="w-[40%] pb-4 text-left font-normal" />
                {(["pro", "elite", "ultra"] as const).map((k) => (
                  <th key={k} className="pb-4 text-center text-[16px] font-medium">
                    {k[0].toUpperCase() + k.slice(1)}
                    {currentPlan === k && <span className="ml-1.5 text-[12px] font-normal text-gc-ink-muted">· current</span>}
                  </th>
                ))}
              </tr>
            </thead>
            {groups.map((g) => (
              <tbody key={g.title}>
                <tr>
                  <th colSpan={4} className="pb-2 pt-8 text-left text-[13px] font-medium uppercase tracking-wide text-gc-ink-muted">{g.title}</th>
                </tr>
                {g.rows.map((row) => (
                  <tr key={row.f} className="border-t border-gc-line">
                    <td className="py-3.5 pr-4 text-gc-ink">{row.f}</td>
                    {[row.b, row.c, row.d].map((v, i) => (
                      <td key={i} className="px-3 py-3.5 text-center">
                        {v === true ? (
                          <Check className="mx-auto h-4 w-4 text-foreground" aria-label="Included" />
                        ) : v === false ? (
                          <Minus className="mx-auto h-4 w-4 text-gc-ink-muted/60" aria-label="Not included" />
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
          <TopUp canBuy={buyGate.canBuy} />
        </div>
      </section>

      {/* CUSTOM PLAN */}
      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-2 md:items-center md:gap-14">
        <div>
          <h2 className="text-[30px] font-medium leading-tight tracking-tight sm:text-[40px]">Need a custom plan?</h2>
          <p className="mt-4 max-w-[480px] text-[16px] leading-[1.65] text-gc-ink-muted">
            For trading desks, teams and partners who need higher limits, more seats or API access built around their workflow.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-4">
            <Link to="/contact" className="inline-flex h-11 items-center justify-center rounded-full bg-foreground px-6 text-[15px] font-medium text-background transition hover:opacity-90">
              Contact sales
            </Link>
            <a href="mailto:sales@jenvu.com" className="text-[15px] text-gc-ink-muted underline-offset-4 hover:text-gc-ink hover:underline">sales@jenvu.com</a>
          </div>
        </div>
        <ul className="grid gap-2.5">
          {CUSTOM.map((c) => (
            <li key={c} className="flex items-center gap-3 rounded-xl bg-gc-surface px-5 py-4 text-[15px]">
              <Check className="h-4 w-4 shrink-0" aria-hidden />
              {c}
            </li>
          ))}
        </ul>
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

      <BlogFooter />
    </div>
  );
}

function Summary({ big, label }: { big: string; label: string }) {
  return (
    <div className="mt-6 border-t border-gc-line pt-5">
      <p className="text-[26px] font-medium leading-none tracking-tight">{big}</p>
      <p className="mt-1.5 text-[13px] text-gc-ink-muted">{label}</p>
    </div>
  );
}

function FeatureList({ title, items, muted }: { title: string; items: string[]; muted?: boolean }) {
  const Icon = title.startsWith("JX") ? Bot : title.includes("AI") ? Sparkles : title.includes("Terminal") ? LineChart : Cpu;
  return (
    <div className="mt-6">
      <p className="flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-wide text-gc-ink-muted">
        <Icon className="h-3.5 w-3.5" aria-hidden /> {title}
      </p>
      <ul className="mt-3 space-y-2.5 text-[14px]">
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

function TopUp({ canBuy }: { canBuy: boolean }) {
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
        to={canBuy ? "/dashboard/pay" : "/founding"}
        search={canBuy ? ({ amount: safe } as never) : undefined}
        className="inline-flex h-10 items-center justify-center whitespace-nowrap rounded-full bg-foreground px-5 text-[14px] font-medium text-background hover:opacity-90"
      >
        {canBuy ? "Buy now" : "Apply now"}
      </Link>
      {amount < 5 && <p className="w-full text-[13px] text-destructive">Minimum top-up is $5.</p>}
    </div>
  );
}
