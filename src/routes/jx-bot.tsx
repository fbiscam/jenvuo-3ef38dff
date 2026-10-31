import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import { ArrowUpRight, Mic, Monitor, Plus, Search, X } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import BlogFooter from "@/components/BlogFooter";
import Mt5Preview from "@/components/jxbot/Mt5Preview";
import { useAuthUser } from "@/hooks/useAuthUser";

export const Route = createFileRoute("/jx-bot")({
  head: () => ({
    meta: [
      { title: "JX Bot — Jenvu's Gold trading bot for MetaTrader 5" },
      {
        name: "description",
        content:
          "How JX Bot works: a Gold (XAU/USD) M15 swing bot for MetaTrader 5 with a stop loss on every trade, safe trading hours, daily auto-stop and IP licensing.",
      },
      { property: "og:title", content: "JX Bot — Jenvu's Gold trading bot for MetaTrader 5" },
      {
        property: "og:description",
        content: "A Gold M15 swing bot for MT5: stop loss on every trade, safe hours, daily auto-stop and IP licensing.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://jenvu.com/jx-bot" },
    ],
    links: [{ rel: "canonical", href: "https://jenvu.com/jx-bot" }],
  }),
  component: JxBotLanding,
});

const SIGN_IN = "https://auth.jenvu.com/sign-in";
const pillDark =
  "inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-[16px] font-medium text-background transition hover:opacity-85";
const pillGrey =
  "inline-flex items-center gap-2 rounded-full bg-muted px-6 py-3 text-[16px] font-medium text-foreground transition hover:bg-gc-line";

/* ---------- shared bits ---------- */

/** JX Bot face: round head with two slanted eyes that blink. */
function JxFace({ className = "", eyes = "bg-background" }: { className?: string; eyes?: string }) {
  return (
    <span className={`relative inline-block rounded-full ${/(^| )bg-/.test(className) ? "" : "bg-foreground"} ${className}`} aria-hidden>
      <span className={`jx-eye absolute left-[24%] top-[14%] h-[30%] w-[17%] rotate-[28deg] rounded-full ${eyes}`} />
      <span className={`jx-eye absolute left-[56%] top-[20%] h-[30%] w-[17%] rotate-[28deg] rounded-full ${eyes}`} />
    </span>
  );
}

function useLoopStep(count: number, ms: number) {
  const [step, setStep] = React.useState(count);
  React.useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setStep(0);
    const t = window.setInterval(() => setStep((s) => (s + 1) % (count + 3)), ms);
    return () => window.clearInterval(t);
  }, [count, ms]);
  return step;
}

function useInView<T extends HTMLElement>() {
  const ref = React.useRef<T>(null);
  const [seen, setSeen] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setSeen(true), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, seen] as const;
}

function GetBot({ label = "Use JX Bot" }: { label?: string }) {
  const { user } = useAuthUser();
  const icon = <ArrowUpRight className="h-4 w-4" />;
  if (user)
    return (
      <Link to="/dashboard/jx-bot" className={pillDark}>
        {icon} {label}
      </Link>
    );
  return (
    <a href={SIGN_IN} className={pillDark}>
      {icon} {label}
    </a>
  );
}


/* ---------- 1. Hero + app window ---------- */

const ACCOUNTS = [
  { name: "Gold M15", note: "Swing found · waiting for close", time: "Now", tone: "bg-foreground" },
  { name: "Daily target", note: "Paused for today at target", time: "Yesterday", tone: "bg-emerald-500" },
  { name: "Risk guard", note: "Stop loss set on every trade", time: "Yesterday", tone: "bg-orange-500" },
  { name: "Licence check", note: "IP matches · plan valid", time: "Yesterday", tone: "bg-sky-500" },
  { name: "Trading hours", note: "Skipping the London open", time: "Mon", tone: "bg-violet-500" },
  { name: "Weekend", note: "Off until Monday", time: "Fri", tone: "bg-rose-500" },
];

const LOG = [
  "✓ Licence → IP matches · plan valid",
  "✓ Trend → H1 higher high + higher low",
  "✓ Candle → M15 closed above the swing",
  "✓ Order → buy 0.02 lot per $1,000 · SL + TP set",
];

function AppWindow() {
  return <Mt5Preview />;
}

function Hero() {
  return (
    <section className="px-5 pb-10 pt-16 text-center md:pt-24">
      <Link
        to="/dashboard/jx-bot"
        className="inline-flex items-center gap-2 text-[14px] text-foreground"
      >
        <span className="font-medium">JX Bot for MetaTrader 5</span>
        <span className="hidden text-muted-foreground sm:inline">· Open the setup guide</span>
        <span className="grid h-6 w-6 place-items-center rounded-full bg-muted">
          <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      </Link>
      <h1 className="mt-6 flex items-center justify-center gap-3 text-[44px] font-medium leading-none tracking-tight text-foreground md:gap-4 md:text-[72px]">
        Meet <JxFace className="jx-float h-[0.9em] w-[0.9em]" /> JX Bot
      </h1>
      <p className="mx-auto mt-6 max-w-[620px] text-[17px] leading-relaxed text-muted-foreground md:text-[20px]">
        A Gold trading bot for MetaTrader 5. It reads XAU/USD on M15, follows clear swing rules and puts a stop loss
        on every trade, so you don't have to watch the chart all day.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <GetBot />
        <Link to="/contact" className={pillGrey}>
          Contact sales
        </Link>
      </div>
      <AppWindow />
    </section>
  );
}

/* ---------- 2. Banner ---------- */

function Banner() {
  return (
    <section className="px-5 py-14">
      <div className="relative mx-auto flex max-w-[1110px] items-center overflow-hidden rounded-[22px] bg-gc-surface md:min-h-[320px] md:overflow-visible">
        <div className="relative z-10 max-w-[460px] p-8 md:p-12">
          <h2 className="text-[28px] font-medium tracking-tight text-foreground md:text-[32px]">Trades with rules, not feelings</h2>
          <p className="mt-4 text-[16px] leading-relaxed text-muted-foreground">
            JX Bot buys after a higher high and higher low, sells after a lower high and lower low, and only acts on
            closed candles. One trade per swing, a stop loss and take profit on every order, and no grid or martingale.
          </p>
        </div>
        <div className="pointer-events-none absolute -bottom-4 right-6 hidden md:block">
          <JxFace className="jx-float h-[360px] w-[360px] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.35)]" />
        </div>
      </div>
    </section>
  );
}

/* ---------- 3. Feature cards ---------- */

function Card({ title, text, children }: { title: string; text: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-[22px] bg-gc-surface">
      <div className="p-7 md:p-8">
        <h3 className="text-[16px] font-medium text-foreground">{title}</h3>
        <p className="mt-1 text-[16px] leading-relaxed text-foreground/80">{text}</p>
      </div>
      <div className="relative mt-auto h-[260px] px-7 md:px-8">{children}</div>
    </div>
  );
}

const aurora = "bg-[linear-gradient(135deg,oklch(0.75_0.12_30),oklch(0.7_0.08_150),oklch(0.55_0.08_220))]";
const aurora2 = "bg-[linear-gradient(180deg,oklch(0.6_0.1_240),oklch(0.78_0.1_20))]";

function MiniScreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-x-[10%] bottom-0 top-8 rounded-t-lg bg-background p-3 shadow-lg">
      <div className="mb-2 flex gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-gc-line" />
        <span className="h-1.5 w-1.5 rounded-full bg-gc-line" />
        <span className="h-1.5 w-1.5 rounded-full bg-gc-line" />
      </div>
      {children}
    </div>
  );
}

function WorksCard() {
  return (
    <Card title="Works inside MetaTrader 5" text="Add your PC or RDP's IP once. The bot checks it with Jenvu on start and trades only while the IP and your plan match.">
      <div className="h-full overflow-hidden rounded-t-2xl bg-muted">
        <div className="flex items-center justify-between px-4 pt-3 text-[13px]">
          <span className="font-medium text-foreground">MetaTrader 5</span>
          <span className="flex items-center gap-1.5 rounded-full bg-amber-100 px-2 py-0.5 text-[12px] text-amber-800">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" /> Checking
          </span>
        </div>
        <p className="px-4 pt-1 text-[13px] text-foreground/80">Jenvu license: VALID · trading XAU/USD M15</p>
        <div className={`relative mx-4 mt-3 h-full overflow-hidden rounded-t-xl ${aurora}`}>
          <MiniScreen>
            {[70, 45, 60, 35, 55].map((w, i) => (
              <div key={i} className="mb-2 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-gc-line" />
                <span className="h-1.5 rounded-full bg-gc-line" style={{ width: `${w}%` }} />
              </div>
            ))}
          </MiniScreen>
        </div>
      </div>
    </Card>
  );
}

function CandlesCard() {
  const bars = [40, 25, 55, 35, 65, 45, 75, 58, 82];
  return (
    <Card title="Checks every candle" text="It follows the H1 trend and skips wide spreads, weak candles and sudden spikes, so some days have fewer trades.">
      <div className="h-full overflow-hidden rounded-t-2xl border border-gc-line bg-background">
        <div className="border-b border-gc-line px-4 py-2 text-[12px] text-muted-foreground">JX Bot is reading XAU/USD M15</div>
        <div className={`relative h-full ${aurora2}`}>
          <MiniScreen>
            <div className="flex h-[150px] items-end gap-2 px-2">
              {bars.map((h, i) => (
                <span key={i} className="jx-bar flex-1 rounded-sm bg-gc-line" style={{ height: `${h}%`, animationDelay: `${i * 0.12}s` }} />
              ))}
            </div>
          </MiniScreen>
        </div>
      </div>
    </Card>
  );
}

function StopCard() {
  return (
    <Card title="Stops at your target" text="It pauses for the day at your plan's daily target or 4% of the balance, and stops for the month at the monthly target.">
      <div className="space-y-2 pt-4">
        <div className="jx-in max-w-[440px] rounded-2xl bg-muted px-4 py-3 text-[14px] text-foreground">
          Daily target reached on this account. No new trades until tomorrow.
        </div>
        <div className="jx-in max-w-[440px] rounded-2xl bg-muted px-4 py-3 text-[14px] text-foreground" style={{ animationDelay: "0.3s" }}>
          Drawdown guard is on at 4.7%. Open trades keep their stop loss.
        </div>
        <div className="pt-3 text-center text-[13px] text-muted-foreground md:max-w-[440px]">
          Status for <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-foreground">Paused · target hit</span>
        </div>
      </div>
    </Card>
  );
}

function HoursCard() {
  const tones = ["bg-emerald-500", "bg-violet-500", "bg-rose-500", "bg-orange-400"];
  return (
    <Card title="Trades at safe hours" text="New trades Mon–Thu 01:00–14:00 and Friday until 13:00 broker time. It skips the London and New York opens and weekends.">
      <div className="grid h-full place-items-center pb-10">
        <div className="flex items-center rounded-full border border-gc-line bg-background p-1 pr-3">
          {tones.map((t, i) => (
            <JxFace key={t} className={`jx-hop -ml-1 h-8 w-8 border-2 border-background first:ml-0 ${t}`} eyes="bg-background" />
          ))}
          <span className="jx-pulse-text ml-2 text-[13px] text-muted-foreground">Waiting for the next session…</span>
        </div>
      </div>
    </Card>
  );
}

function Features() {
  return (
    <section className="px-5 py-14">
      <p className="mx-auto max-w-[620px] text-center text-[18px] leading-relaxed text-foreground md:text-[20px]">
        Download the bot, add your IP and let it run. Each IP works with one MT5 account, and your dashboard shows every
        trade, the daily target and an ON/OFF log.
      </p>
      <div className="mx-auto mt-14 grid max-w-[1110px] gap-5 md:grid-cols-2">
        <WorksCard />
        <CandlesCard />
        <StopCard />
        <HoursCard />
      </div>
    </section>
  );
}

/* ---------- 4. Guides ---------- */

function Guides() {
  return (
    <section className="px-5 py-20 text-center">
      <h2 className="text-[32px] font-medium tracking-tight text-foreground md:text-[36px]">JX Bot Guides</h2>
      <p className="mt-3 text-[17px] text-foreground/80">Install, IP setup, backtesting and fixes for common errors.</p>
      <div className="mt-8">
        <Link to="/help" className={pillGrey}>
          Read the guides
        </Link>
      </div>
    </section>
  );
}

/* ---------- 5. FAQs ---------- */

const FAQS = [
  {
    q: "How is JX Bot different from a signal service?",
    a: "It places trades itself inside your MetaTrader 5, using fixed swing rules on closed M15 candles, with a stop loss and take profit on every order.",
  },
  {
    q: "Who can use JX Bot?",
    a: "Anyone on an active Jenvu plan or the 14-day free trial. Credit alone does not unlock the bot.",
  },
  {
    q: "How many accounts can I run?",
    a: "Each IP works with one MT5 account. Pro allows 1 IP, Elite 2 and Ultra 5.",
  },
  {
    q: "Does JX Bot guarantee profit?",
    a: "No. Trading carries risk and losses happen. Targets are limits the bot stops at, not promised results. Start with a small lot size.",
  },
  {
    q: "Can I backtest it first?",
    a: "Yes. The bot supports the MT5 Strategy Tester, so you can test it on past Gold data before running it live.",
  },
];

function Faqs() {
  const [open, setOpen] = React.useState(0);
  return (
    <section className="px-5 py-20">
      <div className="mx-auto grid max-w-[880px] gap-8 md:grid-cols-2">
        <h2 className="text-[34px] font-medium tracking-tight text-foreground">FAQs</h2>
        <div>
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={f.q} className="border-b border-gc-line">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 py-5 text-left text-[16px] text-foreground"
                >
                  {f.q}
                  <X className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "" : "rotate-45"}`} />
                </button>
                <div className={`grid transition-all duration-300 ${isOpen ? "grid-rows-[1fr] pb-6" : "grid-rows-[0fr]"}`}>
                  <p className="overflow-hidden text-[15px] leading-relaxed text-muted-foreground">{f.a}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------- 6. Closing with outlined face ---------- */

function Closing() {
  const [ref, seen] = useInView<HTMLDivElement>();
  return (
    <section className="overflow-hidden px-5 pt-16 text-center">
      <h2 className="text-[34px] font-medium tracking-tight text-foreground md:text-[40px]">Meet your first Bot</h2>
      <p className="mt-2 text-[16px] text-foreground/80">A Gold trading bot that follows its rules every candle</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <GetBot label="Get started for free" />
        <Link to="/contact" className={pillGrey}>
          Contact sales
        </Link>
      </div>
      <div ref={ref} className="mx-auto mt-10 max-w-[940px]">
        <svg viewBox="0 0 940 470" className={`w-full text-gc-line ${seen ? "jx-draw" : "jx-undrawn"}`} fill="none" aria-hidden>
          <path d="M2 470 A468 468 0 0 1 938 470" stroke="currentColor" strokeWidth="2" pathLength={1} />
          <path d="M258 470 V390 A58 58 0 0 1 374 390 V470" stroke="currentColor" strokeWidth="2" pathLength={1} />
          <path d="M548 470 V392 A58 58 0 0 1 664 392 V470" stroke="currentColor" strokeWidth="2" pathLength={1} />
        </svg>
      </div>
    </section>
  );
}

function JxBotLanding() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main>
        <Hero />
        <Banner />
        <Features />
        <Guides />
        <Faqs />
        <Closing />
      </main>
      <BlogFooter />
    </div>
  );
}
