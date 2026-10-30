import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, FileText, Loader2, Search, SendHorizontal, Sparkles } from "lucide-react";
import { siteSearch, type SearchHit } from "@/lib/site-search.functions";
import { askJenvu, type AskJenvuResult } from "@/lib/ask-jenvu.functions";
import { SITE_PAGES, matchSitePages } from "@/lib/site-pages";
import { MessageResponse } from "@/components/ai-elements/message";
import { Shimmer } from "@/components/ai-elements/shimmer";
import askJenvuMark from "@/assets/ask-jenvu-mark.png";

/**
 * Header search that opens in place of the top menu (Google Cloud style).
 * Shows matching pages, help guides and stories as you type; when nothing on
 * the site matches (or on Enter) it shows an Ask Jenvu answer in the panel.
 */
export default function HeaderSearch({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const runSearch = useServerFn(siteSearch);
  const runAsk = useServerFn(askJenvu);
  const [q, setQ] = React.useState("");
  const [hits, setHits] = React.useState<SearchHit[]>([]);
  const [searched, setSearched] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [answer, setAnswer] = React.useState<{ q: string; res: AskJenvuResult | null } | null>(null);
  const boxRef = React.useRef<HTMLDivElement | null>(null);

  const pages = React.useMemo(() => matchSitePages(q, SITE_PAGES), [q]);
  const jenvuHits = hits.filter((h) => h.source === "jenvu");
  const webHits = hits.filter((h) => h.source === "web");

  React.useEffect(() => {
    const t = q.trim();
    if (t.length < 3) { setHits([]); setSearched(""); setLoading(false); return; }
    let live = true;
    setLoading(true);
    const id = window.setTimeout(() => {
      runSearch({ data: { q: t.slice(0, 200) } })
        .then((r) => { if (live) { setHits(r.hits.slice(0, 10)); setSearched(t); } })
        .catch(() => { if (live) { setHits([]); setSearched(t); } })
        .finally(() => { if (live) setLoading(false); });
    }, 450);
    return () => { live = false; window.clearTimeout(id); };
  }, [q, runSearch]);

  const ask = React.useCallback((question: string) => {
    const t = question.trim().slice(0, 1000);
    if (!t) return;
    setAnswer({ q: t, res: null });
    runAsk({ data: { messages: [{ role: "user", content: t }] } })
      .then((res) => setAnswer((cur) => (cur && cur.q === t ? { q: t, res } : cur)))
      .catch(() => setAnswer((cur) => (cur && cur.q === t ? { q: t, res: { ok: false, error: "Ask Jenvu couldn't answer right now. Please try again in a moment." } } : cur)));
  }, [runAsk]);

  // Nothing on the site matches a full question → answer it with AI automatically.
  React.useEffect(() => {
    const t = searched;
    if (!t || t !== q.trim() || t.length < 6) return;
    if (pages.length || jenvuHits.length) return;
    if (answer?.q === t) return;
    const id = window.setTimeout(() => ask(t), 600);
    return () => window.clearTimeout(id);
  }, [searched, q, pages.length, jenvuHits.length, answer?.q, ask]);

  React.useEffect(() => {
    const onDown = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [onClose]);

  const go = (to: string) => { onClose(); void navigate({ to: to as "/" }); };
  const openHit = (h: SearchHit) => {
    if (h.source === "web") { window.open(h.url, "_blank", "noopener,noreferrer"); onClose(); }
    else go(h.url);
  };
  const seeAll = () => { const t = q.trim(); if (t) { onClose(); void navigate({ to: "/search", search: { q: t } }); } };

  const t = q.trim();
  const showPanel = t.length > 0;
  const showAnswer = answer && answer.q === t;

  return (
    <div ref={boxRef} className="relative ml-4 min-w-0 flex-1">
      <form
        onSubmit={(e) => { e.preventDefault(); if (t) ask(t); }}
        className="flex h-10 items-center gap-3 rounded-lg border-2 border-gc-blue-deep bg-background px-3"
      >
        <Search className="h-5 w-5 shrink-0 text-gc-ink" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && onClose()}
          placeholder="Search"
          aria-label="Search Jenvu"
          className="min-w-0 flex-1 bg-transparent text-[15px] text-gc-ink outline-none placeholder:text-gc-ink-muted"
        />
        <button type="submit" aria-label="Send" className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gc-ink hover:bg-gc-notice">
          {loading ? <Loader2 className="h-4 w-4 animate-spin text-gc-ink-muted" /> : <SendHorizontal className="h-5 w-5" />}
        </button>
      </form>

      <div className={`absolute inset-x-0 top-full z-[80] mt-1 max-h-[70vh] overflow-y-auto rounded-lg border border-gc-line shadow-lg ${showPanel ? "bg-background" : "bg-gc-panel"}`}>
        {!showPanel && (
          <p className="px-4 py-4 text-[13px] italic text-gc-ink-muted">
            Do not enter any sensitive, confidential, or personal information.
          </p>
        )}

        {showPanel && showAnswer && (
          <div className="border-b border-gc-line bg-gc-panel px-4 py-3">
            <div className="mb-2 flex items-center gap-2 text-[12px] font-medium text-gc-ink-muted">
              Ask Jenvu
            </div>
            {answer.res === null ? (
              <div className="flex items-center gap-2 text-[13px]">
                <span aria-hidden className="ask-jenvu-mark-ring h-6 w-10 shrink-0" style={{ ["--mark" as string]: `url(${askJenvuMark})` }}><span className="ask-jenvu-mark-loop h-full w-full" /></span>
                <Shimmer>Thinking about your question…</Shimmer>
              </div>
            ) : answer.res.ok ? (
              <div className="text-[14px] text-gc-ink"><MessageResponse>{answer.res.text}</MessageResponse></div>
            ) : (
              <p className="text-[13px] text-gc-ink-muted">{answer.res.error}</p>
            )}
          </div>
        )}

        {showPanel && pages.length > 0 && (
          <Section title="Pages">
            {pages.map((p) => (
              <Row key={p.to} onClick={() => go(p.to)} icon={<FileText className="h-4 w-4" />} title={p.label} sub={p.to === "/" ? "jenvu.com" : `jenvu.com${p.to}`} />
            ))}
          </Section>
        )}

        {showPanel && jenvuHits.length > 0 && (
          <Section title="Help and stories">
            {jenvuHits.map((h) => (
              <Row key={h.url} onClick={() => openHit(h)} icon={<FileText className="h-4 w-4" />} title={h.title} sub={h.description} />
            ))}
          </Section>
        )}

        {showPanel && webHits.length > 0 && (
          <Section title="From the web">
            {webHits.slice(0, 4).map((h) => (
              <Row key={h.url} onClick={() => openHit(h)} icon={<ExternalLink className="h-4 w-4" />} title={h.title} sub={h.path.join(" › ")} />
            ))}
          </Section>
        )}

        {showPanel && !loading && searched === t && !pages.length && !hits.length && !showAnswer && t.length < 6 && (
          <p className="px-4 py-4 text-[13px] text-gc-ink-muted">No matches yet. Press Enter to ask Jenvu.</p>
        )}

        {showPanel && (
          <div className="flex items-center justify-between gap-2 border-t border-gc-line px-4 py-2.5 text-[13px]">
            {!showAnswer ? (
              <button type="button" onClick={() => ask(t)} className="inline-flex items-center gap-1.5 text-gc-blue hover:underline">
                <Sparkles className="h-3.5 w-3.5" /> Ask Jenvu about “{t.length > 40 ? `${t.slice(0, 40)}…` : t}”
              </button>
            ) : <span />}
            <button type="button" onClick={seeAll} className="text-gc-blue hover:underline">See all results</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-1.5">
      <p className="px-4 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-wide text-gc-ink-muted">{title}</p>
      {children}
    </div>
  );
}

function Row({ onClick, icon, title, sub }: { onClick: () => void; icon: React.ReactNode; title: string; sub?: string }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-start gap-3 px-4 py-2 text-left hover:bg-gc-surface">
      <span className="mt-0.5 shrink-0 text-gc-ink-muted">{icon}</span>
      <span className="min-w-0">
        <span className="block truncate text-[14px] text-gc-ink">{title}</span>
        {sub && <span className="block truncate text-[12px] text-gc-ink-muted">{sub}</span>}
      </span>
    </button>
  );
}
