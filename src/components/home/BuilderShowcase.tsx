import * as React from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

/* Homepage "all-in-one platform" cards: three looping animated scenes (Exa-style). */

// Deterministic particle cloud so SSR and the browser render the same dots.
const DOTS = Array.from({ length: 70 }, (_, i) => {
  const a = i * 2.399963; // golden angle
  const r = Math.sqrt(i / 70) * 42;
  return {
    x: 50 + Math.cos(a) * r,
    y: 50 + Math.sin(a) * r * 0.8,
    s: 2 + ((i * 7) % 5) * 0.8,
    d: (i % 9) * 0.35,
  };
});

function SwarmScene() {
  const tags = [
    { t: "FINANCIAL DATA", c: "left-[6%] top-[14%]", d: "0s" },
    { t: "CODE DOCS", c: "right-[6%] top-[26%]", d: "1.2s" },
    { t: "SMC SIGNALS", c: "left-[10%] bottom-[18%]", d: "2.1s" },
    { t: "MARKET INTEL", c: "right-[8%] bottom-[10%]", d: "0.7s" },
  ];
  return (
    <div className="exa-sky relative h-full w-full overflow-hidden">
      <div className="exa-swarm absolute inset-[12%]">
        {DOTS.map((p, i) => (
          <span
            key={i}
            className="exa-dot absolute rounded-full bg-exa-paper"
            style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.s, height: p.s, animationDelay: `${p.d}s` }}
          />
        ))}
      </div>
      {tags.map((g) => (
        <span
          key={g.t}
          className={`exa-float absolute ${g.c} rounded-[3px] bg-exa-paper/90 px-2 py-1 font-mono text-[10px] tracking-[0.12em] text-exa-ink shadow-sm`}
          style={{ animationDelay: g.d }}
        >
          {g.t}
        </span>
      ))}
    </div>
  );
}

function HighlightScene() {
  return (
    <div className="exa-paper-bg relative h-full w-full overflow-hidden">
      <div className="absolute inset-x-[10%] bottom-0 top-[12%] rounded-t-md bg-exa-paper px-5 pt-5 text-exa-ink shadow-xl">
        <span className="inline-flex items-center gap-1.5 rounded-[3px] bg-exa-ink px-2 py-1 font-mono text-[9.5px] tracking-[0.12em] text-exa-paper">
          <span className="h-1.5 w-1.5 bg-exa-paper" /> 90% TOKEN REDUCTION
        </span>
        <p className="mt-4 text-[12.5px] leading-[1.85] text-exa-ink/75">
          Gold opened the week near its range high as{" "}
          <span className="exa-hl text-exa-ink">the London session swept Asian lows</span> before buyers stepped in.
          Analysts noted that{" "}
          <span className="exa-hl text-exa-ink" style={{ animationDelay: "0.6s" }}>
            the 1H structure shifted bullish above the prior swing
          </span>
          , while dollar strength faded into the New York open and{" "}
          <span className="exa-hl text-exa-ink" style={{ animationDelay: "1.2s" }}>volatility stayed elevated</span> into
          the close.
        </p>
      </div>
      <span className="exa-float absolute bottom-[8%] right-[8%] rounded-[3px] bg-exa-ink px-2.5 py-1.5 font-mono text-[10px] tracking-[0.12em] text-exa-paper shadow-lg">
        HIGHLIGHTS: ON
      </span>
    </div>
  );
}

const JSON_LINES: { t: string; i: number }[] = [
  { t: '"content": {', i: 0 },
  { t: '"drivers": [', i: 1 },
  { t: '{ "name": "US real yields",', i: 2 },
  { t: '"impact": "high", "trend": "falling" },', i: 3 },
  { t: '{ "name": "Dollar index",', i: 2 },
  { t: '"impact": "high", "trend": "flat" },', i: 3 },
  { t: '{ "name": "Central bank buying",', i: 2 },
  { t: '"impact": "medium", "trend": "rising" }', i: 3 },
  { t: "]", i: 1 },
  { t: "}", i: 0 },
];

function ResearchScene() {
  return (
    <div className="exa-dusk relative h-full w-full overflow-hidden">
      <div className="absolute inset-x-[8%] top-[9%] flex items-center gap-2 rounded-full bg-exa-paper px-4 py-2.5 text-[12px] text-exa-ink shadow-lg">
        <span className="truncate">Top 3 gold market drivers, impact, current trend?</span>
        <span className="exa-caret h-3.5 w-px shrink-0 bg-exa-ink" />
      </div>
      <div className="absolute inset-x-[8%] bottom-[7%] top-[26%] overflow-hidden rounded-xl bg-gc-night p-4 font-mono text-[10.5px] leading-[1.75] text-gc-on-night shadow-2xl">
        {JSON_LINES.map((l, k) => (
          <div
            key={k}
            className="exa-line whitespace-nowrap"
            style={{ paddingLeft: l.i * 12, animationDelay: `${k * 0.18}s` }}
          >
            {l.t.split(/("[^"]*")/g).map((part, j) =>
              part.startsWith('"') ? (
                <span key={j} className={part.endsWith('":') || /^"(content|drivers|name|impact|trend)"$/.test(part) ? "text-ent-ide-cyan" : "text-ent-ide-green"}>
                  {part}
                </span>
              ) : (
                <span key={j}>{part}</span>
              ),
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ShowCard({
  scene,
  title,
  body,
  cta,
  to,
  hash,
}: {
  scene: React.ReactNode;
  title: string;
  body: string;
  cta: string;
  to: "/docs" | "/dashboard/chat";
  hash?: string;
}) {
  return (
    <div className="flex flex-col text-left">
      <div className="aspect-square overflow-hidden rounded-md">{scene}</div>
      <h3 className="mt-5 text-xl font-medium tracking-tight text-foreground">{title}</h3>
      <p className="mt-2 text-[16px] leading-relaxed text-foreground/80">{body}</p>
      <Link
        to={to}
        hash={hash}
        className="mt-5 inline-flex w-fit items-center gap-1.5 rounded-full border border-border px-4 py-2 text-[14px] font-medium text-foreground transition hover:bg-muted"
      >
        {cta} <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

export function BuilderShowcase() {
  return (
    <div className="mt-10 grid gap-8 md:grid-cols-3 md:gap-6">
      <ShowCard
        scene={<SwarmScene />}
        title="The context your trading agent needs"
        body="Broad coverage across market, news and code sources so your agent always has the right context."
        cta="Use our search API"
        to="/docs"
      />
      <ShowCard
        scene={<HighlightScene />}
        title="Token-efficient contents with highlights"
        body="Pull only the most relevant excerpts from long pages and reports, so prompts stay short and cheap."
        cta="Try it in the Chat playground"
        to="/dashboard/chat"
      />
      <ShowCard
        scene={<ResearchScene />}
        title="Low-latency to deep research in one API"
        body="Choose fast answers or deep research, with structured outputs you can drop straight into your app."
        cta="Integrate Jenvu with your agent"
        to="/docs"
        hash="ai-assistants"
      />
    </div>
  );
}
