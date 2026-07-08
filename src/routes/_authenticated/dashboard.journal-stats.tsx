import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getJournalStats, type JournalStats } from "@/lib/journal-stats.functions";
import { ArrowLeft, Download, TrendingUp, Trophy, Target, Activity, BarChart3 } from "lucide-react";
import PageLoading from "@/components/PageLoading";
import { useCredits } from "@/hooks/useCredits";
import UpgradeOverlay from "@/components/UpgradeOverlay";

export const Route = createFileRoute("/_authenticated/dashboard/journal-stats")({
  head: () => ({
    meta: [
      { title: "Journal Stats — Jenvu" },
      { name: "description", content: "Deep performance analytics: equity curve, win rate, per-setup and per-pair breakdowns, session heatmap." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: JournalStatsPage,
});

type RangeKey = "7d" | "30d" | "90d" | "ytd" | "all";
const RANGE_LABEL: Record<RangeKey, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  ytd: "Year to date",
  all: "All time",
};

function fromForRange(r: RangeKey): string | undefined {
  const now = new Date();
  if (r === "all") return undefined;
  if (r === "ytd") return new Date(now.getFullYear(), 0, 1).toISOString();
  const days = r === "7d" ? 7 : r === "30d" ? 30 : 90;
  return new Date(now.getTime() - days * 86400_000).toISOString();
}

function fmt(n: number, d = 2) {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: d, minimumFractionDigits: d });
}

function JournalStatsPage() {
  const { features, isLoading: creditsLoading } = useCredits();
  const locked = !creditsLoading && !features.journal;
  const fetchStats = useServerFn(getJournalStats);
  const [range, setRange] = useState<RangeKey>("30d");
  const [data, setData] = useState<JournalStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const from = fromForRange(range);
    fetchStats({ data: from ? { from } : {} })
      .then((d) => {
        if (alive) setData(d);
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [range, fetchStats]);

  const exportCsv = () => {
    if (!data) return;
    const rows: string[] = [];
    rows.push("Section,Key,Value");
    const t = data.totals;
    Object.entries(t).forEach(([k, v]) => rows.push(`Totals,${k},${v}`));
    rows.push("");
    rows.push("By Setup,Name,Trades,Wins,Losses,PnL,Win Rate %");
    for (const s of data.by_setup)
      rows.push(`,${csv(s.name)},${s.trades},${s.wins},${s.losses},${fmt(Number(s.pnl))},${s.win_rate}`);
    rows.push("");
    rows.push("By Pair,Pair,Trades,Wins,Losses,PnL,Win Rate %");
    for (const p of data.by_pair)
      rows.push(`,${csv(p.pair)},${p.trades},${p.wins},${p.losses},${fmt(Number(p.pnl))},${p.win_rate}`);
    rows.push("");
    rows.push("Equity,Day,PnL,Equity");
    for (const e of data.equity)
      rows.push(`,${e.day},${fmt(Number(e.pnl))},${fmt(Number(e.equity))}`);
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jenvu-journal-stats-${range}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (creditsLoading || loading) return <PageLoading label="Crunching your stats" />;

  return (
    <UpgradeOverlay
      show={locked}
      title="Journal Stats is Pro"
      description="Deep analytics on every setup — upgrade to unlock equity curves and per-tag performance."
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard/journal"
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Journal
            </Link>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Journal Stats</h2>
              <p className="text-xs text-zinc-500">Alpha per setup, session, and pair.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={range}
              onChange={(e) => setRange(e.target.value as RangeKey)}
              className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-zinc-900"
            >
              {(Object.keys(RANGE_LABEL) as RangeKey[]).map((k) => (
                <option key={k} value={k}>
                  {RANGE_LABEL[k]}
                </option>
              ))}
            </select>
            <button
              onClick={exportCsv}
              className="inline-flex items-center gap-1 rounded-lg bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
            >
              <Download className="h-3.5 w-3.5" /> CSV
            </button>
          </div>
        </div>

        {data && data.totals.total === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center">
            <BarChart3 className="mx-auto h-8 w-8 text-zinc-400" />
            <h3 className="mt-3 text-base font-semibold">No trades in this range</h3>
            <p className="mt-1 text-sm text-zinc-500">Log a trade or widen the date range.</p>
          </div>
        ) : data ? (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Kpi
                icon={Activity}
                label="Trades"
                value={String(data.totals.total)}
                sub={`${data.totals.wins}W · ${data.totals.losses}L · ${data.totals.breakeven}BE`}
              />
              <Kpi
                icon={Trophy}
                label="Win Rate"
                value={`${data.totals.win_rate}%`}
                tone={data.totals.win_rate >= 50 ? "pos" : "neg"}
              />
              <Kpi
                icon={TrendingUp}
                label="Total P&L"
                value={`${data.totals.total_pnl >= 0 ? "+" : ""}${fmt(Number(data.totals.total_pnl))}`}
                tone={data.totals.total_pnl >= 0 ? "pos" : "neg"}
                sub={`Best ${fmt(Number(data.totals.best))} · Worst ${fmt(Number(data.totals.worst))}`}
              />
              <Kpi
                icon={Target}
                label="Expectancy"
                value={fmt(Number(data.totals.expectancy))}
                tone={Number(data.totals.expectancy) >= 0 ? "pos" : "neg"}
                sub={`Avg win ${fmt(Number(data.totals.avg_win))} · loss ${fmt(Number(data.totals.avg_loss))}`}
              />
            </div>

            {/* Equity curve */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Equity Curve</h3>
                <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                  Cumulative P&L
                </span>
              </div>
              <EquityChart points={data.equity} />
            </div>

            {/* Per setup */}
            <div className="rounded-2xl border border-zinc-200 bg-white">
              <div className="border-b border-zinc-100 px-4 py-2.5 text-sm font-semibold">
                Performance by Setup
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-sm">
                  <thead className="bg-zinc-50 text-left font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                    <tr>
                      <th className="px-4 py-2 font-medium">Setup</th>
                      <th className="px-4 py-2 font-medium">Trades</th>
                      <th className="px-4 py-2 font-medium">Win rate</th>
                      <th className="px-4 py-2 font-medium">P&L</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {data.by_setup.filter((s) => s.trades > 0).length === 0 ? (
                      <tr>
                        <td className="px-4 py-6 text-center text-xs text-zinc-500" colSpan={4}>
                          No tagged trades yet — tag setups from the journal.
                        </td>
                      </tr>
                    ) : (
                      data.by_setup
                        .filter((s) => s.trades > 0)
                        .map((s) => (
                          <tr key={s.id} className="hover:bg-zinc-50/50">
                            <td className="px-4 py-2.5">
                              <span
                                className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium"
                                style={{ backgroundColor: `${s.color}20`, color: s.color }}
                              >
                                <span
                                  className="h-1.5 w-1.5 rounded-full"
                                  style={{ backgroundColor: s.color }}
                                />
                                {s.name}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 font-mono text-xs">{s.trades}</td>
                            <td className="px-4 py-2.5 font-mono text-xs">{s.win_rate}%</td>
                            <td
                              className={`px-4 py-2.5 font-mono text-xs ${Number(s.pnl) > 0 ? "text-emerald-600" : Number(s.pnl) < 0 ? "text-rose-600" : "text-zinc-500"}`}
                            >
                              {Number(s.pnl) > 0 ? "+" : ""}
                              {fmt(Number(s.pnl))}
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Per pair + Session heatmap */}
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-zinc-200 bg-white">
                <div className="border-b border-zinc-100 px-4 py-2.5 text-sm font-semibold">
                  By Pair
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-zinc-50 text-left font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                      <tr>
                        <th className="px-4 py-2 font-medium">Pair</th>
                        <th className="px-4 py-2 font-medium">Trades</th>
                        <th className="px-4 py-2 font-medium">WR</th>
                        <th className="px-4 py-2 font-medium">P&L</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {data.by_pair.length === 0 ? (
                        <tr>
                          <td className="px-4 py-6 text-center text-xs text-zinc-500" colSpan={4}>
                            No data
                          </td>
                        </tr>
                      ) : (
                        data.by_pair.map((p) => (
                          <tr key={p.pair}>
                            <td className="px-4 py-2.5 font-mono text-xs">{p.pair}</td>
                            <td className="px-4 py-2.5 font-mono text-xs">{p.trades}</td>
                            <td className="px-4 py-2.5 font-mono text-xs">{p.win_rate}%</td>
                            <td
                              className={`px-4 py-2.5 font-mono text-xs ${Number(p.pnl) > 0 ? "text-emerald-600" : Number(p.pnl) < 0 ? "text-rose-600" : "text-zinc-500"}`}
                            >
                              {Number(p.pnl) > 0 ? "+" : ""}
                              {fmt(Number(p.pnl))}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Session Heatmap</h3>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                    P&L by hour (UTC)
                  </span>
                </div>
                <SessionHeatmap sessions={data.sessions} />
              </div>
            </div>
          </>
        ) : null}
      </div>
    </UpgradeOverlay>
  );
}

function csv(s: string) {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function Kpi({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  sub?: string;
  tone?: "pos" | "neg";
}) {
  const tint =
    tone === "pos" ? "text-emerald-600" : tone === "neg" ? "text-rose-600" : "text-zinc-900";
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-400">{label}</div>
        <Icon className="h-3.5 w-3.5 text-zinc-400" />
      </div>
      <div className={`mt-1 text-xl font-semibold ${tint}`}>{value}</div>
      {sub && <div className="mt-1 text-[10px] text-zinc-500">{sub}</div>}
    </div>
  );
}

function EquityChart({ points }: { points: JournalStats["equity"] }) {
  const w = 800;
  const h = 220;
  const pad = 24;
  const parsed = useMemo(
    () =>
      points.map((p) => ({
        t: new Date(p.day).getTime(),
        v: Number(p.equity),
      })),
    [points],
  );
  if (parsed.length === 0) {
    return <div className="p-6 text-center text-xs text-zinc-500">No closed trades yet.</div>;
  }
  const minT = parsed[0].t;
  const maxT = parsed[parsed.length - 1].t;
  const spanT = Math.max(1, maxT - minT);
  const vals = parsed.map((p) => p.v);
  let minV = Math.min(0, ...vals);
  let maxV = Math.max(0, ...vals);
  if (minV === maxV) {
    minV -= 1;
    maxV += 1;
  }
  const x = (t: number) => pad + ((t - minT) / spanT) * (w - pad * 2);
  const y = (v: number) => h - pad - ((v - minV) / (maxV - minV)) * (h - pad * 2);
  const zeroY = y(0);
  const d = parsed.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
  const finalV = parsed[parsed.length - 1].v;
  const positive = finalV >= 0;
  const stroke = positive ? "#10b981" : "#f43f5e";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
      <line x1={pad} x2={w - pad} y1={zeroY} y2={zeroY} stroke="#e4e4e7" strokeDasharray="3 3" />
      <defs>
        <linearGradient id="eq-grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.2" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`${d} L${x(maxT).toFixed(1)},${zeroY.toFixed(1)} L${x(minT).toFixed(1)},${zeroY.toFixed(1)} Z`}
        fill="url(#eq-grad)"
      />
      <path d={d} fill="none" stroke={stroke} strokeWidth="1.75" strokeLinejoin="round" />
      <text x={pad} y={pad - 8} className="fill-zinc-500" fontSize="10">
        Max {fmt(maxV)}
      </text>
      <text x={pad} y={h - 6} className="fill-zinc-500" fontSize="10">
        Min {fmt(minV)}
      </text>
    </svg>
  );
}

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function SessionHeatmap({ sessions }: { sessions: JournalStats["sessions"] }) {
  const map = useMemo(() => {
    const m = new Map<string, { pnl: number; trades: number }>();
    for (const s of sessions) m.set(`${s.dow}-${s.hour}`, { pnl: Number(s.pnl), trades: s.trades });
    return m;
  }, [sessions]);
  const maxAbs = Math.max(1, ...sessions.map((s) => Math.abs(Number(s.pnl))));
  const cellStyle = (pnl: number, trades: number) => {
    if (trades === 0) return { backgroundColor: "#fafafa" };
    const intensity = Math.min(1, Math.abs(pnl) / maxAbs);
    const color = pnl >= 0 ? `rgba(16, 185, 129, ${0.15 + intensity * 0.7})` : `rgba(244, 63, 94, ${0.15 + intensity * 0.7})`;
    return { backgroundColor: color };
  };
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[520px]">
        <div className="mb-1 grid grid-cols-[36px_repeat(24,minmax(0,1fr))] gap-0.5 text-[9px] text-zinc-400">
          <div />
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="text-center font-mono">
              {h % 3 === 0 ? h : ""}
            </div>
          ))}
        </div>
        {DOW_LABELS.map((label, dow) => (
          <div
            key={dow}
            className="mb-0.5 grid grid-cols-[36px_repeat(24,minmax(0,1fr))] gap-0.5"
          >
            <div className="font-mono text-[9px] text-zinc-500">{label}</div>
            {Array.from({ length: 24 }, (_, hour) => {
              const cell = map.get(`${dow}-${hour}`) ?? { pnl: 0, trades: 0 };
              return (
                <div
                  key={hour}
                  title={`${label} ${hour}:00 UTC · ${cell.trades} trades · ${fmt(cell.pnl)}`}
                  className="aspect-square rounded-sm"
                  style={cellStyle(cell.pnl, cell.trades)}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
