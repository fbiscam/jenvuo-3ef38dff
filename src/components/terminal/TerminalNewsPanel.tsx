import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Newspaper } from "lucide-react";
import { getGoldNewsBoard } from "@/lib/news.functions";
import type { NewsEvent } from "@/lib/news-split";
import { cn } from "@/lib/utils";

function nyStamp(iso: string) {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short", month: "short", day: "numeric" }).format(d);
  const time = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit", hour12: true }).format(d);
  return `${date}, ${time} NY`;
}

function Row({ e, released }: { e: NewsEvent; released?: boolean }) {
  return (
    <li className="flex gap-2.5 rounded-lg px-2 py-2 hover:bg-accent">
      <span
        aria-hidden="true"
        className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", e.impact === "High" ? "bg-destructive" : "bg-gc-yellow")}
      />
      <span className="min-w-0">
        <span className="block text-[13px] font-medium leading-snug text-foreground">
          {e.country} · {e.title}
        </span>
        <span className="block text-[11px] text-muted-foreground">
          {nyStamp(e.date)} · {e.impact} impact
        </span>
        {(e.forecast || e.previous) && (
          <span className="block text-[11px] text-muted-foreground">
            {e.forecast && <>Forecast {e.forecast}</>}
            {e.forecast && e.previous && " · "}
            {e.previous && <>{released ? "Prior" : "Previous"} {e.previous}</>}
          </span>
        )}
      </span>
    </li>
  );
}

/** Gold-moving news: what's coming next and the last released events this week. */
export function TerminalNewsPanel() {
  const fetchBoard = useServerFn(getGoldNewsBoard);
  const q = useQuery({ queryKey: ["terminal-news-board"], queryFn: fetchBoard, staleTime: 5 * 60_000, refetchInterval: 5 * 60_000, retry: 2 });
  return (
    <div className="space-y-3">
      <p className="flex items-center gap-2 px-2 pt-1 text-sm font-medium text-foreground">
        <Newspaper className="h-4 w-4 text-gc-yellow" /> Gold news
      </p>
      {q.isPending ? (
        <p className="flex items-center gap-2 px-2 py-3 text-[13px] text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Checking news…</p>
      ) : q.isError || !q.data ? (
        <p className="px-2 py-3 text-[13px] text-muted-foreground">News feed unavailable right now. Please try again shortly.</p>
      ) : (
        <>
          <section>
            <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Upcoming</p>
            {q.data.upcoming.length ? (
              <ul>{q.data.upcoming.map((e) => <Row key={e.date + e.title} e={e} />)}</ul>
            ) : (
              <p className="px-2 py-1.5 text-[13px] text-muted-foreground">No important news ahead this week.</p>
            )}
          </section>
          <section className="border-t border-border pt-2">
            <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Previous</p>
            {q.data.previous.length ? (
              <ul>{q.data.previous.map((e) => <Row key={e.date + e.title} e={e} released />)}</ul>
            ) : (
              <p className="px-2 py-1.5 text-[13px] text-muted-foreground">No news released yet this week.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
