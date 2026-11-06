import { DAILY_TARGET_PCT, DAILY_DRAWDOWN_PCT } from "@/lib/mt5-licenses";
import SiteHeader from "@/components/SiteHeader";
import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import { ArrowUpRight, BarChart3, Calculator, ChevronDown, ChevronsUpDown, Coins, Gauge, Wallet } from "lucide-react";
import BlogFooter from "@/components/BlogFooter";
import { NextStep } from "@/components/PageShell";
import { useCurrentPlan } from "@/hooks/useCurrentPlan";
import { useUpgradeLock } from "@/hooks/useUpgradeLock";
import { useTrial } from "@/hooks/useTrial";
import xaiLogo from "@/assets/xai-logo.png";
import openAiLogo from "@/assets/openai-logo.png";
import claudeLogo from "@/assets/claude-logo.png";
import { AuroraTile } from "@/components/AuroraTile";
import { useServerFn } from "@tanstack/react-start";
import { getFoundingMembership } from "@/lib/mt5-licenses.functions";
import { JX_BOT_PRICE, TERMINAL_API_PRICE, planPrice } from "@/lib/plan-pricing";

const SANS = "font-['Google_Sans_Flex','Google_Sans','Product_Sans','Poppins',system-ui,sans-serif]";
const LINK = "font-medium text-gc-blue underline underline-offset-2 hover:text-gc-blue-hover";

export const FAQ = [
  ["Is this financial advice?", "No. Jenvu is an analysis tool. Every setup is for educational purposes and you remain responsible for your own trades."],
  ["How does the free trial work?", "After signing up, click “Start free” in your dashboard. You get $100 credit and 14 days of Pro access (Terminal strategies and API credit) once per account. The free trial does not include JX Bot."],
  ["What do the plans include?", "Every plan includes the Terminal's paid strategies, the Top AI Models and monthly API credit: Pro $29, Elite $59 and Ultra $99 a month. JX Bot for MetaTrader 5 (1, 2 or 5 IPs, verified by IP address, no license key) is offered only to verified Founding Program members, who pay the bot's cost on top: Pro $49, Elite $99 or Ultra $169."],
  ["Who gets JX Bot?", "JX Bot is only for approved Founding Program members. After approval and ID verification, the first month is free. After that, members keep the bot by buying Pro ($49), Elite ($99) or Ultra ($169), which include the JX Bot cost. A plan bought without Founding membership covers the Terminal and API only. Credit alone never unlocks JX Bot. Apply at jenvu.com/founding."],
  ["When does JX Bot trade?", `New trades open Monday to Thursday between 01:00 and 14:00 broker time and on Friday until 13:00. The bot skips the London open (07:00–09:00 UTC), the New York open (13:00–15:00 UTC) and weekends. It stops for the day at a fixed daily target of ${DAILY_TARGET_PCT.pro}% (Pro), ${DAILY_TARGET_PCT.elite}% (Elite) or ${DAILY_TARGET_PCT.ultra}% (Ultra) of the day's starting balance, or at the fixed ${DAILY_DRAWDOWN_PCT}% daily drawdown guard.`],
  ["Who can use the Terminal?", "The Terminal is open to every signed-in user. Its paid strategies (Fresh sweep, Swing price action, Zone + FVG) need a Pro, Elite or Ultra plan, a running free trial or Founding access."],
  ["Can I cancel anytime?", "Yes. Plans are month-to-month with no lock-in. You keep access until the end of the period you already paid for."],
  ["What markets are covered?", "The Terminal covers Gold (XAU/USD), Bitcoin (BTC/USD) and Euro (EUR/USD). JX Bot trades EUR/USD only."],
];

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Jenvu Pricing — Pro, Elite and Ultra Plans" },
      { name: "description", content: "Transparent Jenvu pricing: Pro $29, Elite $59 and Ultra $99 a month for the Terminal and API, $3 per million tokens, plus $100 free credit and 14 days of Pro for new users." },
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

type Mark = boolean | string;
type Row = { f: string; b: Mark; c: Mark; d: Mark; bot?: boolean };
/** Shown to everyone except verified Founding members: JX Bot in one line. */
const BOT_ONE_LINE: Row = { f: "JX Bot (MT5)", b: "Founding members only", c: "Founding members only", d: "Founding members only" };
const COMPARE: ReadonlyArray<Row> = [
  { f: "Terminal + API price", b: `$${TERMINAL_API_PRICE.pro}`, c: `$${TERMINAL_API_PRICE.elite}`, d: `$${TERMINAL_API_PRICE.ultra}` },
  { f: "JX Bot cost (Founding members)", b: `+$${JX_BOT_PRICE.pro}`, c: `+$${JX_BOT_PRICE.elite}`, d: `+$${JX_BOT_PRICE.ultra}`, bot: true },
  { f: "JX Bot IPs (PC or RDP)", b: "1", c: "2", d: "5", bot: true },
  { bot: true, f: "JX Bot daily target", b: `${DAILY_TARGET_PCT.pro}% of balance`, c: `${DAILY_TARGET_PCT.elite}% of balance`, d: `${DAILY_TARGET_PCT.ultra}% of balance` },
  { bot: true, f: "JX Bot daily target per IP", b: `${DAILY_TARGET_PCT.pro}% of day-start balance`, c: `${DAILY_TARGET_PCT.elite}% of day-start balance`, d: `${DAILY_TARGET_PCT.ultra}% of day-start balance` },
  { bot: true, f: `Daily auto-stop at target (or ${DAILY_DRAWDOWN_PCT}% drawdown)`, b: true, c: true, d: true },
  { bot: true, f: "Safe trading hours (Mon–Thu 01:00–14:00, Fri until 13:00)", b: true, c: true, d: true },
  { bot: true, f: "London & New York open block, weekends off", b: true, c: true, d: true },
  { bot: true, f: "Entry checks (H1 trend, spread, candle, spike guard)", b: true, c: true, d: true },
  { bot: true, f: "JX Bot download, presets & updates", b: true, c: true, d: true },
  { f: "Monthly AI wallet", b: "$10", c: "$25", d: "$50" },
  { f: "Daily token limit", b: "1.5M", c: "5M", d: "10M" },
  { f: "Balance-based quota ($3 = 1M tokens)", b: true, c: true, d: true },
  { f: "Active API keys", b: "2", c: "3", d: "5" },
  { f: "AI models", b: "__MODELS__", c: "__MODELS__", d: "__MODELS__" },
  { f: "ChatGPT 5.5 Pro primary analysis", b: true, c: true, d: true },
  { f: "Claude Fable 5.1 senior review", b: false, c: true, d: true },
  { f: "Chat / primary request", b: "$0.03", c: "$0.03", d: "$0.03" },
  { f: "Senior-reviewed analysis", b: false, c: "$0.20", d: "$0.20" },
  { f: "API access & webhooks", b: false, c: true, d: true },
  { f: "API usage controls & request logs", b: false, c: true, d: true },
  { f: "Priority desk support", b: false, c: false, d: true },
];

function PricingPage() {
  const currentPlan = useCurrentPlan();
  const upgradeLock = useUpgradeLock();
  const trial = useTrial();
  const signedOut = currentPlan === null;
  const [billing, setBilling] = React.useState<"monthly" | "annual">("monthly");
  // Only verified Founding members see JX Bot in the plans and pay the bot-included price.
  const membershipFn = useServerFn(getFoundingMembership);
  const [founding, setFounding] = React.useState(false);
  React.useEffect(() => {
    if (signedOut) { setFounding(false); return; }
    let alive = true;
    membershipFn().then((r) => alive && setFounding(!!r.verified)).catch(() => {});
    return () => { alive = false; };
  }, [signedOut, membershipFn]);
  const botLine = (ips: number) => (founding ? `JX Bot on ${ips} IP${ips > 1 ? "s" : ""} included` : "JX Bot: Founding members only");
  const compareRows = founding ? COMPARE : [COMPARE[0], BOT_ONE_LINE, ...COMPARE.filter((r) => !r.bot && r !== COMPARE[0])];
  const priceOf = (id: string, price: number) => {
    const base = price;
    return billing === "annual" && base > 0 ? Math.round((base * 12 * 0.83) / 10) * 10 : base;
  };
  const suffix = billing === "annual" ? "/yr" : "/mo";
  const [open, setOpen] = React.useState<number[]>([]);
  const allOpen = open.length === FAQ.length;

  const plans = [
    { key: "pro" as const, name: "Pro", price: priceOf("pro", planPrice("pro", founding)), description: "Terminal strategies and API credit.", wallet: "$10 AI wallet", bot: ["Terminal paid strategies", "Top AI Models", "2 API keys", botLine(1)] },
    { key: "elite" as const, name: "Elite", price: priceOf("elite", planPrice("elite", founding)), description: "More API credit and senior review.", wallet: "$25 AI wallet", bot: ["Terminal paid strategies", "Top AI Models + senior review", "3 API keys", botLine(2)] },
    { key: "ultra" as const, name: "Ultra", price: priceOf("ultra", planPrice("ultra", founding)), description: "The most API credit and priority support.", wallet: "$50 AI wallet", bot: ["Terminal paid strategies", "Top AI Models + priority support", "5 API keys", botLine(5)] },
  ];

  return (
    <div className={`public-cloudflare min-h-dvh w-full bg-background text-gc-ink ${SANS} antialiased`}>
      <SiteHeader />
      <div>

      {/* HERO */}
      <section className="mx-auto max-w-[900px] px-5 pb-14 pt-16 text-center sm:px-8 sm:pt-24">
        <span className="inline-flex items-center rounded-full border border-gc-line px-3.5 py-1 text-[13px] font-medium text-gc-ink-muted">Pricing</span>
        <h1 className="mt-4 text-[2.6rem] font-medium leading-[1.08] tracking-tight sm:text-6xl">Jenvu pricing</h1>
        <p className="mx-auto mt-5 max-w-[820px] text-[17px] leading-[1.65] text-gc-ink-muted">
          Save money with Jenvu's simple, transparent pricing. Compare every feature in the{" "}
          <a href="#compare" className={LINK}>plan comparison</a> or contact us to get a quote for your trading desk.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/contact" className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition hover:opacity-90">
            Request a quote
          </Link>
          <Link to="/founding" className="inline-flex items-center gap-1.5 rounded-full bg-gc-pill px-5 py-2.5 text-sm font-medium text-foreground transition hover:brightness-95">
            Apply now
          </Link>
        </div>
      </section>

      {/* START FOR FREE + STATS */}
      <section className="mx-auto grid max-w-[1296px] items-center gap-10 px-5 py-10 sm:px-8 md:grid-cols-2 md:gap-14 lg:px-[72px]">
        <div>
          <h2 className="text-[30px] font-medium leading-tight tracking-tight sm:text-[36px]">Start trading Gold, Bitcoin and EUR/USD for free</h2>
          <p className="mt-5 text-[17px] leading-[1.65] text-gc-ink-muted">
            Create an account to see how Jenvu reads the Gold, Bitcoin and EUR/USD markets in real time. New users get{" "}
            <Link to="/founding" className={LINK}>$100 in free credit</Link> to run the AI desk, plus{" "}
            <a href="#plans" className={LINK}>14 days of Pro access</a>, started with one click from the dashboard.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: "$100", label: "in free credit" },
            { value: "14", label: "days of Pro access" },
          ].map((s) => (
            <div key={s.label} className="relative overflow-hidden rounded-md border border-gc-line p-6">
              <div aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ backgroundImage: s.value === "$100" ? "var(--platform-aurora-1)" : "var(--platform-aurora-3)" }} />
              <p className="text-[48px] font-medium leading-none tracking-tight text-gc-ink sm:text-[60px]">{s.value}</p>
              <p className="mt-4 text-[15px] text-gc-ink-muted">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TWO COLUMNS */}
      <section className="mx-auto grid max-w-[1296px] gap-10 px-5 py-14 sm:px-8 md:grid-cols-2 md:gap-14 lg:px-[72px]">
        <div>
          <h2 className="text-[30px] font-medium leading-tight tracking-tight sm:text-[36px]">Only pay for what you use</h2>
          <p className="mt-5 text-[17px] leading-[1.65] text-gc-ink-muted">
            Every plan includes a monthly AI wallet billed by actual token use, at $3 per million tokens. No up-front fees and no termination charges —{" "}
            <a href="#compare" className={LINK}>view the full comparison.</a>
          </p>
        </div>
        <div>
          <h2 className="text-[30px] font-medium leading-tight tracking-tight sm:text-[36px]">Save 17% with annual billing</h2>
          <p className="mt-5 text-[17px] leading-[1.65] text-gc-ink-muted">
            Pay once a year instead of monthly and keep the same features for less. Switch the toggle in the{" "}
            <a href="#plans" className={LINK}>plans section</a> to see annual prices for Pro, Elite and Ultra.
          </p>
        </div>
      </section>

      {/* ESTIMATE YOUR COSTS */}
      <section className="mx-auto grid max-w-[1296px] items-start gap-10 px-5 py-14 sm:px-8 md:grid-cols-2 md:gap-14 lg:px-[72px]">
        <div>
          <h2 className="text-[30px] font-medium leading-tight tracking-tight sm:text-[36px]">Estimate your costs</h2>
          <p className="mt-5 text-[17px] leading-[1.65] text-gc-ink-muted">
            Understand how your costs change with the number of AI requests and reviews you run. Use the{" "}
            <a href="#top-up" className={LINK}>custom amount tool</a>, or get a custom quote by talking to our{" "}
            <Link to="/contact" className={LINK}>team</Link>.
          </p>
        </div>
        <figure>
          <AuroraTile n={1} icons={[Calculator, Coins, Gauge]} className="aspect-[16/9] w-full" />
        </figure>
      </section>

      {/* STAY IN CONTROL */}
      <section className="mx-auto grid max-w-[1296px] items-start gap-10 px-5 py-14 sm:px-8 md:grid-cols-2 md:gap-14 lg:px-[72px]">
        <figure className="order-2 md:order-1">
          <AuroraTile n={2} icons={[BarChart3, Wallet]} className="aspect-[16/9] w-full" />
          <figcaption className="mt-3 text-[13px] text-gc-ink-muted">See your current usage and spending at a glance</figcaption>
        </figure>
        <div className="order-1 md:order-2">
          <h2 className="text-[30px] font-medium leading-tight tracking-tight sm:text-[36px]">Stay in control of your spending</h2>
          <p className="mt-5 text-[17px] leading-[1.65] text-gc-ink-muted">
            <a href="https://dash.jenvu.com/usage" className={LINK}>Track your usage</a> with daily token limits, wallet balances and request logs.{" "}
            <a href="https://dash.jenvu.com/billing" className={LINK}>Manage billing</a> and top up only when need to.
          </p>
          <p className="mt-5 text-[17px] leading-[1.65] text-gc-ink-muted">
            We're here to help with <a href="https://support.jenvu.com" className={LINK}>billing support</a>.
          </p>
        </div>
      </section>

      {/* PLANS */}
      <section id="plans" className="scroll-mt-24 mx-auto max-w-[1296px] px-5 py-14 sm:px-8 lg:px-[72px]">
        <div className="text-center">
          <h2 className="text-[32px] font-medium leading-tight tracking-tight sm:text-[44px]">Choose your plan</h2>
          <div className="mx-auto mt-6 inline-flex items-center rounded-full border border-gc-line p-1" aria-label="Billing cycle">
            {(["monthly", "annual"] as const).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBilling(b)}
                className={`rounded-full px-5 py-2 text-[14px] font-medium transition ${billing === b ? "bg-foreground text-background" : "text-gc-ink-muted hover:text-gc-ink"}`}
              >
                {b === "monthly" ? "Monthly" : "Annual · save 17%"}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {plans.map((plan) => {
            const trialPro = trial.active && plan.key === "pro";
            const isCurrent = currentPlan === plan.key && !trialPro;
            const disabled = currentPlan !== null && !isCurrent && !trialPro && upgradeLock.locked;
            const destination = currentPlan !== null ? "/dashboard/pay" : "/auth";
            return (
              <article key={plan.key} className={`flex min-h-[280px] flex-col rounded-md border p-7 ${plan.key === "pro" ? "border-gc-blue" : "border-gc-line"}`}>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-[24px] font-medium tracking-tight">{plan.name}</h3>
                  {plan.key === "pro" && <span className="rounded-full bg-gc-sky px-3 py-1 text-[12px] font-medium text-gc-blue">Popular</span>}
                </div>
                <p className="mt-3 text-[15px] leading-[1.6] text-gc-ink-muted">{plan.description}</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-[48px] font-medium leading-none tracking-tight text-gc-ink">${plan.price}</span>
                  <span className="text-[14px] text-gc-ink-muted">{suffix}</span>
                </div>
                <p className="mt-2 text-[14px] text-gc-ink-muted">{plan.wallet} included</p>
                {founding && (
                  <p className="mt-1 text-[13px] text-gc-ink-muted">
                    Terminal + API ${TERMINAL_API_PRICE[plan.key]} + JX Bot ${JX_BOT_PRICE[plan.key]}
                  </p>
                )}
                <ul className="mt-5 space-y-2 text-[14px] text-gc-ink">
                  {plan.bot.map((b) => (
                    <li key={b} className="flex items-start gap-2"><span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-gc-blue-deep" />{b}</li>
                  ))}
                </ul>
                <div className="mt-auto pt-7">
                  {isCurrent ? (
                    <div className="flex h-11 items-center justify-center rounded-full border border-gc-line bg-gc-surface text-[15px] font-medium">Current plan</div>
                  ) : disabled ? (
                    <button type="button" disabled className="h-11 w-full cursor-not-allowed rounded-full border border-gc-line bg-gc-surface text-[15px] text-gc-ink-muted">Locked in trial</button>
                  ) : (
                    <Link
                      to={destination}
                      className={`flex h-11 items-center justify-center rounded-full text-[15px] font-medium transition ${plan.key === "pro" ? "bg-foreground text-background hover:opacity-90" : "bg-gc-pill text-foreground hover:brightness-95"}`}
                    >
                      {trialPro ? "Upgrade to Pro" : currentPlan !== null ? "Upgrade" : "Buy now"}
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* COMPARE */}
      <section id="compare" className="scroll-mt-24 mx-auto max-w-[1296px] px-5 py-14 sm:px-8 lg:px-[72px]">
        <h2 className="text-[30px] font-medium leading-tight tracking-tight sm:text-[36px]">Compare all features</h2>
        <p className="mt-3 text-[16px] text-gc-ink-muted">All plans include live market data.</p>
        <div className="mt-8 overflow-x-auto rounded-md border border-gc-line">
          <table className="w-full min-w-[760px] border-collapse text-[15px]">
            <thead>
              <tr className="bg-gc-canvas">
                <th className="px-6 py-4 text-left text-[14px] font-medium text-gc-ink-muted">Feature</th>
                {(["pro", "elite", "ultra"] as const).map((k) => (
                  <th key={k} className={`border-l border-gc-line px-5 py-4 text-center text-[15px] font-medium ${currentPlan === k ? "text-gc-blue" : ""}`}>
                    {k[0].toUpperCase() + k.slice(1)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {compareRows.map((row) => (
                <tr key={row.f} className="border-t border-gc-line">
                  <td className="px-6 py-4 text-gc-ink">{row.f}</td>
                  {[row.b, row.c, row.d].map((v, i) => (
                    <td key={i} className="border-l border-gc-line px-3 py-4 text-center text-gc-ink-muted">
                      {v === true ? (
                        <span className="text-[18px] text-gc-blue">✓</span>
                      ) : v === false ? (
                        <span className="inline-block h-px w-4 bg-gc-line align-middle" />
                      ) : v === "__MODELS__" ? (
                        <span className="inline-flex flex-col items-center gap-1">
                          {[
                            { src: openAiLogo, alt: "OpenAI", label: "ChatGPT 5.5 Pro" },
                            { src: claudeLogo, alt: "Anthropic", label: "Claude Fable 5.1" },
                            { src: xaiLogo, alt: "xAI", label: "Grok 4.6 chat" },
                          ].map((m) => (
                            <span key={m.label} className="inline-flex items-center gap-1.5 rounded-md border border-gc-line px-2 py-0.5">
                              <img src={m.src} alt={m.alt} className="h-3.5 w-3.5 object-contain" />
                              <span className="whitespace-nowrap text-[12px] text-gc-ink">{m.label}</span>
                            </span>
                          ))}
                        </span>
                      ) : (
                        <span className="text-gc-ink">{v}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* TOP-UPS */}
      <section id="top-up" className="scroll-mt-24 mx-auto max-w-[1296px] px-5 py-14 sm:px-8 lg:px-[72px]">
        <h2 className="text-[30px] font-medium leading-tight tracking-tight sm:text-[36px]">Need more wallet balance?</h2>
        <p className="mt-3 max-w-[820px] text-[16px] leading-[1.65] text-gc-ink-muted">
          Live market data is free. ChatGPT 5.5 Pro handles primary analysis, Claude Fable 5.1 reviews eligible plans and Grok 4.6 powers normal chat.
        </p>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { price: 5, sub: "Starter" },
            { price: 10, sub: "Boost" },
            { price: 25, sub: "Trader", accent: true },
            { price: 50, sub: "Power" },
          ].map((p) => (
            <div key={p.price} className={`flex flex-col rounded-md border p-6 ${p.accent ? "border-gc-blue" : "border-gc-line"}`}>
              <div className="flex h-6 items-center justify-between">
                <span className="text-[13px] font-medium uppercase tracking-wide text-gc-ink-muted">{p.sub}</span>
                {p.accent && <span className="rounded-full bg-gc-sky px-2.5 py-0.5 text-[12px] font-medium text-gc-blue">Best value</span>}
              </div>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-[38px] font-medium leading-none tracking-tight text-gc-ink">${p.price}</span>
                <span className="text-[14px] text-gc-ink-muted">wallet</span>
              </div>
              <p className="mt-2 text-[14px] text-gc-ink-muted">One-time · ~{(Math.floor((p.price / 3) * 10) / 10).toFixed(1)}M tokens</p>
              <Link
                to={signedOut ? "/auth" : "/dashboard/pay"}
                search={signedOut ? undefined : ({ amount: p.price } as never)}
                className="mt-6 inline-flex h-10 items-center justify-center rounded-full border border-gc-line text-[14px] font-medium text-gc-blue hover:bg-gc-surface"
              >
                Buy now
              </Link>
            </div>
          ))}
        </div>
        <CustomTopUp signedOut={signedOut} />
      </section>

      {/* GUIDANCE */}
      <section className="mx-auto max-w-[1296px] px-5 py-16 sm:px-8 lg:px-[72px]">
        <h2 className="text-center text-[32px] font-medium leading-tight tracking-tight sm:text-[44px]">Want more guidance? We've got you covered.</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            { text: "Talk to our team about a custom plan or quote for your trading desk.", cta: "Request a quote", href: "/contact" },
            { text: "Read the docs to learn how credits, wallets and token limits work.", cta: "Read the docs", href: "/docs" },
            { text: "Join the invite-only Founding Program and get your chosen plan straight away.", cta: "Apply to the program", href: "/founding" },
          ].map((c) => (
            <a key={c.cta} href={c.href} className="flex min-h-[200px] flex-col justify-between rounded-md border border-gc-line p-6 transition hover:shadow-md">
              <p className="text-[19px] font-medium leading-[1.45] text-gc-ink">{c.text}</p>
              <span className="mt-6 inline-flex items-center gap-1 text-[15px] font-medium text-gc-blue">{c.cta} <ArrowUpRight className="h-3.5 w-3.5" /></span>
            </a>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-[1296px] px-5 pb-20 sm:px-8 lg:px-[72px]">
        <h2 className="text-[30px] font-medium leading-tight tracking-tight sm:text-[36px]">Frequently asked questions</h2>
        <div className="mt-6 flex justify-end">
          <button type="button" onClick={() => setOpen(allOpen ? [] : FAQ.map((_, i) => i))} className="flex items-center gap-2 text-[16px] text-gc-blue">
            {allOpen ? "Collapse all" : "Expand all"} <ChevronsUpDown className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 border-t border-gc-line">
          {FAQ.map(([q, a], i) => {
            const isOpen = open.includes(i);
            return (
              <div key={q} className="border-b border-gc-line">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpen((o) => (isOpen ? o.filter((x) => x !== i) : [...o, i]))}
                  className="flex w-full items-center justify-between py-6 text-left text-[19px] text-gc-blue"
                >
                  {q}
                  <ChevronDown className={`h-6 w-6 shrink-0 transition ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen && <p className="border-t border-gc-line py-7 text-[16px] leading-relaxed text-gc-ink-muted">{a}</p>}
              </div>
            );
          })}
        </div>
      </section>

      <NextStep />
      </div>
      <BlogFooter />
    </div>
  );
}

function CustomTopUp({ signedOut }: { signedOut: boolean }) {
  const [amount, setAmount] = React.useState<number>(15);
  const safe = Math.max(5, Math.min(1000, Number.isFinite(amount) ? amount : 5));
  const primaryRequests = Math.floor(safe / 0.03);
  return (
    <div className="relative mt-8 overflow-hidden rounded-md border border-gc-line p-7 sm:p-8">
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-50" style={{ backgroundImage: "var(--platform-aurora-2)" }} />
      <div className="relative">
      <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
        <div className="max-w-[720px]">
          <h3 className="text-[24px] font-medium tracking-tight">Pick your own amount</h3>
          <p className="mt-2 text-[15px] leading-[1.6] text-gc-ink-muted">
            Minimum $5. $1 top-up = $1 wallet. Primary requests cost $0.03; completed senior reviewed analysis costs $0.20. Every $3 of balance unlocks 1,000,000 tokens
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-4 lg:flex-nowrap">
          <div className="flex items-center overflow-hidden rounded-md border border-gc-line bg-background focus-within:border-gc-blue">
            <span className="border-r border-gc-line px-3 py-2 text-[15px] text-gc-ink-muted">$</span>
            <input
              type="number"
              min={5}
              step={1}
              aria-label="Top-up amount in dollars"
              value={Number.isFinite(amount) ? amount : ""}
              onChange={(e) => setAmount(parseInt(e.target.value || "0", 10))}
              className="w-24 bg-background px-3 py-2 text-[15px] tabular-nums outline-none"
            />
          </div>
          <div className="text-right">
            <div className="text-[26px] font-medium leading-none text-gc-ink">${safe}</div>
            <div className="mt-1 text-[12px] text-gc-ink-muted">about {primaryRequests} primary requests</div>
          </div>
          <Link
            to={signedOut ? "/auth" : "/dashboard/pay"}
            search={signedOut ? undefined : ({ amount: safe } as never)}
            className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-full bg-foreground px-6 text-[15px] font-medium text-background hover:opacity-90"
          >
            Buy now
          </Link>
        </div>
      </div>
      {amount < 5 && <p className="mt-3 text-[13px] text-destructive">Minimum top-up is $5.</p>}
      </div>
    </div>
  );
}
