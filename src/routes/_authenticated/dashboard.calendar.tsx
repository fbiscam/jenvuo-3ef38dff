import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarDays, Loader2 } from "lucide-react";
import { getPairNewsWeek } from "@/lib/news.functions";
import { NEWS_PAIRS, type NewsImpactLevel, type NewsPair } from "@/lib/pair-news";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard/calendar")({
  head: () => ({
    meta: [
      { title: "Economic Calendar — Gold, EUR/USD, BTC | Jenvu" },
      { name: "description", content: "Every high, medium and low impact release this week that can move Gold, EUR/USD and Bitcoin." },
      { property: "og:title", content: "Economic Calendar — Jenvu" },
      { property: "og:description", content: "High, medium and low impact news for XAU/USD, EUR/USD and BTC/USD." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CalendarPage,
});

const PAIR_LABEL: Record<NewsPair, string> = { XAUUSD: "XAU/USD", EURUSD: "EUR/USD", BTCUSD: "BTC/USD" };
const IMPACTS: Array<"All" | NewsImpactLevel> = ["All", "High", "Medium", "Low"];
const dot: Record<NewsImpactLevel, string> = { High: "bg-destructive", Medium: "bg-gc-yellow", Low: "bg-muted-foreground/50" };

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className={cn("console-pill h-8 shrink-0 rounded-full border border-border px-3 text-xs", on ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}>
      {children}
    </button>
  );
}

function CalendarPage() {
  const fetchWeek = useServerFn(getPairNewsWeek);
  const q = useQuery({ queryKey: ["pair-news-week"], queryFn: () => fetchWeek(), staleTime: 5 * 60_000, refetchInterval: 10 * 60_000, retry: 2 });
  const [impact, setImpact] = useState<"All" | NewsImpactLevel>("All");
  const [pair, setPair] = useState<"All" | NewsPair>("All");
  const now = Date.now();
  const rows = (q.data ?? []).filter((e) => (impact === "All" || e.impact === impact) && (pair === "All" || e.pairs.includes(pair)));
  const days = new Map<string, typeof rows>();
  for (const e of rows) {
    const k = new Date(e.date).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" });
    days.set(k, [...(days.get(k) ?? []), e]);
  }
  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 p-4 sm:p-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-medium"><CalendarDays className="h-5 w-5" /> Economic Calendar</h1>
        <p className="text-sm text-muted-foreground">All high, medium and low impact news this week for Gold, EUR/USD and Bitcoin. Times in your local time.</p>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        {IMPACTS.map((i) => <Chip key={i} on={impact === i} onClick={() => setImpact(i)}>{i}</Chip>)}
        <span className="mx-1 w-px shrink-0 bg-border" aria-hidden="true" />
        <Chip on={pair === "All"} onClick={() => setPair("All")}>All pairs</Chip>
        {NEWS_PAIRS.map((p) => <Chip key={p} on={pair === p} onClick={() => setPair(p)}>{PAIR_LABEL[p]}</Chip>)}
      </div>
      {q.isPending ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading calendar…</p>
      ) : q.isError ? (
        <p className="text-sm text-muted-foreground">Calendar unavailable right now. Please try again shortly.</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No matching news this week.</p>
      ) : (
        [...days.entries()].map(([day, list]) => (
          <section key={day} className="console-card border border-border">
            <h2 className="border-b border-border px-4 py-2 text-sm font-medium">{day}</h2>
            <ul className="divide-y divide-border">
              {list.map((e) => {
                const done = new Date(e.date).getTime() <= now;
                return (
                  <li key={e.date + e.country + e.title} className={cn("flex items-start gap-3 px-4 py-2.5", done && "opacity-70")}>
                    <span className="w-14 shrink-0 pt-0.5 text-xs tabular-nums text-muted-foreground">{new Date(e.date).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</span>
                    <span aria-hidden="true" className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", dot[e.impact])} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm">{e.country} · {e.title}</span>
                      <span className="block text-xs text-muted-foreground">
                        {e.impact} impact{e.forecast ? ` · Forecast ${e.forecast}` : ""}{e.previous ? ` · Previous ${e.previous}` : ""}
                      </span>
                    </span>
                    <span className="hidden shrink-0 gap-1 sm:flex">
                      {e.pairs.map((p) => <span key={p} className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">{PAIR_LABEL[p]}</span>)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
