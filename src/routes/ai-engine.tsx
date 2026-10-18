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
      { name: "description", content: "Jenvu products: the gold Terminal, the AI engine, rule-based analysis engines, alerts, demo trading and the developer API." },
      { property: "og:title", content: "Products — Jenvu" },
      { property: "og:description", content: "The Jenvu Terminal, AI engine, analysis engines, alerts and API for XAU/USD traders." },
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
  title: "One platform for trading gold",
  intro:
    "A live Terminal, an AI engine that explains the chart, rule-based analysis engines, alerts and an API, all built for XAU/USD.",
  heroCaption: "The Terminal, AI engine and API working on one live gold chart.",
  solutionsTitle: "Everything you need in one place",
  solutionsIntro: "Start with the Terminal and add the tools you need.",
  solutions: [
    {
      img: prodTerminal,
      title: "Terminal",
      text: "Live XAU/USD candles with structure, zones, gaps, sweeps and sessions drawn for you.",
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
      text: "Set the level you care about and get notified when gold reaches it.",
      points: ["Alerts in the dashboard", "Works while you are away", "Manage alerts any time"],
      link: "Read the docs",
      href: "https://jenvu.com/docs",
    },
    {
      label: "Demo trading",
      title: "Demo trading",
      text: "Practise on live prices with a $100,000 demo balance before you risk real money.",
      points: ["Live gold prices", "Track open and closed trades", "Reset when you want a fresh start"],
      link: "Learn about demo trading",
      href: "/stories/demo-trading",
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
    { title: "Made only for gold", text: "Every product is tuned for XAU/USD, from sessions to weekend closure." },
    { title: "Rules you can check", text: "Analysis comes from fixed rules, so results can be repeated and reviewed." },
    { title: "Honest AI", text: "The AI explains the chart. It never claims human experience or promises results." },
    { title: "Your data stays yours", text: "API keys and connected tools see only your own account's data." },
  ],
  whyCardTitle: "Built for XAU/USD from the ground up.",
  whyCardText: "Jenvu does not promise profits or fixed win rates. Trading gold carries real risk.",
  storiesTitle: "Latest product stories",
  storySlugs: ["ai-desk-updates", "rvol-and-volume-direction", "build-with-jenvu"],
  productsTitle: "Explore all products",
  products: [
    { title: "Jenvu Terminal", text: "Live gold chart with ICT/SMC overlays.", href: "https://dash.jenvu.com/terminal" },
    { title: "AI engine", text: "Plain-language answers about the chart.", href: "/stories/ai-desk-updates" },
    { title: "Fresh sweep detection", text: "Confirmed sweeps on 15M, 1H, 2H and 4H.", href: "/stories/fresh-sweep-detection" },
    { title: "Volume and RVOL", text: "Volume spikes and buyer/seller share.", href: "/stories/rvol-and-volume-direction" },
    { title: "Demo trading", text: "$100,000 demo account on live prices.", href: "/stories/demo-trading" },
    { title: "Developer API", text: "API keys for your own tools.", href: "/stories/build-with-jenvu" },
    { title: "Daily gold insights", text: "A short daily read on gold.", href: "/stories/daily-gold-insights" },
    { title: "Session tools", text: "London and New York windows on the chart.", href: "/stories/london-new-york-sessions" },
    { title: "Ask Jenvu", text: "Ask anything about Jenvu from any page.", href: "https://support.jenvu.com" },
  ],
};
