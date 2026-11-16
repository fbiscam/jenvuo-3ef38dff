import { createFileRoute } from "@tanstack/react-router";
import ProductsPage from "@/components/products/ProductsPage";

export const Route = createFileRoute("/ai-engine")({
  head: () => ({
    meta: [
      { title: "Jenvu Products — Terminal, JX Bot, News Trading & API" },
      { name: "description", content: "Explore Jenvu Terminal, JX Bot for MetaTrader 5, free News Trading and the developer API in one workspace." },
      { property: "og:title", content: "Products — Jenvu" },
      { property: "og:description", content: "The Jenvu Terminal, AI engine, analysis engines and API for Gold, BTC/USD and EUR/USD traders." },
      { property: "og:url", content: "https://jenvu.com/ai-engine" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://jenvu.com/ai-engine" }],
  }),
  component: ProductsPage,
});

