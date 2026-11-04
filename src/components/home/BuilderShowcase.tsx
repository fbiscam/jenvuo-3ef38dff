import * as React from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import swarmBg from "@/assets/home/showcase-swarm-bg.jpg";
import highlightBg from "@/assets/home/showcase-highlight-bg.jpg";
import researchBg from "@/assets/home/showcase-research-bg.jpg";

/* Homepage "all-in-one platform" cards: three looping animated scenes (Exa-style). */

// Deterministic pixel cloud (seeded) so SSR and the browser render the same dots.
function seeded(n: number) {
  let x = Math.sin(n * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}
const DOTS = Array.from({ length: 1100 }, (_, i) => {
  // Box-Muller-ish spread: dense core, scattered edges.
  const u = Math.max(seeded(i + 1), 0.0001);
  const v = seeded(i + 777);
  const r = Math.sqrt(-2 * Math.log(u)) * 13;
  const a = v * Math.PI * 2;
  return {
    x: 52 + Math.cos(a) * r * 1.05,
    y: 44 + Math.sin(a) * r * 1.2,
    s: 2.5 + Math.floor(seeded(i + 333) * 4) * 1.4,
    o: 0.8 + seeded(i + 99) * 0.2,
    tw: i % 6 === 0,
    d: (i % 11) * 0.3,
  };
}).filter((p) => p.x > 1 && p.x < 99 && p.y > 1 && p.y < 99);

function SwarmScene() {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <img src={swarmBg} alt="" width={1024} height={1024} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
      <div className="exa-swarm absolute inset-0">
        {DOTS.map((p, i) => (
          <span
            key={i}
            className={`absolute bg-exa-paper ${p.tw ? "exa-dot" : ""}`}
            style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.s, height: p.s, opacity: p.o, animationDelay: `${p.d}s` }}
          />
        ))}
      </div>
      <span className="exa-float absolute left-[47%] top-[54%] bg-exa-ink px-2 py-1 font-mono text-[9px] tracking-[0.08em] text-exa-paper ring-1 ring-exa-paper/60">
        MARKET DATA
      </span>
      <span className="exa-float absolute left-[70%] top-[49%] bg-exa-ink px-2 py-1 font-mono text-[9px] tracking-[0.08em] text-exa-paper ring-1 ring-exa-paper/60" style={{ animationDelay: "1.4s" }}>
        NEWS
      </span>
    </div>
  );
}

function CornerMarks() {
  const pos = ["left-[6%] top-[6%]", "left-1/2 top-[6%] -translate-x-1/2", "right-[6%] top-[6%]", "left-[6%] bottom-[6%]", "left-1/2 bottom-[6%] -translate-x-1/2", "right-[6%] bottom-[6%]"];
  return (
    <>
      {pos.map((c) => (
        <span key={c} className={`absolute ${c} h-1.5 w-1.5 border border-exa-paper/80`} />
      ))}
    </>
  );
}

function HighlightScene() {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <img src={highlightBg} alt="" width={1024} height={1024} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
      <CornerMarks />
      <div className="absolute inset-x-[6%] top-[17%] rounded-[3px] bg-exa-paper px-[6%] py-[5%] text-exa-ink shadow-lg">
        <span className="inline-flex items-center gap-2 font-mono text-[10.5px] font-semibold tracking-[0.1em] text-exa-ink/60">
          <span className="h-2 w-2 bg-exa-ink/60" /> 90% TOKEN REDUCTION
        </span>
        <h4 className="mt-3 font-serif text-[20px] leading-tight text-exa-ink">Gold market wrap</h4>
        <p className="mt-1.5 text-[12.5px] leading-[1.7] text-exa-ink/75">
          Gold opened the week near its range high as the London session swept Asian lows. Gold is among{" "}
          <span className="exa-hl text-exa-ink">the most traded safe-haven assets</span>; analysts noted the 1H
          structure shifted bullish above the prior swing while the dollar faded into New York.{" "}
          <span className="exa-hl text-exa-ink" style={{ animationDelay: "0.8s" }}>
            Volatility stayed elevated
          </span>{" "}
          into the close.
        </p>
      </div>
      <span className="absolute bottom-[5%] left-1/2 -translate-x-1/2 bg-exa-ink px-3 py-2 font-mono text-[11px] font-semibold tracking-[0.12em] text-exa-paper">
        HIGHLIGHTS: ON
      </span>
    </div>
  );
}

const JSON_LINES: { t: string; i: number }[] = [
  { t: '"content": {', i: 0 },
  { t: '"drivers": [', i: 1 },
  { t: "{", i: 2 },
  { t: '"driver_name":', i: 3 },
  { t: '"impact":', i: 3 },
  { t: '"trend":', i: 3 },
  { t: "},", i: 2 },
  { t: "{", i: 2 },
  { t: '"driver_name":', i: 3 },
  { t: '"impact":', i: 3 },
  { t: '"trend":', i: 3 },
  { t: "},", i: 2 },
  { t: "{", i: 2 },
  { t: '"driver_name":', i: 3 },
  { t: '"impact":', i: 3 },
  { t: '"trend":', i: 3 },
  { t: "}", i: 2 },
  { t: "]", i: 1 },
  { t: "}", i: 0 },
];

function ResearchScene() {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <img src={researchBg} alt="" width={1024} height={1024} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-x-[6%] top-[11%] flex items-center rounded-[3px] bg-exa-paper px-3.5 py-3 text-[12.5px] text-exa-ink shadow-md">
        <span className="exa-type overflow-hidden whitespace-nowrap">Top 3 gold drivers</span>
        <span className="exa-caret ml-0.5 h-3.5 w-px shrink-0 bg-exa-ink" />
      </div>
      <div className="absolute inset-x-[6%] bottom-[8%] top-[26%] overflow-hidden rounded-[3px] bg-gc-night px-[5%] py-[4%] font-mono text-[9.5px] leading-[1.42] text-exa-paper shadow-2xl">
        {JSON_LINES.map((l, k) => (
          <div key={k} className="exa-line whitespace-nowrap" style={{ paddingLeft: l.i * 12, animationDelay: `${k * 0.12}s` }}>
            {l.t.split(/("[^"]*")/g).map((part, j) =>
              part.startsWith('"') ? (
                <span key={j} className="text-exa-key">{part}</span>
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
      <div className="aspect-[5/6] overflow-hidden rounded-[2px]">{scene}</div>
      <h3 className="mt-6 text-[21px] font-medium tracking-tight text-foreground">{title}</h3>
      <p className="mt-2 text-[16px] leading-relaxed text-foreground/80">{body}</p>
      <Link
        to={to}
        hash={hash}
        className="mt-5 inline-flex w-fit items-center gap-1.5 rounded-[2px] bg-muted px-4 py-2.5 text-[15px] text-foreground/85 transition hover:bg-muted/70"
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
        body="Broad coverage across market, news and code sources so your agent always has right context."
        cta="Use our search API"
        to="/docs"
      />
      <ShowCard
        scene={<HighlightScene />}
        title="Token-efficient contents highlights"
        body="Pull only the most relevant excerpts from long pages and reports, so prompts short & cheap."
        cta="Try it in the Chat playground"
        to="/dashboard/chat"
      />
      <ShowCard
        scene={<ResearchScene />}
        title="Low-latency to research in one API"
        body="Choose fast answers or deep research, with structured outputs you can drop straight into your app."
        cta="Integrate Jenvu with your agent"
        to="/docs"
        hash="ai-assistants"
      />
    </div>
  );
}
