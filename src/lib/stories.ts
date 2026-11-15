import cardTopStory from "@/assets/home/card-top-story.jpg";
import cardAi from "@/assets/home/card-ai.jpg";
import cardWave from "@/assets/home/card-wave.jpg";
import cardGold from "@/assets/home/card-gold.jpg";
import placeFloor from "@/assets/home/place-floor.jpg";
import placeVault from "@/assets/home/place-vault.jpg";
import placeLondon from "@/assets/home/place-london.jpg";
import placeDev from "@/assets/home/place-dev.jpg";
import realBot from "@/assets/home/real-bot.jpg";
import devModels from "@/assets/home/dev-models.jpg";
import tradeGold from "@/assets/home/trade-gold.jpg";
import devDocs from "@/assets/home/dev-docs.jpg";
import { PUBLIC_API_MODEL_IDS } from "@/lib/public-api-models";
import { DAILY_DRAWDOWN_PCT } from "@/lib/mt5-licenses";

const API_BASE = "https://jenvu.com/api/public/v1";

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
  /** Optional code sample shown under the banner (developer stories). */
  code?: { title: string; text: string };
};

export const STORIES: Story[] = [
  {
    slug: "jx-bot-on-metatrader-5",
    img: realBot,
    tag: "METATRADER 5",
    title: "How JX Bot runs on MetaTrader 5 with Jenvu",
    intro:
      "A look inside the workflow: how the bot checks your licence, which sessions it trades, and the limits that stop it for the day.",
    feature: {
      title: "Your MT5, your account, Jenvu's rules",
      text: [
        "JX Bot is an Expert Advisor that runs inside your own MetaTrader 5 on the EURUSD M15 chart. There is no licence key: you register the IP of the PC or RDP that runs MT5 in your dashboard and type the same IP into the bot.",
        "Each time the bot starts and while it runs, it asks Jenvu whether that IP belongs to an account with JX Bot access. Once a minute it reports its balance and status, which you can follow live on the Bot Usage page.",
      ],
      caption: "JX Bot attached to the EURUSD M15 chart in MetaTrader 5",
    },
    banner: {
      title: "Limits, not promises",
      text: "Trading carries risk and losses can happen. The daily target and the drawdown limit are points where the bot stops, not results it guarantees. The bot manages its trades as one group and closes them together; it does not place a separate stop loss on every trade.",
    },
    steps: {
      title: "What happens behind the scenes",
      points: [
        "One IP works for one MT5 account, and the same IP can't be used by two Jenvu accounts.",
        "The bot trades the Asia and London sessions and opens no new trades in the New York session (from 12:00 UTC).",
        "Lot size is 0.05 per $1,000 of balance.",
        "Each account stops for the day when it reaches your plan's daily target, counted from that account's own profit.",
        `A ${DAILY_DRAWDOWN_PCT}% drawdown limit follows the day's highest closed balance, so the limit moves up as closed profit grows.`,
      ],
    },
    stats: [
      { value: "M15", label: "EUR/USD chart" },
      { value: "0.05", label: "Lot per $1,000 of balance" },
      { value: `${DAILY_DRAWDOWN_PCT}%`, label: "Daily drawdown limit from the day's peak" },
    ],
    cta: { label: "See JX Bot", href: "https://jenvu.com/jx-bot" },
  },
  {
    slug: "one-api-many-models",
    img: devModels,
    tag: "AI MODELS",
    title: "One Jenvu API key for Claude, GPT, Gemini, Grok, DeepSeek and more",
    intro:
      "Switch between model families by changing one word in your request. Same key, same endpoint, same bill.",
    feature: {
      title: "Change the model, keep the code",
      text: [
        "The Jenvu API speaks the same format as the OpenAI SDK, so the tools you already use work by pointing them at Jenvu's address.",
        "Every model is picked with the model field. Try a reasoning model for market analysis, a coding model for your scripts, and a fast model for quick answers, without opening separate accounts.",
      ],
      caption: "Every model available through the Jenvu API, listed on the Models page",
    },
    banner: {
      title: "The model you ask for is the model you get",
      text: "Each model name maps to exactly one model. The Models page only lists models the API really serves, and every call shows up on your Usage page.",
    },
    steps: {
      title: "How to switch models",
      points: [
        "Create an API key in your dashboard.",
        "Pick a model from the Models page and copy its name.",
        "Put that name in the model field of your request.",
        "Track tokens and spending for each call on the Usage page.",
      ],
    },
    stats: [
      { value: String(PUBLIC_API_MODEL_IDS.length), label: "Models behind one API key" },
      { value: "$3", label: "Per million tokens" },
      { value: "1", label: "Endpoint for every model" },
    ],
    cta: { label: "Browse the models", href: "https://jenvu.com/models" },
  },
  {
    slug: "news-impact-on-gold",
    img: tradeGold,
    tag: "NEWS TRADING",
    title: "See how Gold reacted to the last 24 CPI, NFP and FOMC releases",
    intro:
      "The News page shows the next big US release, counts down to it, and tells you what Gold usually did when the number beat or missed.",
    feature: {
      title: "History before the headline",
      text: [
        "For each event Jenvu keeps the last 24 releases with their actual, forecast and previous numbers, then measures how price moved 5, 15 and 60 minutes later.",
        "From that history it shows two simple cards before the release: what Gold usually did after a beat and after a miss, with how often that happened. After the release, one card shows what actually happened.",
      ],
      caption: "The next release, its countdown and the beat and miss cards",
    },
    banner: {
      title: "Past reactions, not a forecast",
      text: "Gold reactions are measured on PAXG from Binance, a token backed by physical gold, used as a stand-in for spot Gold. Past moves don't guarantee the next one, and with fewer than five releases no direction is shown.",
    },
    steps: {
      title: "Events covered",
      points: [
        "Non-Farm Payrolls (NFP).",
        "Consumer prices (CPI) and producer prices (PPI).",
        "FOMC rate decisions.",
        "Core PCE inflation and GDP.",
        "A red banner appears in the last hour before a release.",
      ],
    },
    stats: [
      { value: "24", label: "Past releases per event" },
      { value: "6", label: "High-impact US events" },
      { value: "1 hr", label: "Warning before each release" },
    ],
    cta: { label: "Open the News page", href: "https://dash.jenvu.com/news" },
  },
  {
    slug: "gold-analysis-in-python",
    img: devDocs,
    tag: "PYTHON",
    title: "Build a Gold market assistant in Python with a few lines of code",
    intro:
      "Use the official OpenAI Python package, point it at Jenvu, and ask any model about Gold from your own scripts.",
    feature: {
      title: "From API key to first answer",
      text: [
        "Install the openai package, save your Jenvu API key in an environment variable, and set the base URL to Jenvu. That's the whole setup.",
        "From there you can stream long answers, run the same question through several models, or plug the replies into your own alerts and dashboards.",
      ],
      caption: "A first Python call to the Jenvu API",
    },
    banner: {
      title: "Keep your key private",
      text: "Read the key from an environment variable and never paste it into public code. You can delete a key at any time from the API keys page.",
    },
    steps: {
      title: "Steps",
      points: [
        "Run pip install openai.",
        "Create a key on the API keys page and save it as JENVU_API_KEY.",
        "Set base_url to the Jenvu API address in the example above.",
        "Choose a model name from the Models page.",
        "Add stream=True when you want the answer to arrive word by word.",
      ],
    },
    stats: [
      { value: "11", label: "Lines for a first call" },
      { value: "1", label: "Package to install" },
      { value: "$3", label: "Per million tokens" },
    ],
    code: {
      title: "gold_assistant.py",
      text: `import os
from openai import OpenAI
client = OpenAI(
    base_url="${API_BASE}",
    api_key=os.getenv("JENVU_API_KEY")
)
chat = client.chat.completions.create(
    model="gpt-5.5",
    messages=[{"role": "user", "content": "Explain gold liquidity"}]
)
print(chat.choices[0].message.content)`,
    },
    cta: { label: "Read the API docs", href: "https://jenvu.com/docs" },
  },
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
      { value: "3", label: "Markets: Gold, Bitcoin, EUR/USD" },
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
      text: "Gold trades across many venues, so no single feed shows the whole market. Jenvu labels the buy/sell split as an estimate and uses volume for display only.",
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
    title: "Daily Gold insights and trading guides",
    intro:
      "Short daily reads on Gold, plus longer guides that explain ICT and SMC ideas in simple language.",
    feature: {
      title: "Learn the market one day at a time",
      text: [
        "Each insight covers what moved Gold, which levels matter, and what to watch in the next session.",
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
        "Daily Gold market notes.",
        "Step-by-step ICT and SMC guides.",
        "Session and killzone explainers.",
        "A glossary of every term used on the chart.",
      ],
    },
    stats: [
      { value: "3", label: "Markets covered" },
      { value: "A–Z", label: "Glossary of chart terms" },
      { value: "Free", label: "To read for everyone" },
    ],
    cta: { label: "Read the insights", href: "https://jenvu.com/insights" },
  },
  {
    slug: "jx-bot",
    img: placeFloor,
    tag: "JX BOT FOR MT5",
    title: "Let JX Bot trade EUR/USD for you on MetaTrader 5",
    intro:
      "JX Bot is Jenvu's Expert Advisor for EUR/USD on MT5. It runs on your own account and stops at the targets your plan sets.",
    feature: {
      title: "Automated EUR/USD trading with clear limits",
      text: [
        "Download the bot from your dashboard, add the IP of the PC or RDP that runs MT5 and attach it to the EURUSD M15 chart.",
        "The bot checks with Jenvu that it runs from your IP, pauses for the day at your daily target and stops at your monthly target.",
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
        "Add your PC or RDP IP, type it into the bot and follow the install steps.",
      ],
    },
    stats: [
      { value: "1–5", label: "IPs per plan" },
      { value: "$150", label: "Daily target on Ultra" },
      { value: "M15", label: "EUR/USD chart" },
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
      title: "Early access for serious Gold, Bitcoin and EUR/USD traders",
      text: [
        "Approved members get 1 month of Pro or Elite with the plan's API credit, full Terminal access and JX Bot after ID verification.",
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
        "Tell us how you trade Gold, Bitcoin and EUR/USD today.",
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
      "Gold moves most during the London and New York sessions. Jenvu marks those windows and the zones that matter inside them.",
    feature: {
      title: "Know when the market is awake",
      text: [
        "Killzones highlight the busiest hours of each session so you can focus your attention.",
        "Supply and demand zones stay on the chart until price clearly breaks them, so you always see the latest area of interest.",
      ],
      caption: "Session windows and active zones on the chart",
    },
    banner: {
      title: "Weekend closure handled for you",
      text: "When the Gold and EUR/USD markets are closed at the weekend, the chart shows it, and the closed-candle timer counts down to the next open.",
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
      { value: "24/5", label: "Gold market hours" },
    ],
    cta: { label: "Learn about killzones", href: "https://jenvu.com/killzones" },
  },
  {
    slug: "build-with-jenvu",
    img: placeDev,
    tag: "DEVELOPERS",
    title: "Build with Jenvu models using API keys and the extension",
    intro:
      "Use your own API keys to bring Jenvu's analysis into your tools, or add the browser extension to read charts you already use.",
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
