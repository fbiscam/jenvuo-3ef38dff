import { createFileRoute } from "@tanstack/react-router";
import { IndustryPage, type IndustryContent } from "@/components/industry/IndustryPage";
import prodHero from "@/assets/industry/prod-hero.jpg";
import prodTerminal from "@/assets/industry/prod-terminal.jpg";
import prodAi from "@/assets/industry/prod-ai.jpg";
import prodApi from "@/assets/industry/prod-api.jpg";

export const Route = createFileRoute("/ai-engine")({
  head: () => ({
    meta: [
      { title: "Products — Jenvu Terminal, AI Engine & API" },
      { name: "description", content: "Jenvu products: JX Bot for MetaTrader 5, the Top AI Models, rule-based analysis engines, alerts and the developer API." },
      { property: "og:title", content: "Products — Jenvu" },
      { property: "og:description", content: "The Jenvu Terminal, AI engine, analysis engines, alerts and API for Gold traders." },
      { property: "og:url", content: "https://jenvu.com/ai-engine" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://jenvu.com/ai-engine" }],
  }),
  component: () => <IndustryPage c={CONTENT} />,
});

const CONTENT: IndustryContent = {
  variant: "products",
  heroImg: prodHero,
  pill: "Jenvu products",
  title: "One platform for trading Gold",
  intro:
    "A live Terminal, an AI engine that explains the chart, rule-based analysis engines, alerts and an API, all built for Gold.",
  heroCaption: "The Terminal, AI engine and API working on one live Gold chart.",
  solutionsTitle: "Everything you need in one place",
  solutionsIntro: "Start with the Terminal and add the tools you need.",
  solutions: [
    {
      img: prodTerminal,
      title: "Terminal",
      text: "Live Gold candles with structure, zones, gaps, sweeps and sessions drawn for you.",
      link: "Explore the Terminal",
      href: "https://dash.jenvu.com/terminal",
    },
    {
      img: prodAi,
      title: "AI engine",
      text: "Ask a question about the chart and get a short answer about only what you asked.",
      link: "Explore the AI engine",
      href: "/stories/ai-desk-updates",
    },
    {
      img: prodApi,
      title: "Developer API",
      text: "Create API keys and bring Jenvu analysis into your own apps and bots.",
      link: "Explore the API",
      href: "/stories/build-with-jenvu",
    },
  ],
  topicsTitle: "How the products work",
  topics: [
    {
      label: "Analysis engines",
      title: "Seven rule-based engines",
      text: "Each engine handles one job, like structure, zones or sessions, using fixed rules.",
      points: ["Same candles always give the same marks", "Closed candles only, no repainting", "Results feed the Terminal and the AI"],
      link: "Read the docs",
      href: "https://jenvu.com/docs",
    },
    {
      label: "AI chat",
      title: "AI chat on the chart",
      text: "The AI reads what the engines found and explains it in plain language.",
      points: ["Answers only the question asked", "Levels drawn only when you ask for analysis", "No fixed win-rate claims"],
      link: "See what's new",
      href: "/stories/ai-desk-updates",
    },
    {
      label: "Alerts",
      title: "Price alerts",
      text: "Set the level you care about and get notified when Gold reaches it.",
      points: ["Alerts in the dashboard", "Works while you are away", "Manage alerts any time"],
      link: "Read the docs",
      href: "https://jenvu.com/docs",
    },
    {
      label: "JX Bot",
      title: "JX Bot for MT5",
      text: "Jenvu's Expert Advisor trades Gold on MetaTrader 5 and stops at your plan's targets.",
      points: ["1, 2 or 5 MT5 licenses", "Daily auto-stop at target", "Download and setup in the dashboard"],
      link: "Learn about JX Bot",
      href: "/stories/jx-bot",
    },
    {
      label: "Billing and credits",
      title: "Plans and credits",
      text: "Pick Pro, Elite or Ultra and top up your wallet when you need more AI usage.",
      points: ["Free trial with $100 credit", "Clear usage in your dashboard", "Top up from $5"],
      link: "See pricing",
      href: "https://jenvu.com/pricing",
    },
  ],
  whyTitle: "Why build on Jenvu",
  why: [
    { title: "Made only for Gold", text: "Every product is tuned for Gold, from sessions to weekend closure." },
    { title: "Rules you can check", text: "Analysis comes from fixed rules, so results can be repeated and reviewed." },
    { title: "Honest AI", text: "The AI explains the chart. It never claims human experience or promises results." },
    { title: "Your data stays yours", text: "API keys and connected tools see only your own account's data." },
  ],
  whyCardTitle: "Built for Gold from the ground up.",
  whyCardText: "Jenvu does not promise profits or fixed win rates. Trading Gold carries real risk.",
  storiesTitle: "Latest product stories",
  storySlugs: ["ai-desk-updates", "rvol-and-volume-direction", "build-with-jenvu"],
  highlightsTitle: "What you get with every plan",
  highlightsIntro: "Four tools that work together on one live Gold chart.",
  highlights: [
    { title: "Live Gold chart", text: "Gold candles with structure, zones, sweeps marked for you." },
    { title: "AI answers", text: "Ask about the chart and get a short, plain-language reply." },
    { title: "Price alerts", text: "Pick a level and get told when Gold reaches it." },
    { title: "API keys", text: "Use Jenvu analysis in your own apps and bots." },
  ],
  productsTitle: "Explore all products",
  products: [
    { title: "Jenvu Terminal", text: "Live Gold chart with ICT/SMC overlays.", href: "https://dash.jenvu.com/terminal" },
    { title: "AI engine", text: "Plain-language answers about the chart.", href: "/stories/ai-desk-updates" },
    { title: "Fresh sweep detection", text: "Confirmed sweeps on 5M, 15M, 1H, 2H and 4H.", href: "/stories/fresh-sweep-detection" },
    { title: "Volume and RVOL", text: "Volume spikes and buyer/seller share.", href: "/stories/rvol-and-volume-direction" },
    { title: "JX Bot for MT5", text: "Automated Gold trading on MetaTrader 5.", href: "/stories/jx-bot" },
    { title: "Developer API", text: "API keys for your own tools.", href: "/stories/build-with-jenvu" },
    { title: "Daily Gold insights", text: "A short daily read on Gold.", href: "/stories/daily-gold-insights" },
    { title: "Session tools", text: "London and New York windows on the chart.", href: "/stories/london-new-york-sessions" },
    { title: "Ask Jenvu", text: "Ask anything about Jenvu from any page.", href: "https://support.jenvu.com" },
  ],
};
