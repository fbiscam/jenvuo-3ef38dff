import { createFileRoute } from "@tanstack/react-router";
import { PageShell, H2, P, UL } from "@/components/PageShell";

export const Route = createFileRoute("/ai-engine")({
  head: () => ({
    meta: [
      { title: "AI Engine — Jenvu" },
      { name: "description", content: "Inside the Jenvu AI engine: how it reads charts, reasons and reviews institutional ICT and SMC trade setups in real time." },
      { property: "og:title", content: "Artificial Intelligence Engine — Jenvu" },
      { property: "og:description", content: "How the Jenvu AI engine reads charts, reasons and reviews institutional ICT and SMC gold trade setups in real time." },
      { property: "og:url", content: "https://jenvu.com/ai-engine" },
    ],
    links: [{ rel: "canonical", href: "https://jenvu.com/ai-engine" }],
  }),
  component: AIPage,
});

function AIPage() {
  return (
    <PageShell
      eyebrow="Technology"
      title="The AI Engine"
      intro="More than a chatbot — a multi-stage reasoning pipeline fusing live market data, institutional concepts and natural-language synthesis."
    >
      <section className="space-y-3">
        <H2>Perception Layer</H2>
        <P>
          The extension captures the active TradingView chart and the user's request in
          real time. A lightweight intent resolver separates normal chat from analysis
          requests before sending supported XAU/USD context into the signal pipeline.
        </P>
      </section>
      <section className="space-y-3">
        <H2>Market Context Layer</H2>
        <UL>
          <li>Multi-timeframe candle ingestion (1H and 15M).</li>
          <li>Structural mapping: PDH/PDL, equilibrium, premium/discount arrays.</li>
          <li>News & economic calendar awareness with high-impact filtering.</li>
          <li>Session and killzone awareness (London / New York GMT windows).</li>
        </UL>
      </section>
      <section className="space-y-3">
        <H2>Reasoning Layer</H2>
        <P>
          A large language model with a 25-year institutional trader persona reasons over
          the prepared context using ICT and SMC playbooks — bias, sweep, displacement,
          OTE, OB, FVG, BOS/CHoCH — and outputs a structured plan with entry, stop, three
          targets, and an invalidation level.
        </P>
      </section>
      <section className="space-y-3">
        <H2>Output Layer</H2>
        <P>
          The plan appears in the extension chat with clear entry, invalidation and target
          levels. Relevant FVGs, order blocks and liquidity zones can also be marked on the
          TradingView chart when the user explicitly requests analysis.
        </P>
      </section>
    </PageShell>
  );
}
