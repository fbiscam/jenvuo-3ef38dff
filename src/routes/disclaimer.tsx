import { createFileRoute } from "@tanstack/react-router";
import { PageShell, H2, P, UL } from "@/components/PageShell";

export const Route = createFileRoute("/disclaimer")({
  head: () => ({
    meta: [
      { title: "Our Legal Disclaimer — Jenvu" },
      { name: "description", content: "Risk disclosure and disclaimer for Jenvu signals and analysis." },
      { property: "og:title", content: "Our Legal Disclaimer — Jenvu" },
      { property: "og:url", content: "https://jenvu.com/disclaimer" },
    ],
    links: [{ rel: "canonical", href: "https://jenvu.com/disclaimer" }],
  }),
  component: DisclaimerPage,
});

function DisclaimerPage() {
  return (
    <PageShell
      eyebrow="Important"
      title="Trading Disclaimer"
      intro="Jenvu is an educational analysis tool. Nothing produced by the agent constitutes financial, investment, legal, or tax advice."
    >
      <section className="space-y-3">
        <H2>Risk of Loss</H2>
        <P>
          Trading currencies, metals, crypto-assets, indices, and equities carries
          substantial risk and may not be suitable for all investors. Leverage can amplify
          both gains and losses. You can lose more than your initial deposit.
        </P>
      </section>
      <section className="space-y-3">
        <H2>No Advice</H2>
        <UL>
          <li>Signals, prices, charts, and narrations are for informational purposes only.</li>
          <li>Past performance is not indicative of future results.</li>
          <li>Always perform your own due diligence and consult a licensed advisor.</li>
        </UL>
      </section>
      <section className="space-y-3">
        <H2>AI Limitations</H2>
        <P>
          The agent uses live market data, news feeds, and large-language-model reasoning.
          Outputs can be inaccurate, delayed, or affected by data-source outages. Never
          execute trades without independent verification.
        </P>
      </section>
      <section className="space-y-3">
        <H2>No Liability</H2>
        <P>
          JENVU, its founders, contributors, and partners accept no liability for losses,
          missed opportunities, or damages arising from use of the service.
        </P>
      </section>
      <section className="space-y-3">
        <H2>Jurisdiction</H2>
        <P>
          You are solely responsible for ensuring that your use of trading instruments and
          this tool complies with the laws of your country and broker.
        </P>
      </section>
    </PageShell>
  );
}
