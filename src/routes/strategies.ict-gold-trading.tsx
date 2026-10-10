import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell, H2, P, UL } from "@/components/PageShell";

const URL = "https://jenvu.com/strategies/ict-gold-trading";
const TITLE = "ICT & SMC Gold Trading Guide (XAU/USD) — Jenvu";
const DESC =
  "A practical guide to ICT and Smart Money Concepts on gold: market structure, liquidity sweeps, fair value gaps, supply and demand zones, killzones and risk.";

export const Route = createFileRoute("/strategies/ict-gold-trading")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "article" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "ICT & SMC Gold Trading Guide (XAU/USD)",
          description: DESC,
          url: URL,
          publisher: { "@type": "Organization", name: "Jenvu", url: "https://jenvu.com" },
        }),
      },
    ],
  }),
  component: GuidePage,
});

function GuidePage() {
  return (
    <PageShell
      eyebrow="Strategy guide"
      title="ICT & SMC Gold Trading"
      intro="How institutional ICT and Smart Money Concepts apply to XAU/USD, and how the Jenvu terminal marks each idea on the chart with fixed, rule-based logic."
    >
      <section className="space-y-3">
        <H2>Why gold suits ICT and SMC</H2>
        <P>
          Gold moves in sharp sessions, reacts strongly to US news, and repeatedly runs obvious
          highs and lows before reversing. ICT and SMC give you a vocabulary for that behaviour:
          where liquidity rests, when it gets taken, and whether price then shows real intent.
        </P>
      </section>

      <section className="space-y-3">
        <H2>1. Market structure: HH, HL, LH, LL</H2>
        <P>
          Structure is read from confirmed swing highs and lows. Higher highs and higher lows
          describe a bullish leg; lower highs and lower lows a bearish one. A break of structure
          (BOS) continues the trend; a change of character (CHoCH) is the first break against it.
        </P>
        <P>
          In the Jenvu terminal a swing is only labelled once enough candles have closed on both
          sides, and a past label never moves afterwards — so what you see on the chart is not
          repainted later.
        </P>
      </section>

      <section className="space-y-3">
        <H2>2. Liquidity: BSL, SSL and sweeps</H2>
        <UL>
          <li>Buy-side liquidity (BSL) sits above untaken swing highs and equal highs.</li>
          <li>Sell-side liquidity (SSL) sits below untaken swing lows and equal lows.</li>
          <li>
            A sweep is a wick through that level followed by a close back inside. A close that
            stays beyond the level is a run, not a sweep.
          </li>
        </UL>
        <P>
          On 1H and 4H the terminal's fresh swing sweep tool checks whether a new high or low took
          the previous 10 candles' extreme, then reports whether price actually moved away within
          the following candles, moved late, or failed.
        </P>
      </section>

      <section className="space-y-3">
        <H2>3. Fair value gaps (FVG)</H2>
        <P>
          An FVG is a three-candle imbalance where the first and third candles' wicks do not
          overlap. It shows displacement — price moving with intent — and often acts as a
          return zone. A bullish FVG supports longs; a bearish FVG supports shorts.
        </P>
      </section>

      <section className="space-y-3">
        <H2>4. Supply and demand zones with FVG confluence</H2>
        <P>
          Jenvu only draws a fresh supply or demand zone when a fresh swing is followed by a
          strong displacement candle that creates an FVG within a few candles. Slow drifts away
          from a swing produce no zone. The latest zone stays on the chart until it is genuinely
          invalidated — a close through it, a stop-level wick, or a newer replacement.
        </P>
      </section>

      <section className="space-y-3">
        <H2>5. Timing: killzones and news</H2>
        <UL>
          <li>London and New York sessions carry most of gold's meaningful sweeps.</li>
          <li>The Asian session is often a range that later gets swept.</li>
          <li>High-impact US releases can invalidate any setup; check the calendar first.</li>
        </UL>
        <P>
          See the <Link to="/killzones" className="underline">killzone times</Link> page for the
          current session windows.
        </P>
      </section>

      <section className="space-y-3">
        <H2>6. A simple top-down workflow</H2>
        <UL>
          <li>Context: read bias on 4H or 1H structure.</li>
          <li>Setup: wait for a sweep or a fresh zone with FVG on 15M in that direction.</li>
          <li>Risk: place the stop beyond the swept extreme and size the position from that distance.</li>
          <li>Skip the trade when evidence is mixed — waiting is a valid decision.</li>
        </UL>
      </section>

      <section className="space-y-3">
        <H2>Risk note</H2>
        <P>
          No method wins every trade, and no win rate is guaranteed. These concepts describe
          probabilities, not certainties. Trade sizes you can afford to lose and read the{" "}
          <Link to="/disclaimer" className="underline">disclaimer</Link>.
        </P>
        <P>
          Learn how the analysis pipeline works on the{" "}
          <Link to="/ai-engine" className="underline">AI engine</Link> page, or{" "}
          <Link to="/pricing" className="underline">see plans</Link> to use the terminal.
        </P>
      </section>
    </PageShell>
  );
}
