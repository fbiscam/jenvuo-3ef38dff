import { createFileRoute } from "@tanstack/react-router";
import { PageShell, Feature, Banner, Stats, StoryCards } from "@/components/PageShell";
import aboutMedia from "@/assets/about-media.jpg";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Jenvu — Our Mission" },
      { name: "description", content: "Meet Jenvu — the mission, philosophy and team behind the AI Fiber trading terminal for Fiber." },
      { property: "og:title", content: "Who We Are — Jenvu" },
      { property: "og:description", content: "The mission, philosophy and team behind Jenvu's AI-powered trading terminal." },
      { property: "og:url", content: "https://jenvu.com/about" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://jenvu.com/about" }],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <PageShell
      wide
      eyebrow="\n"
      title="Why Jenvu"
      intro="Jenvu was built on a simple thesis: institutional logic shouldn't be locked behind a Bloomberg terminal. We turned ICT and SMC playbooks into an AI trading terminal any serious Fiber trader can use directly on the chart."
    >
      <Feature
        title="A new way to read Fiber"
        text={
          <p>
            Give independent traders the same structural read of the market that desk
            analysts have been using for decades explained in real time, drawn on the chart,
            and available the moment an idea hits.
          </p>
        }
        linkLabel="Explore the Terminal"
        href="https://dash.jenvu.com/overview"
        media={
          <img src={aboutMedia} alt="Fiber candlestick chart with marked zones" width={1280} height={720} className="h-auto w-full" />
        }
        caption="Structure, liquidity and zones drawn on one chart"
      />

      <div className="px-4 py-6 sm:px-6">
        <Banner title="Honest output, every time">
          When conditions are bad, the analysis says "wait". Every setup must clear bias,
          structure, liquidity, premium/discount, killzone and news-risk checks before it ships.{" "}
          <a href="https://jenvu.com/disclaimer">Read the risk disclaimer</a> to see how we
          frame every result.
        </Banner>
      </div>

      <Stats
        title="Built for one market"
        text={
          <>
            <p>
              Jenvu is a Fiber specialist. Instead of spreading across unrelated pairs, every
              engine is tuned deeply for one bullion market: chart-first analysis on the active
              TradingView chart, the institutional ICT/SMC playbook with killzones, liquidity and
              OTE, and clear explanations in plain language.
            </p>
            <p className="mt-4">
              We'd rather miss a trade than print a bad one.
            </p>
          </>
        }
        linkLabel="See plans and pricing"
        href="https://jenvu.com/pricing"
        stats={[
          { value: "7", label: "Deterministic trading engines" },
          { value: "1", label: "Dedicated market: Fiber" },
          { value: "6", label: "Checks before any setup ships" },
          { value: "14", label: "Days of Pro access in the free trial" },
          { value: "$100", label: "Free credit to get started" },
        ]}
      />

      <StoryCards
        title="Get inspired"
        intro="Guides, product updates and help from the Jenvu team."
        cards={[
          { title: "How ICT and SMC concepts read Fiber structure", href: "https://jenvu.com/strategies/ict-gold-trading", cta: "Read the guide" },
          { title: "Inside the AI engine behind every Jenvu answer", href: "https://jenvu.com/ai-engine", cta: "Read the story" },
          { title: "Questions about your account, plan or the Terminal", href: "https://support.jenvu.com", cta: "Visit help center" },
        ]}
      />
    </PageShell>
  );
}
