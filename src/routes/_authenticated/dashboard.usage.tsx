import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Calendar, ChartColumn, ChevronDown, ChevronRight, Download, RefreshCw } from "lucide-react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getUsageStats } from "@/lib/usage.functions";

export const Route = createFileRoute("/_authenticated/dashboard/usage")({
  head: () => ({
    meta: [
      { title: "Usage — Jenvu" },
      { name: "description", content: "Track your USD wallet usage, per-scan model + cost history." },
      { property: "og:title", content: "Usage — Jenvu" },
      { property: "og:description", content: "Track your USD wallet usage, per-scan model + cost history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: UsagePage,
});

const REASON_LABEL: Record<string, string> = {
  ai_scan: "AI scan",
  extension_api: "Extension API",
  signal: "Signal scan",
  ict_narration: "ICT narration",
  alert: "Alert broadcast",
  voice_query: "Voice query",
  monthly_reset: "Monthly reset",
  monthly_grant: "Monthly wallet",
  plan_change: "Plan change",
  topup: "Top-up",
  referral_bonus: "Referral bonus",
  signup_grant: "Signup bonus",
  usd_migration: "Wallet migration",
};

function label(reason: string) {
  return REASON_LABEL[reason] ?? reason.replace(/_/g, " ");
}

function fmtUsd(n: number, decimals = 4) {
  if (!Number.isFinite(n)) return "$0.0000";
  const abs = Math.abs(n);
  const d = abs >= 1 ? 2 : decimals;
  return `$${n.toFixed(d)}`;
}

function fmtInt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${Math.round(n)}`;
}

const RANGES = [
  { days: 7, label: "Last 7 days" },
  { days: 14, label: "Last 14 days" },
  { days: 30, label: "Last 30 days" },
] as const;

function UsagePage() {
  const fetchStats = useServerFn(getUsageStats);
  const { data, isLoading, isError, isFetching, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["usage-stats"],
    queryFn: () => fetchStats(),
    staleTime: 10_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
  const [tab, setTab] = useState<"categories" | "models">("categories");
  const [rangeDays, setRangeDays] = useState<number>(30);
  const [model, setModel] = useState<string>("all");
  const [openMenu, setOpenMenu] = useState<"model" | "range" | null>(null);

  const models = useMemo(() => {
    if (!data) return [] as string[];
    return [...new Set(data.ledger.map((r) => r.model).filter(Boolean) as string[])].sort();
  }, [data]);

  const derived = useMemo(() => {
    if (!data) return null;
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    from.setDate(from.getDate() - (rangeDays - 1));
    const fromMs = from.getTime();

    const rows = data.ledger.filter((r) => {
      if (new Date(r.created_at).getTime() < fromMs) return false;
      if (model !== "all" && (r.model ?? "unknown") !== model) return false;
      return true;
    });

    const spendRows = rows.filter((r) => r.delta < 0);
    const earnRows = rows.filter((r) => r.delta > 0);
    const spent = spendRows.reduce((s, r) => s + Math.abs(r.delta), 0);
    const earned = earnRows.reduce((s, r) => s + r.delta, 0);
    const totalTokens = spendRows.reduce((s, r) => s + (r.prompt_tokens ?? 0) + (r.completion_tokens ?? 0), 0);
    const inputTokens = spendRows.reduce((s, r) => s + (r.prompt_tokens ?? 0), 0);
    const outputTokens = totalTokens - inputTokens;

    const days: { date: string; spent: number; earned: number; tokens: number; requests: number }[] = [];
    const idx = new Map<string, number>();
    for (let i = rangeDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      idx.set(key, days.length);
      days.push({ date: key, spent: 0, earned: 0, tokens: 0, requests: 0 });
    }
    for (const r of rows) {
      const i = idx.get(r.created_at.slice(0, 10));
      if (i == null) continue;
      const b = days[i]!;
      if (r.delta < 0) {
        b.spent += Math.abs(r.delta);
        b.requests += 1;
        b.tokens += (r.prompt_tokens ?? 0) + (r.completion_tokens ?? 0);
      } else b.earned += r.delta;
    }

    const avgCost = spendRows.length ? spent / spendRows.length : 0;
    const lastActivity = rows[0]?.created_at ?? null;
    const hasSpend = spent > 0 || earned > 0;
    const keySpend = new Map<string, { spend: number; requests: number }>();
    for (const row of spendRows) {
      if (row.reason !== "extension_api" || !row.metadata || typeof row.metadata !== "object" || Array.isArray(row.metadata)) continue;
      const keyId = typeof row.metadata.api_key_id === "string" ? row.metadata.api_key_id : null;
      if (!keyId) continue;
      const current = keySpend.get(keyId) ?? { spend: 0, requests: 0 };
      current.spend += Math.abs(row.delta);
      current.requests += 1;
      keySpend.set(keyId, current);
    }
    return {
      rows, spendRows, earnRows, spent, earned, totalTokens, inputTokens, outputTokens,
      days, avgCost, lastActivity, hasSpend,
      tokenSeries: days.map((d) => d.tokens),
      requestSeries: days.map((d) => d.requests),
      keySpend,
    };
  }, [data, rangeDays, model]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-9 w-full animate-pulse rounded-lg bg-zinc-100" />
        <div className="h-72 animate-pulse rounded-lg bg-zinc-100" />
      </div>
    );
  }

  if (isError || !data || !derived) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center">
        <p className="text-sm text-zinc-600">Failed to load usage data.</p>
        <button onClick={() => refetch()} className="mt-3 rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white">
          Retry
        </button>
      </div>
    );
  }

  const remaining = Math.max(0, Math.min(data.balance, data.allowance));
  const pct = data.allowance > 0 ? Math.min(100, (remaining / data.allowance) * 100) : 0;
  const maxDaily = Math.max(0.0001, ...derived.days.map((d) => d.spent + d.earned));
  const daysLeft = data.periodResetsAt
    ? Math.max(0, Math.ceil((new Date(data.periodResetsAt).getTime() - Date.now()) / 86_400_000))
    : null;
  const burnPerDay = derived.spent / rangeDays;
  const runway = burnPerDay > 0 ? Math.floor(data.balance / burnPerDay) : null;

  const exportCsv = () => {
    const rows = [
      ["date", "reason", "model", "prompt_tokens", "completion_tokens", "raw_cost_usd", "delta_usd", "balance_after"],
      ...derived.rows.map((r) => [
        r.created_at,
        label(r.reason),
        r.model ?? "",
        String(r.prompt_tokens ?? ""),
        String(r.completion_tokens ?? ""),
        r.raw_cost_usd != null ? String(r.raw_cost_usd) : "",
        String(r.delta),
        String(r.balance_after),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `jenvu-usage-${rangeDays}d.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const rangeLabel = RANGES.find((r) => r.days === rangeDays)?.label ?? `Last ${rangeDays} days`;

  return (
    <div className="space-y-4">
      {/* ── Header bar ── */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-zinc-200 pb-3 sm:flex sm:flex-wrap sm:justify-between">
        <h1 className="min-w-0 truncate text-xl font-semibold text-zinc-900">   Usage</h1>
        <div className="col-span-2 grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] items-center gap-1.5 sm:col-span-1 sm:flex sm:gap-2">
          <Dropdown
            open={openMenu === "model"}
            onToggle={() => setOpenMenu(openMenu === "model" ? null : "model")}
            trigger={model === "all" ? "All models" : model}
            options={[{ value: "all", label: "All models" }, ...models.map((m) => ({ value: m, label: m }))]}
            value={model}
            onSelect={(v) => { setModel(v); setOpenMenu(null); }}
          />
          <Dropdown
            open={openMenu === "range"}
            onToggle={() => setOpenMenu(openMenu === "range" ? null : "range")}
            trigger={rangeLabel}
            icon={<Calendar className="h-3.5 w-3.5 text-zinc-500" />}
            options={RANGES.map((r) => ({ value: String(r.days), label: r.label }))}
            value={String(rangeDays)}
            onSelect={(v) => { setRangeDays(Number(v)); setOpenMenu(null); }}
          />
          <button
            type="button"
            onClick={() => refetch()}
            aria-label="Refresh usage"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
          <button
            type="button"
            onClick={exportCsv}
            aria-label="Download usage CSV"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>


      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* ── Left column ── */}
        <div className="space-y-4 xl:col-span-2">
          {/* Total Spend */}
          <section>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 border-b border-zinc-100 px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <div className="text-[13px] text-zinc-500">Total Spend</div>
                <div className="mt-0.5 text-xl font-semibold tabular-nums text-zinc-900">
                  {derived.hasSpend ? fmtUsd(derived.spent, 2) : "No data"}
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-x-3 gap-y-1 text-[12px] text-zinc-500">
                <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-sky-400" /> Spent</span>
                <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-zinc-300" /> Added</span>
              </div>
            </div>
            <div className="px-4 pb-5 pt-4 sm:px-5 sm:pb-6 sm:pt-5">
              {derived.hasSpend ? (
                <div className="h-64 min-w-0 w-full sm:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={derived.days} margin={{ top: 8, right: 4, bottom: 4, left: 0 }}>
                      <defs>
                        <linearGradient id="usageSpent" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#93c5fd" stopOpacity={0.82} />
                          <stop offset="72%" stopColor="#dbeafe" stopOpacity={0.42} />
                          <stop offset="100%" stopColor="#ffffff" stopOpacity={0.06} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#f1f1f3" strokeDasharray="4 6" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={10}
                        tick={{ fill: "#a1a1aa", fontSize: 11 }}
                        tickFormatter={(v: string) =>
                          new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                        }
                        minTickGap={24}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        width={48}
                        tick={{ fill: "#a1a1aa", fontSize: 11, textAnchor: "start", dx: -46 }}
                        tickFormatter={(v: number) => `$${v >= 1 ? v.toFixed(0) : v.toFixed(2)}`}
                      />
                      <RTooltip
                        cursor={{ stroke: "#d4d4d8", strokeDasharray: "4 4" }}
                        labelFormatter={(v) =>
                          new Date(String(v)).toLocaleDateString(undefined, {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })
                        }
                         formatter={(value: number, name: string) => [fmtUsd(value, 2), name]}
                        contentStyle={{
                          borderRadius: 12,
                          border: "1px solid #ececef",
                          padding: "10px 12px",
                          fontSize: 12,
                          boxShadow: "0 10px 30px rgba(24,24,27,0.10)",
                        }}
                        labelStyle={{ color: "#18181b", fontWeight: 600, marginBottom: 4 }}
                        itemStyle={{ padding: 0 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="spent"
                        name="Spent"
                        stroke="#18181b"
                        strokeWidth={2}
                        fill="url(#usageSpent)"
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
                        animationDuration={900}
                      />
                      <Line
                        type="monotone"
                        dataKey="earned"
                        name="Added"
                        stroke="#a1a1aa"
                        strokeWidth={1.75}
                        strokeDasharray="5 6"
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
                        animationDuration={900}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-64 flex-col items-center justify-center text-center">
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500">
                    <ChartColumn className="h-5 w-5" />
                  </span>
                  <p className="mt-3 text-sm font-semibold text-zinc-900">No usage data</p>
                  <p className="mt-1 max-w-xs text-[13px] text-zinc-500">
                    Nothing recorded for {rangeLabel.toLowerCase()}{model !== "all" ? ` on ${model}` : ""}.
                  </p>
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="flex max-w-full items-center gap-5 overflow-x-auto border-b border-zinc-200 px-4 text-[13px] sm:px-5">
              <TabButton active={tab === "categories"} onClick={() => setTab("categories")}>Spend categories</TabButton>
              <TabButton active={tab === "models"} onClick={() => setTab("models")}>Models</TabButton>
            </div>

            {tab === "categories" ? (
              <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-5">
                <CategoryCard
                    title="AI and extension requests"
                  items={[
                    { color: "bg-indigo-500", label: `${fmtInt(derived.spendRows.length)} requests` },
                    { color: "bg-zinc-300", label: `${fmtInt(derived.inputTokens)} input tokens` },
                    { color: "bg-zinc-300", label: `${fmtUsd(derived.spent, 2)} spent` },
                  ]}
                />
                <CategoryCard
                  title="Top-ups & bonuses"
                  items={[
                    { color: "bg-emerald-500", label: `${fmtInt(derived.earnRows.length)} credits` },
                    { color: "bg-zinc-300", label: `${fmtUsd(derived.earned, 2)} added` },
                  ]}
                />
              </div>
            ) : (
              <ModelBreakdown rows={derived.spendRows} />
            )}
          </section>
        </div>

        {/* ── Right column ── */}
        <div className="space-y-4">
          {/* Period spend */}
          <section className="border-b border-zinc-200 px-1 pb-5">
            <div className="text-[13px] text-zinc-500">
              Monthly Wallet
            </div>
            <div className="mt-3 flex items-center justify-between text-[13px]">
              <span className="text-zinc-600">Wallet</span>
              <span className="tabular-nums text-zinc-800">{fmtUsd(remaining, 2)} / {fmtUsd(data.allowance, 2)}</span>
            </div>
            <div className="relative mt-2 h-2.5 w-full rounded-full bg-zinc-100">
              <div className="h-full rounded-full bg-zinc-900 transition-all" style={{ width: `${pct}%` }} />
            </div>
            {daysLeft != null && (
              <div className="mt-2 text-[11.5px] text-zinc-500">Resets in {daysLeft} day{daysLeft === 1 ? "" : "s"}</div>
            )}
          </section>

          {/* Total tokens */}
          <section className="border-b border-zinc-200 px-1 pb-5">
            <div className="text-[13px] text-zinc-500">Total tokens</div>
            <div className="mt-0.5 text-xl font-semibold tabular-nums text-zinc-900">{fmtInt(derived.totalTokens)}</div>
            <div className="mt-4">
              <MiniLine data={derived.tokenSeries} color="#e11d63" filled={derived.totalTokens > 0} />
            </div>
          </section>

          {/* Total requests */}
          <section className="border-b border-zinc-200 px-1 pb-5">
            <div className="text-[13px] text-zinc-500">Total requests</div>
            <div className="mt-0.5 text-xl font-semibold tabular-nums text-zinc-900">{fmtInt(derived.spendRows.length)}</div>
            <div className="mt-4">
              <MiniLine data={derived.requestSeries} color="#a1a1aa" filled={derived.spendRows.length > 0} dashed />
            </div>
          </section>

          {/* Recent extension keys */}
          <section className="border-b border-zinc-200 px-1 pb-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[13px] font-medium text-zinc-900">Recent API keys</div>
                <div className="mt-0.5 text-[11.5px] text-zinc-500">Latest four · spend for {rangeLabel.toLowerCase()}</div>
              </div>
              <span className="text-[11px] tabular-nums text-zinc-400">{data.recentExtensionKeys.length} shown</span>
            </div>
            {data.recentExtensionKeys.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-zinc-500">No extension API keys yet.</p>
            ) : (
              <div className="mt-3 divide-y divide-zinc-100">
                {data.recentExtensionKeys.map((key, index) => {
                  const usage = derived.keySpend.get(key.id) ?? { spend: 0, requests: 0 };
                  return (
                    <div key={key.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <code className="truncate font-mono text-[11.5px] text-zinc-800">{key.keyPrefix}••••••••••</code>
                          {index === 0 && <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[9px] font-medium text-blue-700">Newest</span>}
                        </div>
                        <div className="mt-1 truncate text-[10.5px] text-zinc-400">
                          {key.name} · {usage.requests} request{usage.requests === 1 ? "" : "s"} · {key.revokedAt ? "Revoked" : "Active"}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-[12px] font-semibold tabular-nums text-zinc-900">{fmtUsd(usage.spend, 2)}</div>
                        <div className="mt-0.5 text-[10px] text-zinc-400">Spend</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

        </div>
      </div>
    </div>
  );
}


function Dropdown({
  open, onToggle, trigger, icon, options, value, onSelect,
}: {
  open: boolean;
  onToggle: () => void;
  trigger: string;
  icon?: React.ReactNode;
  options: { value: string; label: string }[];
  value: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="relative min-w-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex h-9 w-full min-w-0 items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 text-[12px] font-medium text-zinc-700 transition hover:bg-zinc-50 sm:w-auto sm:max-w-[190px] sm:px-3 sm:text-[13px]"
      >
        {icon}
        <span className="truncate">{trigger}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
      </button>
      {open && (
        <div className="absolute left-0 z-20 mt-1 max-h-64 w-[min(14rem,calc(100vw-2rem))] overflow-y-auto rounded-lg border border-zinc-200 bg-white p-1 shadow-lg sm:left-auto sm:right-0">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => onSelect(o.value)}
              className={`block w-full truncate rounded-md px-2.5 py-1.5 text-left text-[13px] transition hover:bg-zinc-100 ${
                o.value === value ? "font-semibold text-zinc-900" : "text-zinc-600"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px border-b-2 border-transparent py-2.5 font-medium transition ${
        active ? "text-zinc-900" : "text-zinc-500 hover:text-zinc-700"
      }`}
    >
      {children}
    </button>
  );
}

function CategoryCard({ title, items }: { title: string; items: { color: string; label: string }[] }) {
  return (
    <div className="py-2">
      <div className="flex items-center gap-1 text-[13px] font-medium text-zinc-800">
        {title} <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
      </div>
      <div className="mt-3 space-y-1.5">
        {items.map((it) => (
          <div key={it.label} className="flex items-center gap-2 text-[12px] text-zinc-500">
            <span className={`inline-block h-2 w-2 rounded-[2px] ${it.color}`} />
            {it.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function ModelBreakdown({ rows }: { rows: { model?: string | null; prompt_tokens?: number | null; completion_tokens?: number | null; raw_cost_usd?: number | null; delta: number }[] }) {
  const byModel = new Map<string, { requests: number; tokens: number; cost: number }>();
  for (const r of rows) {
    const key = r.model ?? "unknown";
    const cur = byModel.get(key) ?? { requests: 0, tokens: 0, cost: 0 };
    cur.requests += 1;
    cur.tokens += (r.prompt_tokens ?? 0) + (r.completion_tokens ?? 0);
    cur.cost += r.raw_cost_usd != null ? Number(r.raw_cost_usd) : Math.abs(r.delta);
    byModel.set(key, cur);
  }
  const list = [...byModel.entries()].sort((a, b) => b[1].cost - a[1].cost);
  if (list.length === 0) {
    return <p className="p-5 text-center text-[13px] text-zinc-500">There is no usage data for this period and group.</p>;
  }
  return (
    <div className="divide-y divide-zinc-100">
      {list.map(([model, s]) => (
        <div key={model} className="grid grid-cols-1 gap-2 px-4 py-3 text-[13px] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5">
          <span className="min-w-0 truncate font-mono text-[12px] text-zinc-700">{model}</span>
          <div className="grid grid-cols-3 items-center gap-2 tabular-nums text-[11px] text-zinc-500 sm:flex sm:shrink-0 sm:gap-4 sm:text-[12px]">
            <span>{fmtInt(s.requests)} requests</span>
            <span>{fmtInt(s.tokens)} tokens</span>
            <span className="font-semibold text-zinc-800">{fmtUsd(s.cost, 2)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function TypeBreakdown({ rows }: { rows: { reason: string; delta: number }[] }) {
  const byType = new Map<string, { count: number; cost: number }>();
  for (const r of rows) {
    const key = label(r.reason);
    const cur = byType.get(key) ?? { count: 0, cost: 0 };
    cur.count += 1;
    cur.cost += Math.abs(r.delta);
    byType.set(key, cur);
  }
  const list = [...byType.entries()].sort((a, b) => b[1].cost - a[1].cost);
  if (list.length === 0) {
    return <p className="py-8 text-center text-[13px] text-zinc-500">There is no usage data for this period and group.</p>;
  }
  const max = Math.max(...list.map(([, s]) => s.cost), 0.0001);
  return (
    <div className="space-y-3">
      {list.map(([name, s]) => (
        <div key={name}>
          <div className="flex items-center justify-between text-[12px]">
            <span className="font-medium text-zinc-700">{name}</span>
            <span className="tabular-nums text-zinc-500">{fmtInt(s.count)} · {fmtUsd(s.cost, 2)}</span>
          </div>
          <div className="mt-1 h-1.5 w-full rounded-full bg-zinc-100">
            <div className="h-full rounded-full bg-zinc-800" style={{ width: `${(s.cost / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function MiniLine({ data, color, filled, dashed }: { data: number[]; color: string; filled: boolean; dashed?: boolean }) {
  const W = 260;
  const H = 44;
  const n = Math.max(data.length, 2);
  const max = Math.max(...data, 1);
  const pts = Array.from({ length: n }, (_, i) => {
    const x = (i / (n - 1)) * W;
    const y = H - 4 - ((data[i] ?? 0) / max) * (H - 10);
    return [x, y] as const;
  });
  const dPath = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  if (!filled) {
    // dashed empty baseline, like the reference
    const segs = 7;
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" style={{ height: H }}>
        {Array.from({ length: segs }, (_, i) => {
          const x0 = (i / segs) * W + 2;
          const x1 = ((i + 1) / segs) * W - 6;
          return <line key={i} x1={x0} y1={H - 4} x2={x1} y2={H - 4} stroke={color} strokeWidth={1.5} />;
        })}
      </svg>
    );
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" style={{ height: H }}>
      <path d={dPath} fill="none" stroke={color} strokeWidth={1.5} strokeDasharray={dashed ? "5 4" : undefined} strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r={3.5} fill="white" stroke={color} strokeWidth={1.5} />
    </svg>
  );
}
