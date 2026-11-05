import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import { ArrowUpRight, X } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import BlogFooter from "@/components/BlogFooter";
import BotCodingPreview from "@/components/jxbot/BotCodingPreview";
import { JxFace, JxBotFeatures } from "@/components/jxbot/JxBotFeatures";
import { useAuthUser } from "@/hooks/useAuthUser";

export const Route = createFileRoute("/jx-bot")({
  head: () => ({
    meta: [
      { title: "JX Bot — Jenvu's EUR/USD trading bot for MetaTrader 5" },
      {
        name: "description",
        content:
          "How JX Bot works: an EUR/USD M15 swing bot for MetaTrader 5 with a stop loss on every trade, safe trading hours, daily auto-stop and IP licensing.",
      },
      { property: "og:title", content: "JX Bot — Jenvu's EUR/USD trading bot for MetaTrader 5" },
      {
        property: "og:description",
        content: "An EUR/USD M15 swing bot for MT5: stop loss on every trade, safe hours, daily auto-stop and IP licensing.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://jenvu.com/jx-bot" },
    ],
    links: [{ rel: "canonical", href: "https://jenvu.com/jx-bot" }],
  }),
  component: JxBotLanding,
});

const pillDark =
  "inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-[16px] font-medium text-background transition hover:opacity-85";
const pillGrey =
  "inline-flex items-center gap-2 rounded-full bg-gc-pill px-6 py-3 text-[16px] font-medium text-foreground transition hover:brightness-95";

/* ---------- shared bits ---------- */

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
    <Link to="/auth" className={pillDark}>
      {icon} {label}
    </Link>
  );
}


/* ---------- 1. Hero + app window ---------- */

function AppWindow() {
  return <BotCodingPreview />;
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
        An EUR/USD trading bot for MetaTrader 5. It reads EUR/USD only on M15, follows clear swing rules and puts a stop loss
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
          <h2 className="text-[28px] font-medium tracking-tight text-foreground md:whitespace-nowrap md:text-[32px]">Trades with rules, not feelings</h2>
          <p className="mt-4 text-[16px] leading-relaxed text-muted-foreground">
            JX Bot buys after a higher high and higher low, sells after a lower high and lower low, and only acts on
            closed candles. One trade per swing, a stop loss and take profit on every order
          </p>
        </div>
        <div className="pointer-events-none absolute -bottom-4 right-6 hidden md:block">
          <JxFace className="jx-float h-[340px] w-[340px] drop-shadow-[0_24px_30px_rgba(0,0,0,0.25)]" />
        </div>
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
    a: "Yes. The bot supports the MT5 Strategy Tester, so you can test it on past EUR/USD data before running it live.",
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
      <p className="mt-2 text-[16px] text-foreground/80">An EUR/USD trading bot that follows its rules every candle</p>
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
        <JxBotFeatures />
        <Guides />
        <Faqs />
        <Closing />
      </main>
      <BlogFooter />
    </div>
  );
}
