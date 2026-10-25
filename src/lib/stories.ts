import cardTopStory from "@/assets/home/card-top-story.jpg";
import cardAi from "@/assets/home/card-ai.jpg";
import cardWave from "@/assets/home/card-wave.jpg";
import cardGold from "@/assets/home/card-gold.jpg";
import placeFloor from "@/assets/home/place-floor.jpg";
import placeVault from "@/assets/home/place-vault.jpg";
import placeLondon from "@/assets/home/place-london.jpg";
import placeDev from "@/assets/home/place-dev.jpg";

export type Story = {
  slug: string;
  img: string;
  tag: string;
  title: string;
  intro: string;
  feature: { title: string; text: string[]; caption: string };
  banner: { title: string; text: string };
  steps: { title: string; points: string[] };
  stats: { value: string; label: string }[];
  cta: { label: string; href: string };
};

export const STORIES: Story[] = [
  {
    slug: "fresh-sweep-detection",
    img: cardTopStory,
    tag: "TOP STORY",
    title: "Fresh sweep detection now on 5M, 15M, 1H, 2H and 4H",
    intro:
      "The Terminal now marks fresh liquidity sweeps on five timeframes, so you can see when price takes a recent high or low and turns back.",
    feature: {
      title: "See the sweep, then the reaction",
      text: [
        "A sweep happens when price runs past a recent swing high or low, grabs the orders resting there, and closes back inside the range.",
        "Jenvu checks the last 10 closed candles for that liquidity, ignores tiny pokes, and only labels a sweep once price reclaims the level and shows a real reversal within two candles.",
      ],
      caption: "A fresh sell-side sweep followed by a bullish reversal",
    },
    banner: {
      title: "Display only, never a trade signal",
      text: "Sweep labels help you read the chart. They never set an entry, stop loss or take profit on their own, and late or failed sweeps are marked so you don't chase them.",
    },
    steps: {
      title: "How the sweep check works",
      points: [
        "Uses closed candles only, so labels don't repaint while a candle is still forming.",
        "Looks back 10 candles for the most recent swing high (BSL) or swing low (SSL).",
        "Filters out tiny wicks that barely touch the level.",
        "Needs a reclaim and a reversal candle within two candles to confirm.",
        "Turn Fresh sweep and Swing price action on or off separately from the chart menu.",
      ],
    },
    stats: [
      { value: "5", label: "Timeframes: 5M, 15M, 1H, 2H, 4H" },
      { value: "10", label: "Candles checked for liquidity" },
      { value: "2", label: "Candles to confirm the reversal" },
    ],
    cta: { label: "Open the Terminal", href: "https://dash.jenvu.com/terminal" },
  },
  {
    slug: "ai-desk-updates",
    img: cardAi,
    tag: "AI ANNOUNCEMENTS",
    title: "What's new in the Jenvu AI desk this month",
    intro:
      "The AI desk reads the same chart you see and answers the question you asked, in plain language, without padding.",
    feature: {
      title: "Answers that stay on topic",
      text: [
        "Ask about structure, a zone, a sweep or the news, and the AI replies to exactly that question.",
        "When the evidence isn't strong enough or risk is too high, it says WAIT instead of forcing a setup.",
      ],
      caption: "The AI desk explains what's on the chart in plain words",
    },
    banner: {
      title: "Honest by design",
      text: "The AI never claims personal trading experience and never promises a fixed win rate. It explains what the chart shows and where the risk is.",
    },
    steps: {
      title: "What you can ask",
      points: [
        "\"What's the current bias on the 1H?\"",
        "\"Is this demand zone still valid?\"",
        "\"Was that a real sweep or a fakeout?\"",
        "\"Is there high-impact news coming up?\"",
      ],
    },
    stats: [
      { value: "7", label: "Rule-based engines behind each answer" },
      { value: "1", label: "Market in focus: Fiber" },
      { value: "6", label: "Checks before any setup is shown" },
    ],
    cta: { label: "Learn about the AI engine", href: "https://jenvu.com/ai-engine" },
  },
  {
    slug: "rvol-and-volume-direction",
    img: cardWave,
    tag: "VOLUME",
    title: "RVOL spikes and buyer/seller share on every candle",
    intro:
      "See when volume is unusually high and get an estimate of how much of each candle leaned toward buyers or sellers.",
    feature: {
      title: "Volume you can read at a glance",
      text: [
        "RVOL compares each candle's volume with the average of the last 20 candles, so spikes stand out right away.",
        "The buyer/seller split is estimated from where the candle closed inside its range. It's a helpful guide, not real order-flow data.",
      ],
      caption: "Volume bars with RVOL spikes and estimated buy/sell share",
    },
    banner: {
      title: "An estimate, clearly labelled",
      text: "Fiber trades across many venues, so no single feed shows the whole market. Jenvu labels the buy/sell split as an estimate and uses volume for display only.",
    },
    steps: {
      title: "How to use it",
      points: [
        "Look for RVOL spikes near zones, sweeps or session opens.",
        "Compare the estimated buyer share with the candle's direction.",
        "Use it together with structure, not on its own.",
      ],
    },
    stats: [
      { value: "20", label: "Candles in the RVOL average" },
      { value: "2", label: "Sides shown: buyers and sellers" },
      { value: "1", label: "Volume panel on the chart" },
    ],
    cta: { label: "Read the volume guide", href: "https://jenvu.com/docs" },
  },
  {
    slug: "daily-gold-insights",
    img: cardGold,
    tag: "\n",
    title: "Daily Fiber insights and trading guides",
    intro:
      "Short daily reads on Fiber, plus longer guides that explain ICT and SMC ideas in simple language.",
    feature: {
      title: "Learn the market one day at a time",
      text: [
        "Each insight covers what moved Fiber, which levels matter, and what to watch in the next session.",
        "Guides walk through structure, zones, fair value gaps and liquidity with clear chart examples.",
      ],
      caption: "Daily notes and guides from the Jenvu team",
    },
    banner: {
      title: "Education, not financial advice",
      text: "Insights explain the market. They are not trade instructions. Always manage your own risk.",
    },
    steps: {
      title: "What you'll find",
      points: [
        "Daily Fiber market notes.",
        "Step-by-step ICT and SMC guides.",
        "Session and killzone explainers.",
        "A glossary of every term used on the chart.",
      ],
    },
    stats: [
      { value: "1", label: "Market covered: Fiber" },
      { value: "A–Z", label: "Glossary of chart terms" },
      { value: "Free", label: "To read for everyone" },
    ],
    cta: { label: "Read the insights", href: "https://jenvu.com/insights" },
  },
  {
    slug: "jx-bot",
    img: placeFloor,
    tag: "JX BOT FOR MT5",
    title: "Let JX Bot trade Fiber for you on MetaTrader 5",
    intro:
      "JX Bot is Jenvu's Expert Advisor for Fiber on MT5. It runs on your own account and stops at the targets your plan sets.",
    feature: {
      title: "Automated Fiber trading with clear limits",
      text: [
        "Download the bot from your dashboard, create a license for your MT5 account and attach it to the EURUSD M15 chart.",
        "The bot checks its license with Jenvu, pauses for the day at your daily target and stops at your monthly target.",
      ],
      caption: "JX Bot running on the EURUSD M15 chart in MetaTrader 5",
    },
    banner: {
      title: "Targets are limits, not promises",
      text: "Trading carries risk. The daily and monthly targets are where the bot stops, not results it guarantees. Start with a small lot size.",
    },
    steps: {
      title: "How to start",
      points: [
        "Choose Pro, Elite or Ultra on the pricing page.",
        "Open JX Bot in your dashboard and download the bot.",
        "Create a license for your MT5 account and follow the install steps.",
      ],
    },
    stats: [
      { value: "1–5", label: "MT5 licenses per plan" },
      { value: "$150", label: "Daily target on Ultra" },
      { value: "M15", label: "Fiber chart" },
    ],
    cta: { label: "See plans", href: "https://jenvu.com/pricing" },
  },
  {
    slug: "founding-program",
    img: placeVault,
    tag: "FOUNDING PROGRAM",
    title: "Apply to the invite-only Founding Program today",
    intro:
      "Founding members get early access to the Terminal and help shape what we build next.",
    feature: {
      title: "Early access for serious Fiber traders",
      text: [
        "Approved members get 3 months of their chosen plan, $250 credit and full access to the Terminal.",
        "You'll have two days to verify your ID after approval. Once your documents are in, your access continues.",
      ],
      caption: "A small group of traders helping shape Jenvu",
    },
    banner: {
      title: "Invite-only, reviewed by our team",
      text: "Every application is reviewed by hand. We'll email you once a decision has been made.",
    },
    steps: {
      title: "How to apply",
      points: [
        "Fill in the short application form.",
        "Tell us how you trade Fiber today.",
        "Wait for our review email.",
        "Verify your ID within two days of approval.",
      ],
    },
    stats: [
      { value: "2", label: "Days to verify your ID" },
      { value: "1", label: "Short application form" },
      { value: "Now", label: "Plan starts on approval" },
    ],
    cta: { label: "Apply now", href: "https://jenvu.com/founding" },
  },
  {
    slug: "london-new-york-sessions",
    img: placeLondon,
    tag: "SESSIONS",
    title: "Trade the London and New York sessions with clear zones",
    intro:
      "Fiber moves most during the London and New York sessions. Jenvu marks those windows and the zones that matter inside them.",
    feature: {
      title: "Know when the market is awake",
      text: [
        "Killzones highlight the busiest hours of each session so you can focus your attention.",
        "Supply and demand zones stay on the chart until price clearly breaks them, so you always see the latest area of interest.",
      ],
      caption: "Session windows and active zones on the Fiber chart",
    },
    banner: {
      title: "Weekend closure handled for you",
      text: "When the Fiber market is closed at the weekend, the chart shows it, and the closed-candle timer counts down to the next open.",
    },
    steps: {
      title: "What you'll see",
      points: [
        "London and New York killzones.",
        "4H candles aligned with common charting sessions.",
        "Fresh supply and demand zones with fair value gaps.",
        "Optional faded zones from earlier in the day.",
      ],
    },
    stats: [
      { value: "2", label: "Main sessions: London and New York" },
      { value: "4H", label: "Session-aligned candles" },
      { value: "24/5", label: "Fiber market hours" },
    ],
    cta: { label: "Learn about killzones", href: "https://jenvu.com/killzones" },
  },
  {
    slug: "build-with-jenvu",
    img: placeDev,
    tag: "DEVELOPERS",
    title: "Build with Jenvu models using API keys and the extension",
    intro:
      "Use your own API keys to bring Jenvu's analysis into your tools, or add the browser extension to read Fiber charts you already use.",
    feature: {
      title: "Jenvu, wherever you work",
      text: [
        "Create an API key from your dashboard and call Jenvu from your own apps and scripts.",
        "Connect AI assistants so they can read your own Jenvu data, and only yours.",
      ],
      caption: "API keys, the browser extension and assistant connections",
    },
    banner: {
      title: "Pay only for what you use",
      text: "API usage is billed per million tokens, and you can track every call from the Usage page in your dashboard.",
    },
    steps: {
      title: "Get started",
      points: [
        "Open API keys in your dashboard and create a key.",
        "Keep your key private, never share it in public code.",
        "Install the browser extension from the Download page.",
        "Track your usage and spending from the dashboard.",
      ],
    },
    stats: [
      { value: "$3", label: "Per million tokens" },
      { value: "1", label: "Dashboard for keys and usage" },
      { value: "Your", label: "Data only, never other users'" },
    ],
    cta: { label: "Download the extension", href: "https://jenvu.com/download" },
  },
];

export function getStory(slug: string) {
  return STORIES.find((s) => s.slug === slug);
}
