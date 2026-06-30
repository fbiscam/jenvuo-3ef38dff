import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Tables } from "@/integrations/supabase/types";

type Insight = Tables<"insights">;

const insightDetailQueryOptions = (slug: string) => queryOptions({
  queryKey: ["insight", slug],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("insights")
      .select("*")
      .eq("slug", slug)
      .single();

    if (error) throw error;
    return data as Insight;
  },
});

export const Route = createFileRoute("/insights/$slug")({
  head: ({ loaderData }) => {
    const data = loaderData as Insight | undefined;
    return {
      meta: [
        { title: data ? `${data.title} — Jenvu` : "Market Insight — Jenvu" },
        {
          name: "description",
          content: data?.excerpt || "Institutional market analysis from Jenvu.",
        },
        { property: "og:title", content: data?.title },
        { property: "og:description", content: data?.excerpt },
        { property: "og:image", content: data?.image_url },
      ],
    };
  },
  loader: ({ params, context }) => context.queryClient.ensureQueryData(insightDetailQueryOptions(params.slug)),
  component: InsightDetailPage,
});

const MONO = "font-['JetBrains_Mono',ui-monospace,monospace]";
const SANS = "font-['Inter',system-ui,sans-serif]";

function InsightDetailPage() {
  const { slug } = useParams({ from: "/insights/$slug" });
  const { data: insight } = useSuspenseQuery(insightDetailQueryOptions(slug));

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
              <Link to="/insights" className="hover:text-zinc-900 font-medium">Insights</Link>
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
        </header>

        <main className="mx-auto max-w-4xl px-5 sm:px-6 py-12 sm:py-20">
          <Link
            to="/insights"
            className={`${MONO} text-[10px] uppercase tracking-widest text-zinc-500 hover:text-zinc-900 mb-8 inline-flex items-center gap-2`}
          >
            ← Back to insights
          </Link>

          <header className="mb-10 sm:mb-16">
            <div className={`${MONO} text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-4`}>
              {insight.category} // REPORT_{insight.id.slice(0, 8).toUpperCase()}
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight leading-tight text-zinc-900">
              {insight.title}
            </h1>
            <div className="mt-8 flex items-center gap-4 text-xs text-zinc-400">
              <span>{format(new Date(insight.published_at), "MMMM d, yyyy · HH:mm 'UTC'")}</span>
              <span className="h-1 w-1 rounded-full bg-zinc-200" />
              <span>Institutional Grade</span>
            </div>
          </header>

          {insight.image_url && (
            <div className="aspect-[21/9] rounded-2xl overflow-hidden mb-12 border border-zinc-100 shadow-xl">
              <img
                src={insight.image_url}
                alt={insight.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="prose prose-zinc max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-a:text-zinc-900 prose-img:rounded-2xl">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {insight.content}
            </ReactMarkdown>
          </div>

          <div className="mt-20 pt-10 border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-zinc-100 flex items-center justify-center font-bold text-zinc-400">
                J
              </div>
              <div>
                <div className="text-sm font-semibold text-zinc-900">Jenvu Terminal Engine</div>
                <div className={`${MONO} text-[10px] uppercase text-zinc-400`}>Automated Insight Synthesis</div>
              </div>
            </div>
            <div className="flex gap-4">
              <button className="p-2 rounded-full border border-zinc-200 hover:bg-zinc-50 transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
              </button>
              <button className="p-2 rounded-full border border-zinc-200 hover:bg-zinc-50 transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
              </button>
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
