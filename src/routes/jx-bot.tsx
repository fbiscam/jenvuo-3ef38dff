import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import { ArrowUpRight } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import PublicFaqs from "@/components/PublicFaqs";
import BotCodingPreview from "@/components/jxbot/BotCodingPreview";
import { JxFace, JxBotFeatures } from "@/components/jxbot/JxBotFeatures";
import { useAuthUser } from "@/hooks/useAuthUser";
import { DAILY_DRAWDOWN_PCT } from "@/lib/mt5-licenses";

export const Route = createFileRoute("/jx-bot")({
  head: () => ({
    meta: [
      { title: "JX Bot — Jenvu's H1 swing trading bot for MetaTrader 5" },
      {
        name: "description",
        content:
          "How JX Bot works: a multi-pair H1 swing bot for MetaTrader 5 with a stop loss on every trade, a news blackout, daily auto-stop and IP licensing.",
      },
      { property: "og:title", content: "JX Bot — Jenvu's H1 swing trading bot for MetaTrader 5" },
      {
        property: "og:description",
        content: "A multi-pair H1 swing bot for MT5: stop loss on every trade, news pause, daily auto-stop and IP licensing.",
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
    <Link to="/auth" search={{ mode: "signup" } as never} className={pillDark}>
      {icon} Sign up
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
        <span className="md:hidden">
          <span className="block">Gold, EUR/USD, BTC for MT5.</span>
          <span className="block">H1 swing rules and protection.</span>
          <span className="block">No need to watch charts all day.</span>
        </span>
        <span className="hidden md:inline">
          A swing trading bot for MetaTrader 5. It trades Gold, EUR/USD, BTC hourly, follows clear swing-to-swing rules and puts a stop loss
          on every trade, so you don't have to watch the chart all day.
        </span>
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
            JX Bot waits for a fresh H1 high or low with a Liquidity Sweep or Price Action, enters on the next closed
            candle, puts the stop loss at the swing wick and exits at the next opposite swing. One trade per pair.
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
    q: "How is JX Bot different?",
    a: "It places trades itself inside your MetaTrader 5, using fixed swing rules on closed H1 candles, the same swing, Liquidity Sweep and Price Action checks you see in the Jenvu Terminal, with a stop loss and swing exit on every order.",
  },
  {
    q: "Who can use JX Bot?",
    a: "JX Bot comes with every paid plan (Pro $69, Elite $139, Ultra $239 a month), with no limit on how many people can join. Free accounts get it too with a $10 daily target and 1 IP. Pro (2%, 1 IP), Elite (4%, 3 IPs) and Ultra (6%, 4 IPs) stop at a percentage of the day's starting balance. Daily profit targets are maximum safety caps — profit is not guaranteed.",
  },
  {
    q: "How many accounts can I use?",
    a: "Each IP works with one MT5 account. Pro allows 1 IP, Elite 3 and Ultra 4.",
  },
  {
    q: "Is profit guaranteed?",
    a: "No. Trading carries risk and losses happen. Targets are limits the bot stops at, not promised results. Start with a small lot size.",
  },
  {
    q: "Can I use it with The5ers?",
    a: "The5ers support told us JX Bot looks consistent with their EA rules: a visible hard stop loss on every trade, no martingale, grid, tick scalping or arbitrage, and EUR/USD itself isn't restricted. Rules differ by firm and can change, so check yours first.",
  },
  {
    q: "What if my VPS IP changes?",
    a: "Delete the old IP in Dashboard → JX Bot, add the new one and type it into MyIP. The5ers said a new VPS IP isn't a rule break by itself on your own account; never use a VPS or VPN to hide your location.",
  },
  {
    q: "Can I check trades on mobile?",
    a: "Yes. You can stay logged in on the MT5 phone app while the bot runs on your VPS. Use the investor (read-only) password and don't place manual trades on that account.",
  },
  {
    q: "Does the bot avoid news?",
    a: `Yes. It opens no new trades from one hour before to one hour after high-impact news, books winners before the release, exits losers near +2 pips and closes everything at a 4.5% daily loss. Friday after 20:00 UTC it stops too.`,
  },
  {
    q: "Can I backtest it first?",
    a: "Yes. The bot runs in the MT5 Strategy Tester (no IP check there), so you can test it on past H1 data. Test on a demo account before going live.",
  },
];

function Faqs() {
  return <PublicFaqs faqs={FAQS} />;
}

/* ---------- 6. Closing with outlined face ---------- */

function Closing() {
  const [ref, seen] = useInView<HTMLDivElement>();
  return (
    <section className="overflow-hidden px-5 pt-16 text-center">
      <h2 className="text-[34px] font-medium tracking-tight text-foreground md:text-[40px]">Meet your first Bot</h2>
      <p className="mt-2 text-[16px] text-foreground/80">An H1 swing bot for Gold, EUR/USD and BTC that follows its rules every candle</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <GetBot label="Open JX Bot" />
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
      <main className="jx-mobile-content">
        <Hero />
        <Banner />
        <JxBotFeatures />
        <Guides />
        <Faqs />
        <Closing />
      </main>
      <SiteFooter />
    </div>
  );
}
