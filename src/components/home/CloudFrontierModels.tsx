import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { getCatalogModel, PRICE_PER_MILLION, PROVIDERS } from "@/lib/model-catalog";

const FEATURED = ["claude-opus-5", "gpt-5.5", "gemini-3.1-pro", "deepseek-v4-pro-max"] as const;

function fmtContext(n: number) {
  return n >= 1_000_000 ? `${n / 1_000_000}M` : `${Math.round(n / 1000)}K`;
}

/* Deterministic star field so SSR and client render the same markup. */
const STARS = Array.from({ length: 34 }, (_, i) => ({
  x: (i * 37) % 100,
  y: (i * 53 + 11) % 100,
  r: i % 5 === 0 ? 1.4 : 0.8,
  o: 0.35 + ((i * 7) % 6) / 10,
}));

export function CloudFrontierModels() {
  const price = PRICE_PER_MILLION.toFixed(2);
  return (
    <section aria-labelledby="frontier-models" className="mx-auto max-w-[1296px] px-5 py-20 sm:px-8">
      <div className="mx-auto max-w-3xl text-center">
        <h2 id="frontier-models" className="text-[34px] font-medium leading-tight tracking-tight text-gc-ink sm:text-[46px]">
          Frontier models, one Jenvu key
        </h2>
        <p className="mt-4 text-[17px] leading-7 text-gc-ink-muted">
          Leading models from every major lab deliver advanced intelligence behind one Jenvu API key.
        </p>
      </div>

      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURED.map((id) => {
          const m = getCatalogModel(id);
          if (!m) return null;
          return (
            <article
              key={id}
              className="relative flex min-h-[340px] flex-col overflow-hidden rounded-3xl p-6"
              style={{
                background:
                  "radial-gradient(120% 80% at 20% 0%, hsl(225 60% 22%) 0%, hsl(230 55% 10%) 55%, hsl(235 50% 6%) 100%)",
                color: "hsl(0 0% 100%)",
              }}
            >
              <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full">
                {STARS.map((s, i) => (
                  <circle key={i} cx={`${s.x}%`} cy={`${s.y}%`} r={s.r} fill="currentColor" opacity={s.o} />
                ))}
              </svg>
              <div className="relative flex flex-1 flex-col">
                <p className="text-[12px] uppercase tracking-[0.16em] opacity-70">{PROVIDERS[m.provider].label}</p>
                <h3 className="mt-2 text-[24px] font-medium tracking-tight">{m.name}</h3>
                <p className="mt-3 text-[14px] leading-6 opacity-80">{m.description}</p>
                <dl className="mt-auto space-y-1.5 pt-6 text-[13px]">
                  <div className="flex justify-between"><dt className="opacity-70">Input</dt><dd>${price} / 1M</dd></div>
                  <div className="flex justify-between"><dt className="opacity-70">Output</dt><dd>${price} / 1M</dd></div>
                  <div className="flex justify-between"><dt className="opacity-70">Context</dt><dd>{fmtContext(m.context)}</dd></div>
                </dl>
                <code className="mt-4 block rounded-lg px-3 py-2 text-[12px]" style={{ background: "hsl(0 0% 100% / 0.1)" }}>
                  {m.id}
                </code>
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-10 text-center">
        <Link to="/models" className="inline-flex items-center gap-1.5 rounded-full bg-gc-blue px-6 py-3 text-[15px] font-medium text-gc-on-blue">
          See all models <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
