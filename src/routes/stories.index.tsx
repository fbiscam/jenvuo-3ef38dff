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
  role: string;
};

const MT5 = [{ src: metaTraderLogo.url }];

const CARDS: Record<string, Card> = {
  "jx-bot-on-metatrader-5": {
    brand: "MetaTrader 5",
    logos: MT5,
    quote: `We built JX Bot to run inside your own MetaTrader 5 with no licence key to share. You register your IP, the bot checks it with Jenvu, and it stops for the day at your plan's target or ${DAILY_DRAWDOWN_PCT}% below the day's peak balance.`,
    role: "JX Bot for MT5",
  },
  "one-api-many-models": {
    brand: "Jenvu API",
    logos: [{ src: openAiLogo, mono: true }, { src: claudeLogo }, { src: geminiLogo }],
    quote: `One key, one endpoint, ${PUBLIC_API_MODEL_IDS.length} models. Change the model field and the same code talks to Claude, GPT, Gemini, Grok or DeepSeek, and every call shows up on your Usage page.`,
    role: "Jenvu API and Models",
  },
  "news-impact-on-gold": {
    brand: "News Impact",
    icon: Newspaper,
    quote: `Before every CPI, NFP or FOMC release we show how Gold moved after the last ${RELEASES_PER_EVENT} releases when the number beat or missed. It's history to help you prepare, not a forecast.`,
    role: "News trading",
  },
  "gold-analysis-in-python": {
    brand: "Python",
    logos: [{ src: pythonLogo }],
    quote: "Point the OpenAI Python package at Jenvu, add your key, and you have a Gold market assistant in a few lines. Keep the key in an environment variable, never in public code.",
    role: "Developers",
  },
  "fresh-sweep-detection": {
    brand: "Jenvu Terminal",
    icon: CandlestickChart,
    quote: "Fresh sweeps are marked on 5M, 15M, 1H, 2H and 4H from closed candles only, so you see where liquidity was taken and how price reacted. Labels help you read the chart; they are never a trade signal.",
    role: "Terminal",
  },
  "ai-desk-updates": {
    brand: "Jenvu AI",
    icon: Sparkles,
    quote: "The AI desk reads the chart you see and answers the question you asked. When the evidence isn't strong enough, it says WAIT instead of forcing a setup, and it never promises a win rate.",
    role: "AI desk",
  },
  "rvol-and-volume-direction": {
    brand: "Volume",
    icon: BarChart3,
    quote: "Every candle shows RVOL spikes against the last 20 candles and an estimated buyer/seller share. Gold has no single central feed, so we label the split as an estimate.",
    role: "Terminal",
  },
  "daily-gold-insights": {
    brand: "Jenvu Insights",
    icon: BookOpen,
    quote: "Daily Gold insights and trading guides that teach the market one day at a time. Education, not financial advice.",
    role: "Insights",
  },
  "jx-bot": {
    brand: "JX Bot",
    logos: MT5,
    quote: "JX Bot trades EUR/USD on the M15 chart with 0.05 lot per $1,000 of balance and clear daily limits. The target is where it stops for the day, not a result we promise.",
    role: "JX Bot for MT5",
  },
  "founding-program": {
    brand: "Founding Program",
    icon: Award,
    quote: FOUNDING_APPLICATIONS_OPEN
      ? "The Founding Program is invite-only and every application is reviewed by our team. Applications are open now."
      : "The Founding Program is invite-only and every application is reviewed by our team. Applications are closed for now and will reopen here.",
    role: "Founding Program",
  },
  "london-new-york-sessions": {
    brand: "Sessions",
    icon: Clock,
    quote: "London and New York session zones are drawn on the chart so you always know when the market is awake, and the weekend closure is handled for you.",
    role: "Terminal",
  },
  "build-with-jenvu": {
    brand: "Jenvu for developers",
    icon: Code2,
    quote: "Use Jenvu models with API keys from your dashboard or through the browser extension, and pay only for the tokens you use.",
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
              const card = CARDS[s.slug] ?? { brand: s.title, icon: BookOpen, quote: s.intro, role: "Jenvu" };
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
                      <span
                        aria-hidden
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-foreground text-[18px] font-semibold text-background"
                      >
                        J
                      </span>
                      <div className="min-w-0">
                        <p className="text-[15px] font-semibold text-gc-ink">Jenvu team</p>
                        <p className="text-[13px] text-gc-ink-muted">{card.role}</p>
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
