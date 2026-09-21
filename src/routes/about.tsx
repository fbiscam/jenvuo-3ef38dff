import { createFileRoute } from "@tanstack/react-router";
import { PageShell, H2, P, UL } from "@/components/PageShell";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Jenvu — Our Mission" },
      { name: "description", content: "Meet Jenvu — the mission, philosophy and team behind the AI gold trading terminal for XAU/USD." },
      { property: "og:title", content: "Who We Are — Jenvu" },
      { property: "og:description", content: "The mission, philosophy and team behind Jenvu's AI-powered trading terminal." },
      { property: "og:url", content: "https://jenvu.com/about" },
    ],
    links: [{ rel: "canonical", href: "https://jenvu.com/about" }],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <PageShell
      eyebrow="About"
      title={"About Jenvu — the AI gold\u00a0\ntrading terminal for XAU/USD"}
      intro="Jenvu was built on a simple thesis: institutional logic shouldn't be locked behind a Bloomberg terminal. We turned ICT and SMC playbooks into an AI trading terminal any serious trader can use directly in TradingView."
    >
      <section className="space-y-3">
        <H2>The Mission</H2>
        <P>
          Give independent traders the same structural read of the market that desk
          analysts have been using for decades — explained in real time, drawn on the chart,
          and available the moment an idea hits.
        </P>
      </section>
      <section className="space-y-3">
        <H2>What Makes Us Different</H2>
        <UL>
          <li><b>Chart-first</b> — analyze the active TradingView chart without changing workflows.</li>
          <li><b>Institutional playbook</b> — ICT, SMC, killzones, liquidity, OTE.</li>
          <li><b>XAU/USD specialist</b> — one dedicated bullion market, tuned deeply instead of spread across unrelated pairs.</li>
          <li><b>Honest output</b> — when conditions are bad, the analysis says "wait".</li>
        </UL>
      </section>
      <section className="space-y-3">
        <H2>The Standard</H2>
        <P>
          Every setup must clear bias, structure, liquidity, premium/discount, killzone,
          and news-risk checks before it ships. If even one gate fails, the engine
          recommends standing aside. We'd rather miss a trade than print a bad one.
        </P>
      </section>
      <section className="space-y-3">
        <H2>Contact</H2>
        <P>
          Press, partnerships, or feedback — reach the team through the address listed in
          the published site footer.{"\u00a0"}
        </P>
      </section>
    </PageShell>
  );
}
