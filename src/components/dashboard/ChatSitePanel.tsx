import { Shimmer } from "@/components/ai-elements/shimmer";
import type { SiteReport } from "@/lib/site-inspect.functions";

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-2 text-[13px] last:border-0">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words text-right text-foreground">{value || "—"}</span>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="mb-1 text-[12px] font-medium uppercase tracking-wide text-muted-foreground">{title}</div>
      {children}
    </div>
  );
}

export function ChatSitePanel({ report, loading, domain, onClose }: { report: SiteReport | null; loading: boolean; domain: string; onClose: () => void }) {
  const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString() : null);
  return (
    <div className="chat-docview flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5 text-[13px]">
        <span className="min-w-0 flex-1 truncate font-medium text-foreground">Website report · {domain}</span>
        <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">Close</button>
      </div>
      {loading || !report ? (
        <div className="flex flex-1 items-center justify-center text-[15px]"><Shimmer>Checking {domain}…</Shimmer></div>
      ) : (
        <div className="chat-no-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
          {report.error && <p className="mb-3 rounded-lg bg-muted px-3 py-2 text-[13px] text-foreground">{report.error}</p>}
          <div className="mb-4 flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 border-foreground text-[20px] font-semibold tabular-nums text-foreground">{report.score}</div>
            <div className="min-w-0">
              <div className="text-[15px] font-medium text-foreground">SEO score out of 100</div>
              <div className="text-[13px] text-muted-foreground">Based on title, description, headings, speed, HTTPS and image text. Not a Google ranking.</div>
            </div>
          </div>
          <div className="grid gap-3 xl:grid-cols-2">
            <Card title="Domain">
              <Row label="Domain age" value={report.age} />
              <Row label="Registered" value={fmt(report.created)} />
              <Row label="Expires" value={fmt(report.expires)} />
              <Row label="Registrar" value={report.registrar} />
            </Card>
            <Card title="Server">
              <Row label="Status" value={report.status ? String(report.status) : null} />
              <Row label="Load time" value={report.ms !== null ? `${report.ms} ms` : null} />
              <Row label="HTTPS" value={report.https ? "Yes" : "No"} />
              <Row label="Server" value={report.server} />
            </Card>
            <Card title="Page tags">
              <Row label="Title" value={report.title ? `${report.title} (${report.title.length})` : null} />
              <Row label="Description" value={report.description ? `${report.description} (${report.description.length})` : null} />
              <Row label="Canonical" value={report.canonical} />
              <Row label="Robots" value={report.robots} />
              <Row label="Language" value={report.lang} />
            </Card>
            <Card title="Content">
              <Row label="H1" value={report.h1.join(" · ") || null} />
              <Row label="H2 headings" value={String(report.h2Count)} />
              <Row label="Images" value={`${report.images} (${report.imagesNoAlt} without alt text)`} />
              <Row label="Links" value={String(report.links)} />
            </Card>
          </div>
          {report.keywords.length > 0 && (<div className="mt-3">
            <Card title="Top keywords on the page">
              <div className="mt-2 flex flex-wrap gap-1.5">
                {report.keywords.map((k) => (
                  <span key={k.word} className="rounded-full bg-muted px-2.5 py-1 text-[12px] text-foreground">{k.word} <span className="tabular-nums text-muted-foreground">{k.count}</span></span>
                ))}
              </div>
            </Card></div>
          )}
        </div>
      )}
    </div>
  );
}
