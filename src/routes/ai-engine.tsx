import { createFileRoute } from "@tanstack/react-router";
import { PageShell, Feature, Banner, Stats, StoryCards } from "@/components/PageShell";
import brain from "@/assets/feat-brain.jpg";

export const Route = createFileRoute("/ai-engine")({
  head: () => ({
    meta: [
      { title: "Products — Jenvu AI Engine & Terminal" },
      { name: "description", content: "Jenvu products: the gold Terminal, the AI engine, rule-based analysis engines, alerts and the developer API." },
      { property: "og:title", content: "Products — Jenvu" },
      { property: "og:description", content: "The Jenvu Terminal, AI engine, analysis engines, alerts and API for XAU/USD traders." },
      { property: "og:url", content: "https://jenvu.com/ai-engine" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://jenvu.com/ai-engine" }],
  }),
  component: AIPage,
});

function AIPage() {
  return (
    <PageShell
      wide
      eyebrow="\n"
      title="Jenvu products"
      intro="One platform for gold: a live Terminal, an AI engine that explains the chart, rule-based analysis engines, alerts and an API for developers."
    >
      <Feature
        title="The AI engine"
        text={
          <p>
            A multi-stage pipeline reads the live XAU/USD chart, maps structure, liquidity, zones and
            sessions, then explains what it sees in plain language. Levels are drawn on the chart only
            when you ask for analysis.
          </p>
        }
        linkLabel="Open the Terminal"
        href="https://dash.jenvu.com/terminal"
        media={<img src={brain} alt="Jenvu AI engine" width={1280} height={720} className="h-auto w-full" />}
        caption="Perception, market context, reasoning and output"
      />

      <div className="px-4 py-6 sm:px-6">
        <Banner title="Rules first, AI second">
          Swings, BOS/CHoCH, zones, fair value gaps and sweeps come from fixed rules, so the same
          candles always give the same marks. The AI explains them; it never invents them.{" "}
          <a href="https://jenvu.com/docs">Read the docs</a>.
        </Banner>
      </div>

      <Stats
        title="What's included"
        text={
          <p>
            The Terminal with live gold candles and ICT/SMC overlays, AI chat about the chart, seven
            deterministic engines, price alerts, a $100,000 demo account, the browser extension and API
            keys for your own tools.
          </p>
        }
        linkLabel="See plans and pricing"
        href="https://jenvu.com/pricing"
        stats={[
          { value: "7", label: "Rule-based analysis engines" },
          { value: "4", label: "Sweep timeframes: 15M to 4H" },
          { value: "$100K", label: "Demo trading balance" },
          { value: "1", label: "Market: XAU/USD" },
        ]}
      />

      <StoryCards
        title="Learn more"
        intro="Guides and help for every Jenvu product."
        cards={[
          { title: "ICT and SMC concepts on gold", href: "https://jenvu.com/strategies/ict-gold-trading", cta: "Read the guide" },
          { title: "Everything about Jenvu, A to Z", href: "https://jenvu.com/docs", cta: "Open docs" },
          { title: "Questions about plans or the Terminal", href: "https://support.jenvu.com", cta: "Visit help center" },
        ]}
      />
    </PageShell>
  );
}
