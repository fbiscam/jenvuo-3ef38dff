import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Bot, TrendingDown, TrendingUp } from "lucide-react";
import { getBotUsage } from "@/lib/mt5-licenses.functions";
import { botPerformance, plTone } from "@/lib/bot-performance";

const money = (n: number, sign = true) =>
  `${sign ? (n > 0 ? "+" : n < 0 ? "−" : "") : n < 0 ? "−" : ""}$${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dayLabel = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
const toneClass = (v: number) => (plTone(v) === "up" ? "pl-up" : plTone(v) === "down" ? "pl-down" : "text-muted-foreground");

/** Overview card: JX Bot profit per day for the last 30 days, green profit / red loss bars. */
export default function BotPerformanceCard() {
  const load = useServerFn(getBotUsage);
  const { data, isLoading } = useQuery({ queryKey: ["bot-usage"], queryFn: () => load(), staleTime: 60_000 });
  const perf = useMemo(() => botPerformance(data?.rows ?? [], Date.now()), [data]);
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    if (isLoading) return;
    const id = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(id);
  }, [isLoading]);
  const [hover, setHover] = useState<number | null>(null);

  const maxUp = Math.max(0, ...perf.days.map((d) => d.v));
  const maxDown = Math.max(0, ...perf.days.map((d) => -d.v));
  const span = maxUp + maxDown || 1;
  const upShare = perf.hasData && span > 0 ? (maxUp || (maxDown ? 0 : 1)) / span : 0.5;
  const shown = hover != null ? perf.days[hover] : null;
  const TotalIcon = perf.total < 0 ? TrendingDown : TrendingUp;

  return (
    <div className="console-card flex min-h-[184px] flex-col p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-background">
            <Bot className="h-4 w-4 text-foreground" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[16px] font-medium leading-tight text-foreground">JX Bot performance</p>
            <p className="text-[12px] text-muted-foreground">Last 30 days · all MT5 accounts</p>
          </div>
        </div>
        <Link to="/dashboard/bot-usage" className="console-pill shrink-0">
          Details <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <p className="text-[12px] text-muted-foreground">{shown ? dayLabel(shown.date) : "Total profit"}</p>
          <p className={`mt-1 flex items-center gap-2 text-[34px] font-medium leading-none tracking-tight tabular-nums ${isLoading ? "text-muted-foreground" : toneClass(shown ? shown.v : perf.total)}`}>
            {isLoading ? "—" : money(shown ? shown.v : perf.total)}
            {!isLoading && !shown && perf.total !== 0 && <TotalIcon className="h-6 w-6" aria-hidden="true" />}
          </p>
        </div>
        <div className="flex gap-2 text-[12px] tabular-nums">
          <span className="rounded-full bg-background px-2.5 py-1">
            <span className="pl-up font-medium">{perf.winDays}</span> <span className="text-muted-foreground">profit days</span>
          </span>
          <span className="rounded-full bg-background px-2.5 py-1">
            <span className="pl-down font-medium">{perf.lossDays}</span> <span className="text-muted-foreground">loss days</span>
          </span>
        </div>
      </div>

      <div className="relative mt-5 flex h-[120px] flex-col" onMouseLeave={() => setHover(null)} role="img" aria-label={`JX Bot daily profit, last 30 days, total ${money(perf.total)}`}>
        <div className="flex items-stretch gap-[3px]" style={{ flex: `${Math.max(upShare, 0.0001)} 1 0` }}>
          {perf.days.map((d, i) => (
            <div key={d.date} className="flex min-w-0 flex-1 flex-col justify-end" onMouseEnter={() => setHover(i)}>
              <div
                className={`w-full rounded-t-[3px] bg-pl-up transition-[height,opacity] duration-700 ease-out ${hover != null && hover !== i ? "opacity-40" : ""}`}
                style={{ height: grown && d.v > 0 && maxUp > 0 ? `${Math.max(4, (d.v / maxUp) * 100)}%` : 0, transitionDelay: `${i * 18}ms` }}
              />
            </div>
          ))}
        </div>
        <div className="h-px w-full bg-border" />
        <div className="flex items-stretch gap-[3px]" style={{ flex: `${Math.max(1 - upShare, 0.0001)} 1 0` }}>
          {perf.days.map((d, i) => (
            <div key={d.date} className="flex min-w-0 flex-1 flex-col justify-start" onMouseEnter={() => setHover(i)}>
              <div
                className={`w-full rounded-b-[3px] bg-pl-down transition-[height,opacity] duration-700 ease-out ${hover != null && hover !== i ? "opacity-40" : ""}`}
                style={{ height: grown && d.v < 0 && maxDown > 0 ? `${Math.max(4, (-d.v / maxDown) * 100)}%` : 0, transitionDelay: `${i * 18}ms` }}
              />
            </div>
          ))}
        </div>
        {!isLoading && !perf.hasData && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="rounded-full bg-background px-3 py-1.5 text-[12px] text-muted-foreground">
              No JX Bot results yet.{" "}
              <Link to="/dashboard/jx-bot" className="font-medium text-foreground underline underline-offset-2">Set up JX Bot</Link>
            </p>
          </div>
        )}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-muted-foreground tabular-nums">
        <span>{dayLabel(perf.days[0].date)}</span>
        <span>
          {perf.best ? <>Best <span className="pl-up">{money(perf.best.v)}</span></> : null}
          {perf.best && perf.worst ? " · " : null}
          {perf.worst ? <>Worst <span className="pl-down">{money(perf.worst.v)}</span></> : null}
        </span>
        <span>Today</span>
      </div>
    </div>
  );
}
