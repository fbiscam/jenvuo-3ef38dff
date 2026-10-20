import { createFileRoute } from "@tanstack/react-router";
import { IndustryPage, type IndustryContent } from "@/components/industry/IndustryPage";
import solHero from "@/assets/industry/sol-hero.jpg";
import solStructure from "@/assets/industry/sol-structure.jpg";
import solLiquidity from "@/assets/industry/sol-liquidity.jpg";
import solSessions from "@/assets/industry/sol-sessions.jpg";

const URL = "https://jenvu.com/strategies/ict-gold-trading";
const TITLE = "Solutions for Gold Traders — ICT & SMC on XAU/USD | Jenvu";
const DESC =
  "Jenvu solutions for gold traders: ICT and Smart Money Concepts on XAU/USD with rule-based structure, liquidity sweeps, fair value gaps, zones and sessions.";

export const Route = createFileRoute("/strategies/ict-gold-trading")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: () => <IndustryPage c={CONTENT} />,
});

const CONTENT: IndustryContent = {
  variant: "solutions",
  heroImg: solHero,
  pill: "Solutions for gold traders",
  title: "Trade gold with clear, rule-based structure",
  intro:
    "Jenvu marks ICT and Smart Money Concepts on live XAU/USD candles with fixed rules, so the same chart always shows the same levels.",
  heroCaption: "Structure, liquidity and zones drawn the same way every time.",
  solutionsTitle: "Solutions for every gold trader",
  solutionsIntro: "Pick the part of your process you want help with.",
  solutions: [
    {
      img: solStructure,
      title: "Read market structure",
      text: "Swing highs and lows, BOS and CHoCH labels on closed candles, across M15 to 4H.",
      link: "Explore structure",
      href: "https://jenvu.com/docs",
    },
    {
      img: solLiquidity,
      title: "Track liquidity",
      text: "Fresh sweeps on 5M, 15M, 1H, 2H and 4H, shown only after a reclaim and reversal confirm.",
      link: "Explore sweeps",
      href: "/stories/fresh-sweep-detection",
    },
    {
      img: solSessions,
      title: "Plan around sessions",
      text: "London and New York windows, weekly candle timer and weekend closure on one chart.",
      link: "Explore sessions",
      href: "/stories/london-new-york-sessions",
    },
  ],
  topicsTitle: "Key ICT and SMC topics",
  topics: [
    {
      label: "Market structure",
      title: "Market structure",
      text: "Structure tells you who is in control. Jenvu confirms swings on closed candles only.",
      points: ["Swing highs and lows with a fixed lookback", "BOS when price closes beyond a swing", "CHoCH when the trend flips"],
      link: "Read the guide",
      href: "https://jenvu.com/docs",
    },
    {
      label: "Liquidity sweeps",
      title: "Liquidity sweeps",
      text: "A sweep takes out a high or low and then closes back inside. Tiny pokes are ignored.",
      points: ["Wick beyond the level, close back inside", "Two-candle reversal confirmation", "Display only, never a trade signal"],
      link: "See how sweeps work",
      href: "/stories/fresh-sweep-detection",
    },
    {
      label: "Fair value gaps",
      title: "Fair value gaps",
      text: "A three-candle gap shows fast, one-sided price movement that price often revisits.",
      points: ["Bullish and bearish gaps marked separately", "Filled gaps fade out", "Used as confluence for fresh swings"],
      link: "Open the Terminal",
      href: "https://dash.jenvu.com/terminal",
    },
    {
      label: "Supply and demand",
      title: "Supply and demand zones",
      text: "Zones show where price left quickly. Overlapping zones are merged, never stacked.",
      points: ["Fresh zones in full colour", "Optional faded prior zones", "Zones never overlap BSL/SSL lines"],
      link: "Open the Terminal",
      href: "https://dash.jenvu.com/terminal",
    },
    {
      label: "Risk",
      title: "Risk comes first",
      text: "Concepts describe probabilities, not certainties. Size every trade so a loss is affordable.",
      points: ["Practise on the $100,000 demo account", "Use a stop on every trade", "Read the risk disclaimer"],
      link: "Read the disclaimer",
      href: "https://jenvu.com/disclaimer",
    },
  ],
  whyTitle: "Why traders choose Jenvu",
  why: [
    { title: "Same candles, same marks", text: "Every level comes from fixed rules, so you can trust what you see and test it again later." },
    { title: "Built only for gold", text: "Sessions, volatility and weekend closure are tuned for XAU/USD instead of a generic market." },
    { title: "AI that explains, not invents", text: "The AI reads the marks the rules draw and explains them in plain language. It does not create levels." },
    { title: "Practise before risking money", text: "A $100,000 demo account lets you test ideas on live candles with no real money at risk." },
  ],
  whyCardTitle: "Rules first, AI second.",
  whyCardText: "Jenvu does not promise profits or fixed win rates. Trading gold carries real risk.",
  storiesTitle: "Stories from the gold desk",
  storySlugs: ["fresh-sweep-detection", "london-new-york-sessions", "demo-trading"],
  productsTitle: "Products that power these solutions",
  products: [
    { title: "Jenvu Terminal", text: "Live gold candles with ICT/SMC overlays and AI chat.", href: "https://dash.jenvu.com/terminal" },
    { title: "AI engine", text: "Ask about the chart and get short, on-topic answers.", href: "/ai-engine" },
    { title: "Demo trading", text: "Practise on a $100,000 demo account with live prices.", href: "/stories/demo-trading" },
    { title: "Price alerts", text: "Get told when gold reaches the level you care about.", href: "https://jenvu.com/docs" },
    { title: "Daily gold insights", text: "A short daily read on what moved gold and why.", href: "/stories/daily-gold-insights" },
    { title: "Developer API", text: "Use Jenvu analysis in your own tools with API keys.", href: "/stories/build-with-jenvu" },
    { title: "Volume and RVOL", text: "Spot volume spikes and buyer/seller share per candle.", href: "/stories/rvol-and-volume-direction" },
    { title: "Founding Program", text: "Invite-only early access for committed gold traders.", href: "https://jenvu.com/founding" },
    { title: "Help and support", text: "Guides and answers for every part of Jenvu.", href: "https://support.jenvu.com" },
  ],
};
