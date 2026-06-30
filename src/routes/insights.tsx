import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import type { Tables } from "@/integrations/supabase/types";

type Insight = Tables<"insights">;

// Format date deterministically in UTC so SSR and client match exactly.
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmtUTC(iso: string, kind: "full" | "compact") {
  const d = new Date(iso);
  const mo = MONTHS[d.getUTCMonth()];
  const day = d.getUTCDate();
  const yr = d.getUTCFullYear();
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return kind === "full"
    ? `${mo} ${day}, ${yr} · ${hh}:${mm} UTC`
    : `${hh}:${mm} UTC · ${mo} ${day}`;
}

const insightsQueryOptions = queryOptions({
  queryKey: ["insights"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("insights")
      .select("*")
      .order("published_at", { ascending: false });

    if (error) throw error;
    return data as Insight[];
  },
});

export const Route = createFileRoute("/insights")({
  head: () => ({
    meta: [
      { title: "Market Insights & Terminal Briefings — Jenvu" },
      {
        name: "description",
        content:
          "Live institutional briefings, gold analysis, and market updates narrated by the Jenvu terminal engine.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(insightsQueryOptions),
  component: InsightsPage,
});

const MONO = "font-['JetBrains_Mono',ui-monospace,monospace]";
const SANS = "font-['Inter',system-ui,sans-serif]";

function InsightsPage() {
  const { data: insights } = useSuspenseQuery(insightsQueryOptions);
  
  // Ticker: any breaking + most recent items (outsourced top-bar feed)
  const tickerItems = (() => {
    const breaking = insights.filter((i) => i.is_breaking);
    const recent = insights.slice(0, 8);
    const seen = new Set<string>();
    return [...breaking, ...recent].filter((i) => {
      if (seen.has(i.id)) return false;
      seen.add(i.id);
      return true;
    }).slice(0, 10);
  })();
  const featured = insights[0];
  const remaining = insights.slice(1);

  return (
    <>
      <style>{`@media (min-width: 1024px){.jenvu-zoom{zoom:1.5}}`}</style>
      <div className={`jenvu-zoom min-h-dvh w-full bg-white text-zinc-900 ${SANS} antialiased selection:bg-zinc-900 selection:text-white`}>
        {/* NAV */}
        <header className="sticky top-0 z-50 border-b border-zinc-100 bg-white/85 backdrop-blur-md">
          <div className="relative mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 py-3 sm:px-6 sm:py-4 md:flex md:justify-between">
            <Link to="/" className="flex min-w-0 items-center gap-2.5">
              <img src="/favicon.png" alt="JENVU AI" className="h-6 w-6 rounded-md object-contain" />
              <span className="truncate font-semibold tracking-tight">JENVU AI</span>
            </Link>
            <nav className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-7 text-sm text-zinc-900">
              <Link to="/signal" className="hover:text-zinc-900">Signal Engine</Link>
              <Link to="/ai-engine" className="hover:text-zinc-900">AI Engine</Link>
              <Link to="/insights" className="hover:text-zinc-900 font-medium text-zinc-900">Insights</Link>
              <Link to="/download" className="hover:text-zinc-900">Download</Link>
              <Link to="/contact" className="hover:text-zinc-900">Contact</Link>
            </nav>
            <div className="flex shrink-0 items-center gap-2">
              <Link
                to="/app"
                className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-zinc-800"
              >
                Launch
              </Link>
            </div>
          </div>
          
          {/* CNN-STYLE BREAKING TICKER — clickable, links to articles */}
          {tickerItems.length > 0 && (
            <div className="bg-red-600 text-white overflow-hidden py-1.5 px-4 sm:px-6">
              <div className="mx-auto max-w-6xl flex items-center gap-4">
                <span className={`${MONO} text-[10px] font-bold uppercase bg-white text-red-600 px-1.5 py-0.5 rounded shrink-0 animate-pulse`}>
                  Live
                </span>
                <div className="flex-1 overflow-hidden">
                  <div className="flex gap-10 whitespace-nowrap animate-ticker-fast">
                    {[...tickerItems, ...tickerItems].map((news, i) => (
                      <Link
                        key={news.id + "-" + i}
                        to="/insights/$slug"
                        params={{ slug: news.slug }}
                        className="text-xs font-medium tracking-tight hover:underline shrink-0"
                      >
                        {news.is_breaking ? "● BREAKING — " : "› "}{news.title}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </header>

        {/* HERO SECTION - FEATURED ARTICLE */}
        {featured && (
          <section className="border-b border-zinc-100 bg-zinc-50/50">
            <div className="mx-auto max-w-6xl px-5 sm:px-6 py-12 sm:py-16">
              <div className="grid lg:grid-cols-12 gap-8 lg:items-center">
                <div className="lg:col-span-7">
                  <div className={`${MONO} text-[10px] uppercase tracking-[0.28em] text-red-600 font-bold mb-4`}>
                    FEATURED REPORT // {featured.category}
                  </div>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight leading-tight">
                    {featured.title}
                  </h1>
                  <p className="mt-5 text-base sm:text-lg text-zinc-600 leading-relaxed max-w-2xl">
                    {featured.excerpt}
                  </p>
                  <div className="mt-8 flex items-center gap-4">
                    <span className={`${MONO} text-[11px] text-zinc-400`}>
                      {fmtUTC(featured.published_at, "full")}
                    </span>
                    <Link
                      to="/insights/$slug"
                      params={{ slug: featured.slug }}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-900 hover:gap-3 transition-all"
                    >
                      Read full briefing <span>→</span>
                    </Link>
                  </div>
                </div>
                <div className="lg:col-span-5">
                  <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-zinc-200 border border-zinc-200 shadow-2xl relative group">
                    <img
                      src={featured.image_url || `https://source.unsplash.com/1600x1200/?gold,trading,${encodeURIComponent(featured.category)}`}
                      alt={featured.title}
                      onError={(e) => {
                        const t = e.currentTarget;
                        t.onerror = null;
                        t.src = `https://source.unsplash.com/1600x1200/?gold,finance`;
                      }}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/40 to-transparent" />
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* MAIN FEED */}
        <main className="mx-auto max-w-6xl px-5 sm:px-6 py-12 sm:py-20">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-6 mb-10">
            <h2 className={`text-xl font-bold ${MONO} uppercase tracking-[0.2em]`}>Terminal Briefings</h2>
            <div className="flex gap-4 text-xs font-medium text-zinc-500">
              <button className="text-zinc-900 border-b-2 border-zinc-900 pb-1">Latest</button>
              <button className="hover:text-zinc-900">Gold</button>
              <button className="hover:text-zinc-900">Macro</button>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10">
            {remaining.map((item) => (
              <article key={item.id} className="group cursor-pointer">
                <Link to="/insights/$slug" params={{ slug: item.slug }} className="block">
                  <div className="aspect-video rounded-xl overflow-hidden bg-zinc-100 border border-zinc-100 mb-5">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.title}
                        loading="lazy"
                        onError={(e) => {
                          const t = e.currentTarget;
                          t.onerror = null;
                          t.src = `https://source.unsplash.com/1200x800/?gold,trading,finance,${encodeURIComponent(item.category)}`;
                        }}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <img
                        src={`https://source.unsplash.com/1200x800/?gold,trading,${encodeURIComponent(item.category)}`}
                        alt={item.title}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    )}
                  </div>
                  <div className={`${MONO} text-[10px] uppercase tracking-widest text-zinc-500 mb-2`}>
                    {item.category}
                  </div>
                  <h3 className="text-xl font-semibold tracking-tight text-zinc-900 group-hover:text-zinc-700 transition-colors">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm text-zinc-600 line-clamp-2 leading-relaxed">
                    {item.excerpt}
                  </p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className={`${MONO} text-[10px] text-zinc-400`}>
                      {fmtUTC(item.published_at, "compact")}
                    </span>
                    <span className="text-[10px] font-bold text-zinc-900 group-hover:translate-x-1 transition-transform">
                      VIEW REPORT ↗
                    </span>
                  </div>
                </Link>
              </article>
            ))}
          </div>

          {/* LOAD MORE / NEWSLETTER */}
          <div className="mt-20 rounded-3xl bg-zinc-900 p-8 sm:p-12 text-center text-white relative overflow-hidden">
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: "radial-gradient(#fff 0.5px, transparent 0.5px)",
              backgroundSize: "20px 20px"
            }} />
            <div className="relative z-10">
              <div className={`${MONO} text-[10px] uppercase tracking-[0.3em] text-zinc-400 mb-4`}>
                INTELLIGENCE HUB
              </div>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-4">
                Institutional briefings, delivered live.
              </h2>
              <p className="text-zinc-400 max-w-xl mx-auto mb-8 text-sm sm:text-base">
                Join 5,000+ traders receiving Jenvu terminal insights directly in their inbox before the New York open.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <input
                  type="email"
                  placeholder="Enter email for daily briefings"
                  className="flex-1 bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/30 transition-all"
                />
                <button className="bg-white text-zinc-900 px-6 py-3 rounded-xl text-sm font-bold hover:bg-zinc-100 transition-colors whitespace-nowrap">
                  SUBSCRIBE
                </button>
              </div>
            </div>
          </div>
        </main>

        {/* FOOTER */}
        <footer className="border-t border-zinc-100">
          <div className="mx-auto max-w-6xl px-5 sm:px-6 py-8 sm:py-10 flex flex-col md:flex-row items-center justify-between gap-5 text-sm text-zinc-900">
            <div className="flex items-center gap-2.5">
              <img src="/favicon.png" alt="JENVU AI" className="h-5 w-5 rounded object-contain" />
              <span className="text-zinc-900 font-semibold">JENVU AI</span>
              <span className="text-zinc-300">·</span>
              <span>© {new Date().getFullYear()}</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
              <Link to="/about" className="hover:text-zinc-900">About</Link>
              <Link to="/insights" className="hover:text-zinc-900">Insights</Link>
              <Link to="/download" className="hover:text-zinc-900">Download</Link>
              <Link to="/contact" className="hover:text-zinc-900">Contact</Link>
              <Link to="/terms" className="hover:text-zinc-900">Terms</Link>
              <Link to="/privacy" className="hover:text-zinc-900">Privacy</Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
