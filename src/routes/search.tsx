import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ChevronRight, Loader2, Search, X } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { siteSearch, type SearchResult } from "@/lib/site-search.functions";

export const Route = createFileRoute("/search")({
  validateSearch: (s: Record<string, unknown>) => ({ q: typeof s.q === "string" ? s.q : "" }),
  head: () => ({
    meta: [
      { title: "Search — Jenvu" },
      { name: "description", content: "Search Jenvu guides, docs and articles from across the web." },
      { property: "og:title", content: "Search — Jenvu" },
      { property: "og:description", content: "Search Jenvu guides, docs and articles from across the web." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const navigate = useNavigate({ from: "/search" });
  const run = useServerFn(siteSearch);
  const [text, setText] = React.useState(q);
  const [res, setRes] = React.useState<SearchResult | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    setText(q);
    if (!q.trim()) { setRes(null); return; }
    let alive = true;
    setLoading(true);
    run({ data: { q } })
      .then((r) => alive && setRes(r))
      .catch(() => alive && setRes({ hits: [], webError: "Search failed. Please try again." }))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [q, run]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-[1080px] px-4 py-8 sm:px-6">
        <form
          onSubmit={(e) => { e.preventDefault(); if (text.trim()) navigate({ to: ".", search: { q: text.trim() } }); }}
          className="flex h-14 items-center gap-3 rounded-md border border-gc-ink-muted/60 px-4"
        >
          <Search className="h-5 w-5 text-gc-ink-muted" />
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Search Jenvu and the web" className="flex-1 bg-transparent text-[16px] text-gc-ink outline-none" autoFocus />
          {text && <button type="button" aria-label="Clear" onClick={() => setText("")} className="text-gc-ink-muted hover:text-gc-ink"><X className="h-5 w-5" /></button>}
        </form>

        <div className="mt-8 space-y-7 px-1 sm:px-9">
          {loading && <p className="flex items-center gap-2 text-[14px] text-gc-ink-muted"><Loader2 className="h-4 w-4 animate-spin" /> Searching…</p>}
          {!loading && res && res.hits.length === 0 && <p className="text-[14px] text-gc-ink-muted">No results for “{q}”.{res.webError ? ` ${res.webError}` : ""}</p>}
          {!loading && res?.hits.map((h) => (
            <article key={h.url}>
              <a href={h.url} target={h.source === "web" ? "_blank" : undefined} rel={h.source === "web" ? "noopener noreferrer" : undefined} className="text-[18px] leading-snug text-gc-blue-deep hover:underline">{h.title}</a>
              <div className="mt-1 flex flex-wrap items-center gap-1 text-[12px] text-gc-success">
                {h.source === "jenvu" && <span className="mr-1 rounded bg-gc-blue-soft px-1.5 py-0.5 text-[11px] text-gc-blue">Jenvu</span>}
                {h.path.map((p, i) => (
                  <React.Fragment key={i}>{i > 0 && <ChevronRight className="h-3 w-3 text-gc-ink-muted" />}<span>{p}</span></React.Fragment>
                ))}
              </div>
              {h.description && <p className="mt-1.5 line-clamp-2 text-[14px] leading-relaxed text-gc-ink-muted">{h.description}</p>}
            </article>
          ))}
          {!loading && res && res.hits.length > 0 && res.webError && <p className="text-[13px] text-gc-ink-muted">{res.webError}</p>}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
