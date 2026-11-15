import type { ComponentType } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Award, BarChart3, BookOpen, CandlestickChart, Clock, Code2, Newspaper, Sparkles } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import BlogFooter from "@/components/BlogFooter";
import { pillBlue, pillOutline } from "@/components/PageShell";
import { STORIES } from "@/lib/stories";
import { PUBLIC_API_MODEL_IDS } from "@/lib/public-api-models";
import { DAILY_DRAWDOWN_PCT } from "@/lib/mt5-licenses";
import { RELEASES_PER_EVENT } from "@/lib/news-impact";
import { FOUNDING_APPLICATIONS_OPEN } from "@/lib/founding-seats";
import metaTraderLogo from "@/assets/metatrader5-logo.png.asset.json";
import pythonLogo from "@/assets/platform-logos/python.svg";
import openAiLogo from "@/assets/model-logos/openai.svg";
import claudeLogo from "@/assets/model-logos/claude-color.svg";
import geminiLogo from "@/assets/model-logos/gemini-color.svg";

const TITLE = "Stories: how Jenvu works with MT5, AI models, news and Python";
const DESCRIPTION =
  "Real workflows behind Jenvu: JX Bot on MetaTrader 5, one API key for many AI models, Gold news reactions and Python examples, plus product updates.";
const SANS = "font-['Google_Sans_Flex','Google_Sans','Product_Sans','Poppins',system-ui,sans-serif]";

export const Route = createFileRoute("/stories/")({
  head: () => ({
    meta: [
      { title: `${TITLE} — Jenvu` },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: "https://jenvu.com/stories" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://jenvu.com/stories" }],
  }),
  component: StoriesIndex,
});

/*
 * Review-style cards (customer-stories layout). Every quote is written by the
 * Jenvu team about its own product: no invented customers, people or results.
 */
type Card = {
  brand: string;
  logos?: { src: string; mono?: boolean }[];
  icon?: ComponentType<{ className?: string }>;
  quote: string;
  /** Who uses this: the people on that platform Jenvu helps. */
  audience: string;
  role: string;
};

const MT5 = [{ src: metaTraderLogo.url }];

const CARDS: Record<string, Card> = {
  "jx-bot-on-metatrader-5": {
    brand: "MetaTrader 5",
    logos: MT5,
    quote: `Traders who already run MetaTrader 5 add JX Bot to their own terminal. Jenvu checks their registered IP, manages the EUR/USD basket and stops for the day at the plan's target or ${DAILY_DRAWDOWN_PCT}% below the day's peak balance.`,
    audience: "MetaTrader 5 traders",
    role: "JX Bot for MT5",
  },
  "one-api-many-models": {
    brand: "Jenvu API",
    logos: [{ src: openAiLogo, mono: true }, { src: claudeLogo }, { src: geminiLogo }],
    quote: `Developers who use OpenAI, Claude and Gemini keep one Jenvu key instead of three accounts. They change the model field to reach any of ${PUBLIC_API_MODEL_IDS.length} models, and every call lands on one Usage page and one balance.`,
    audience: "OpenAI and Claude users",
    role: "Jenvu API and Models",
  },
  "news-impact-on-gold": {
    brand: "News Impact",
    icon: Newspaper,
    quote: `Traders who watch CPI, NFP and FOMC use Jenvu to see how Gold moved after the last ${RELEASES_PER_EVENT} releases when the number beat or missed, so they prepare with history instead of guessing. It is not a forecast.`,
    audience: "Gold news traders",
    role: "News trading",
  },
  "gold-analysis-in-python": {
    brand: "Python",
    logos: [{ src: pythonLogo }],
    quote: "Developers who write Python point the OpenAI package at Jenvu, add their key and get a Gold market assistant in a few lines, with the key kept in an environment variable, never in public code.",
    audience: "Python developers",
    role: "Developers",
  },
  "fresh-sweep-detection": {
    brand: "Jenvu Terminal",
    icon: CandlestickChart,
    quote: "Traders who read liquidity on TradingView-style charts use the Jenvu Terminal to see fresh sweeps on 5M to 4H, marked from closed candles only. Labels help them read the chart; they are never a trade signal.",
    audience: "Price-action traders",
    role: "Terminal",
  },
  "ai-desk-updates": {
    brand: "Jenvu AI",
    icon: Sparkles,
    quote: "Traders who ask AI about the chart get answers based on the chart they see. When the evidence isn't strong enough, Jenvu AI says WAIT instead of forcing a setup, and it never promises a win rate.",
    audience: "Traders who ask AI",
    role: "AI desk",
  },
  "rvol-and-volume-direction": {
    brand: "Volume",
    icon: BarChart3,
    quote: "Traders who follow volume see RVOL spikes against the last 20 candles and an estimated buyer/seller share. Gold has no single central feed, so Jenvu labels the split as an estimate.",
    audience: "Volume traders",
    role: "Terminal",
  },
  "daily-gold-insights": {
    brand: "Jenvu Insights",
    icon: BookOpen,
    quote: "People learning Gold read Jenvu's daily insights and guides to understand the market one day at a time. Education, not financial advice.",
    audience: "Gold learners",
    role: "Insights",
  },
  "jx-bot": {
    brand: "JX Bot",
    logos: MT5,
    quote: "Traders who want EUR/USD automation on MT5 run JX Bot on the M15 chart with 0.05 lot per $1,000 of balance and clear daily limits. The target is where it stops for the day, not a promised result.",
    audience: "EUR/USD traders on MT5",
    role: "JX Bot for MT5",
  },
  "founding-program": {
    brand: "Founding Program",
    icon: Award,
    quote: FOUNDING_APPLICATIONS_OPEN
      ? "The Founding Program is invite-only and every application is reviewed by our team. Applications are open now."
      : "The Founding Program is invite-only and every application is reviewed by our team. Applications are closed for now and will reopen here.",
    audience: "Founding members",
    role: "Founding Program",
  },
  "london-new-york-sessions": {
    brand: "Sessions",
    icon: Clock,
    quote: "Traders who plan around sessions see London and New York zones drawn on the chart, so they always know when the market is awake, and the weekend closure is handled for them.",
    audience: "Session traders",
    role: "Terminal",
  },
  "build-with-jenvu": {
    brand: "Jenvu for developers",
    icon: Code2,
    quote: "Developers use Jenvu models with API keys from the dashboard or through the browser extension, and pay only for the tokens they use.",
    audience: "Extension users",
    role: "Developers",
  },
};

function BrandMark({ card }: { card: Card }) {
  return (
    <div className="flex h-10 items-center gap-3 text-gc-ink">
      {card.logos ? (
        <span className="flex items-center gap-1.5">
          {card.logos.map((l, i) => (
            <img
              key={i}
              src={l.src}
              alt=""
              width={32}
              height={32}
              loading="lazy"
              decoding="async"
              className={`h-8 w-8 object-contain ${l.mono ? "dark:invert" : ""}`}
            />
          ))}
        </span>
      ) : card.icon ? (
        <card.icon className="h-8 w-8" />
      ) : null}
      <span className="text-[26px] font-semibold tracking-tight">{card.brand}</span>
    </div>
  );
}

/** Bottom-bar mark: the platform these users work on (never a stock face). */
function AudienceMark({ card }: { card: Card }) {
  const logo = card.logos?.[0];
  return (
    <span
      aria-hidden
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-gc-line bg-gc-pill"
    >
      {logo ? (
        <img src={logo.src} alt="" width={26} height={26} loading="lazy" decoding="async" className={`h-[26px] w-[26px] object-contain ${logo.mono ? "dark:invert" : ""}`} />
      ) : card.icon ? (
        <card.icon className="h-5 w-5 text-gc-ink" />
      ) : (
        <span className="text-[18px] font-semibold text-gc-ink">J</span>
      )}
    </span>
  );
}

function StoriesIndex() {
  return (
    <div className={`public-cloudflare min-h-dvh w-full bg-background text-foreground ${SANS} antialiased`}>
      <SiteHeader />

      <div className="bg-gc-pill/50">
        {/* Hero */}
        <section className="mx-auto max-w-3xl px-5 pb-14 pt-16 text-center sm:px-8 sm:pb-16 sm:pt-24">
          <p className="font-mono text-[13px] tracking-[0.18em] text-gc-ink">STORIES</p>
          <h1 className="mt-4 text-[2.4rem] font-medium leading-[1.08] tracking-tight text-gc-ink sm:text-[3.4rem]">
            How traders and developers use Jenvu
          </h1>
          <p className="mx-auto mt-5 max-w-[460px] text-[16px] leading-[1.6] text-gc-ink-muted">
            Explore how Jenvu works with MetaTrader 5, AI models, economic news and Python to build automated and AI-assisted trading.
          </p>
          <Link to="/contact" className={`mt-8 ${pillBlue}`}>
            Contact sales
          </Link>
        </section>

        {/* Review cards */}
        <section className="mx-auto max-w-[1140px] px-5 pb-20 sm:px-8 sm:pb-24">
          <div className="grid gap-6 md:grid-cols-2">
            {STORIES.map((s) => {
              const card = CARDS[s.slug] ?? { brand: s.title, icon: BookOpen, quote: s.intro, audience: "Jenvu users", role: "Jenvu" };
              return (
                <article
                  key={s.slug}
                  className="flex flex-col rounded-xl border border-gc-line bg-background p-6 transition-shadow hover:shadow-lg sm:p-7"
                >
                  <BrandMark card={card} />
                  <blockquote className="mt-6 flex flex-1 items-center rounded-xl bg-gc-pill/70 p-6 text-[18px] leading-[1.5] text-gc-ink sm:text-[19px]">
                    <p>"{card.quote}"</p>
                  </blockquote>
                  <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <AudienceMark card={card} />
                      <div className="min-w-0">
                        <p className="text-[15px] font-semibold text-gc-ink">{card.audience}</p>
                        <p className="text-[13px] text-gc-ink-muted">Jenvu · {card.role}</p>
                      </div>
                    </div>
                    <Link to="/stories/$slug" params={{ slug: s.slug }} className={pillBlue} aria-label={`Read case study: ${s.title}`}>
                      Read case study
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>

      {/* Closing call to action */}
      <section className="bg-background px-5 py-24 text-center sm:py-32">
        <h2 className="text-[2.2rem] font-medium leading-[1.1] tracking-tight text-gc-ink sm:text-[3rem]">
          Intelligence built for your trading
        </h2>
        <p className="mx-auto mt-5 max-w-[420px] text-[16px] leading-[1.6] text-gc-ink-muted">
          Gold and forex analysis, AI models and JX Bot in one place. Give your trading the context it needs.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/dashboard" className={pillBlue}>
            Go to dashboard
          </Link>
          <Link to="/pricing" className={pillOutline}>
            See pricing
          </Link>
        </div>
      </section>

      <div className="hide-in-pwa"><BlogFooter /></div>
    </div>
  );
}
