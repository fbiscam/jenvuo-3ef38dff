/** Console-style bar charts shared by the Usage and Bot Usage pages. */

/** Evenly spaced label positions (always first and last) that never overlap. */
export function tickIndexes(count: number, maxTicks: number) {
  if (count <= 0) return [] as number[];
  if (count === 1) return [0];
  const n = Math.min(count, Math.max(2, maxTicks));
  const out = new Set<number>();
  for (let k = 0; k < n; k++) out.add(Math.round((k * (count - 1)) / (n - 1)));
  return [...out];
}

function fmtDay(iso: string, withYear: boolean) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: withYear ? "numeric" : undefined,
  });
}

function gapFor(count: number) {
  return count > 60 ? 2 : count > 31 ? 3 : count > 14 ? 5 : 10;
}

/** Date labels pinned inside the chart: first left-aligned, last right-aligned. */
function DateAxis({ dates, compact }: { dates: string[]; compact?: boolean }) {
  const ticks = tickIndexes(dates.length, compact ? 3 : 5);
  const withYear = !compact && dates.length <= 7;
  return (
    <div className="relative mt-2 h-4 text-[11.5px] text-muted-foreground">
      {ticks.map((i, t) => {
        const first = t === 0;
        const last = t === ticks.length - 1 && ticks.length > 1;
        const center = ((i + 0.5) / dates.length) * 100;
        const style = first
          ? { left: 0 }
          : last
            ? { right: 0 }
            : { left: `${center}%`, transform: "translateX(-50%)" };
        return (
          <span key={dates[i]} className="absolute top-0 whitespace-nowrap" style={style}>
            {fmtDay(dates[i]!, withYear)}
          </span>
        );
      })}
    </div>
  );
}

export function StackedBars<K extends string>({
  days,
  keys,
  colors,
  format,
  baseline,
  compact,
  className = "",
}: {
  days: ({ date: string } & Record<K, number>)[];
  keys: K[];
  colors: string[];
  format: (v: number) => string;
  baseline?: string;
  compact?: boolean;
  className?: string;
}) {
  const totals = days.map((day) => keys.reduce((sum, k) => sum + (day[k] ?? 0), 0));
  const max = Math.max(...totals, 0);
  const gap = gapFor(days.length);
  return (
    <div className={`flex min-h-0 min-w-0 flex-col ${className}`}>
      <div
        className={`flex flex-1 items-stretch ${compact ? "min-h-[80px]" : "min-h-[220px]"}`}
        style={{ gap }}
      >
        {days.map((day, i) => {
          const total = totals[i] ?? 0;
          return (
            <div
              key={day.date}
              title={`${fmtDay(day.date, true)} · ${format(total)}`}
              className="group flex min-w-0 flex-1 flex-col justify-end rounded-t-[3px] transition-colors hover:bg-foreground/[0.07]"
            >
              <div
                className="flex w-full flex-col-reverse overflow-hidden rounded-t-[3px]"
                style={{ height: max > 0 ? `${(total / max) * 100}%` : "0%" }}
              >
                {keys.map((k, ki) => {
                  const v = day[k] ?? 0;
                  if (v <= 0 || total <= 0) return null;
                  return <div key={k} style={{ height: `${(v / total) * 100}%`, background: colors[ki] }} />;
                })}
              </div>
              <div className="h-[1.5px] w-full" style={{ background: baseline ?? colors[0] }} />
            </div>
          );
        })}
      </div>
      {!compact ? <DateAxis dates={days.map((d) => d.date)} /> : null}
    </div>
  );
}

/** Profit/loss bars: gains rise above the zero line in green, losses drop below it in red. */
export function ProfitBars({
  days,
  format,
  className = "",
}: {
  days: { date: string; v: number }[];
  format: (v: number) => string;
  className?: string;
}) {
  const maxUp = Math.max(0, ...days.map((d) => d.v));
  const maxDown = Math.max(0, ...days.map((d) => -d.v));
  const span = maxUp + maxDown;
  const upShare = span > 0 ? maxUp / span : 1;
  const gap = gapFor(days.length);
  return (
    <div className={`flex min-h-0 min-w-0 flex-col ${className}`}>
      <div className="flex min-h-[220px] flex-1 flex-col">
        <div className="flex items-stretch" style={{ gap, flex: `${Math.max(upShare, 0.0001)} 1 0` }}>
          {days.map((d) => (
            <div
              key={d.date}
              title={`${fmtDay(d.date, true)} · ${format(d.v)}`}
              className="flex min-w-0 flex-1 flex-col justify-end rounded-t-[3px] hover:bg-foreground/[0.06]"
            >
              <div
                className="w-full rounded-t-[3px]"
                style={{ height: d.v > 0 && maxUp > 0 ? `${(d.v / maxUp) * 100}%` : 0, background: "#2a9d8f" }}
              />
            </div>
          ))}
        </div>
        <div className="h-[1.5px] w-full bg-border" />
        {maxDown > 0 ? (
          <div className="flex items-stretch" style={{ gap, flex: `${1 - upShare} 1 0` }}>
            {days.map((d) => (
              <div
                key={d.date}
                title={`${fmtDay(d.date, true)} · ${format(d.v)}`}
                className="flex min-w-0 flex-1 flex-col justify-start rounded-b-[3px] hover:bg-foreground/[0.06]"
              >
                <div
                  className="w-full rounded-b-[3px]"
                  style={{ height: d.v < 0 ? `${(-d.v / maxDown) * 100}%` : 0, background: "#e76f51" }}
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>
      <DateAxis dates={days.map((d) => d.date)} />
    </div>
  );
}
