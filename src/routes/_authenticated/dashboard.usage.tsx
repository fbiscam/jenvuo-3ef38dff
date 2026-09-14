import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Calendar, ChartColumn, ChevronDown, ChevronRight, Download, RefreshCw, Settings2, X } from "lucide-react";
import { toast } from "sonner";
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
import { Button } from "@/components/ui/button";

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
  voice_query: "AI chat query",
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

function modelDisplay(raw: string) {
  const [providerId = "unknown", ...modelParts] = raw.split("/");
  const provider = providerId === "browseruse" ? "Browser Use" : providerId === "evolink" ? "Evolink" : providerId === "agentrouter" ? "AgentRouter" : providerId;
  const modelId = modelParts.join("/") || raw;
  const model = modelId
    .replace(/^gpt-6-astra$/i, "GPT-6 Astra")
    .replace(/^claude-opus-5$/i, "Claude Opus 5")
    .replace(/^claude-fable-5$/i, "Claude Fable 5");
  return { provider, model };
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
  const [tab, setTab] = useState<"capabilities" | "categories" | "caching" | "safety">("capabilities");
  const [sideTab, setSideTab] = useState<"users" | "services" | "keys">("keys");
  const [rangeDays, setRangeDays] = useState<number>(30);
  const [model, setModel] = useState<string>("all");
  const [groupDays, setGroupDays] = useState<number>(1);
  const [openMenu, setOpenMenu] = useState<"model" | "range" | "group" | null>(null);

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
        <Button type="button" onClick={() => refetch()} className="mt-3">
          Retry
        </Button>
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
    toast.success("Usage CSV downloaded");
  };

  const rangeLabel = RANGES.find((r) => r.days === rangeDays)?.label ?? `Last ${rangeDays} days`;
  const chartDays = groupDays === 1
    ? derived.days
    : derived.days.reduce<typeof derived.days>((groups, day, index) => {
        const groupIndex = Math.floor(index / groupDays);
        const current = groups[groupIndex];
        if (current) {
          current.spent += day.spent;
          current.earned += day.earned;
          current.tokens += day.tokens;
          current.requests += day.requests;
        } else {
          groups.push({ ...day });
        }
        return groups;
      }, []);
  const cachingRows = derived.spendRows.filter((row) => {
    if (!row.metadata || typeof row.metadata !== "object" || Array.isArray(row.metadata)) return false;
    return Object.keys(row.metadata).some((key) => key.toLowerCase().includes("cache"));
  });
  const safetyRows = derived.spendRows.filter((row) => {
    if (!row.metadata || typeof row.metadata !== "object" || Array.isArray(row.metadata)) return false;
    return Object.keys(row.metadata).some((key) => /safety|moderation|blocked/i.test(key));
  });

  return (
    <div className="-mx-5 -mb-7 min-h-[calc(100dvh-4rem)] overflow-hidden bg-background text-foreground sm:-mx-8">
      {/* Header */}
      <div className="flex min-h-14 flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <h1 className="text-lg font-medium text-foreground">Usage</h1>
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] items-center gap-2 sm:flex">
          <Link to="/dashboard/workspace" className="hidden h-9 items-center gap-2 rounded-full border border-border bg-background px-3 text-[13px] text-foreground transition hover:bg-muted sm:flex">
            <span>Default project</span>
            <span className="grid h-5 w-5 place-items-center rounded-full bg-muted text-muted-foreground"><X className="h-3 w-3" /></span>
          </Link>
          <Dropdown
            open={openMenu === "model"}
            onToggle={() => setOpenMenu(openMenu === "model" ? null : "model")}
            trigger={model === "all" ? "All API keys" : model}
            options={[{ value: "all", label: "All API keys" }, ...models.map((m) => ({ value: m, label: m }))]}
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
          <Button
            type="button" variant="ghost" size="icon"
            onClick={async () => {
              const result = await refetch();
              if (result.isError) toast.error("Usage could not be refreshed");
              else toast.success("Usage refreshed");
            }}
            aria-label="Refresh usage"
            className="shrink-0 text-muted-foreground"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
          <Button
            type="button" variant="ghost" size="icon"
            onClick={exportCsv}
            aria-label="Download usage CSV"
            className="shrink-0 text-muted-foreground"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <section className="border-b border-border">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 px-4 pb-2 pt-5 sm:px-7">
              <div className="min-w-0">
                <div className="text-[13px] text-foreground">Total Spend</div>
                <div className="mt-2 text-xl font-medium tabular-nums text-foreground">
                  {derived.hasSpend ? fmtUsd(derived.spent, 2) : "No data"}
                </div>
              </div>
               <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                <span className="hidden sm:inline">Group by</span>
                 <Dropdown
                   open={openMenu === "group"}
                   onToggle={() => setOpenMenu(openMenu === "group" ? null : "group")}
                   trigger={`${groupDays}d`}
                   options={[1, 7, 14].filter((days) => days <= rangeDays).map((days) => ({ value: String(days), label: `${days} day${days === 1 ? "" : "s"}` }))}
                   value={String(groupDays)}
                   onSelect={(value) => { setGroupDays(Number(value)); setOpenMenu(null); }}
                 />
              </div>
            </div>
            <div className="px-4 pb-5 sm:px-7">
              {derived.hasSpend ? (
                <div className="h-72 min-w-0 w-full sm:h-[310px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartDays} margin={{ top: 18, right: 6, bottom: 4, left: 0 }}>
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
                        tick={{ fill: "currentColor", fontSize: 11 }}
                        tickFormatter={(v: string) =>
                          new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                        }
                        minTickGap={24}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        width={48}
                        tick={{ fill: "currentColor", fontSize: 11, textAnchor: "start", dx: -46 }}
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
                <div className="flex h-72 flex-col items-center justify-center text-center sm:h-[310px]">
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <ChartColumn className="h-5 w-5" />
                  </span>
                  <p className="mt-3 text-sm font-medium text-foreground">No usage data</p>
                  <p className="mt-2 max-w-sm text-[13px] text-muted-foreground">
                    The selected date range and group doesn’t have any usage data.
                  </p>
                </div>
              )}
            </div>
          </section>

          <div className="flex max-w-full items-center gap-7 overflow-x-auto border-b border-border px-4 text-[13px] sm:px-6">
            <TabButton active={tab === "capabilities"} onClick={() => setTab("capabilities")}>API capabilities</TabButton>
            <TabButton active={tab === "categories"} onClick={() => setTab("categories")}>Spend categories</TabButton>
            <TabButton active={tab === "caching"} onClick={() => setTab("caching")}>Prompt caching</TabButton>
            <TabButton active={tab === "safety"} onClick={() => setTab("safety")}>Safety usage</TabButton>
          </div>

          {tab === "capabilities" ? (
            <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-4">
              <CapabilityCard title="Responses and Chat Completions" start={rangeStartLabel(rangeDays)} end={rangeEndLabel()} items={[
                { color: "bg-violet-600", label: `${fmtInt(derived.spendRows.length)} requests` },
                { color: "bg-zinc-300", label: `${fmtInt(derived.inputTokens)} input tokens` },
              ]} />
              <CapabilityCard title="Senior reviews" start={rangeStartLabel(rangeDays)} end={rangeEndLabel()} items={[
                { color: "bg-violet-600", label: `${fmtInt(derived.spendRows.filter((r) => r.stage === "senior_review").length)} requests` },
                { color: "bg-zinc-300", label: `${fmtInt(derived.outputTokens)} output tokens` },
              ]} />
              <CapabilityCard title="Extension API" start={rangeStartLabel(rangeDays)} end={rangeEndLabel()} items={[
                { color: "bg-violet-600", label: `${fmtInt(derived.spendRows.filter((r) => r.reason === "extension_api").length)} requests` },
              ]} />
              <CapabilityCard title="Credits and top-ups" start={rangeStartLabel(rangeDays)} end={rangeEndLabel()} items={[
                { color: "bg-violet-600", label: `${fmtInt(derived.earnRows.length)} additions` },
                { color: "bg-zinc-300", label: `${fmtUsd(derived.earned, 2)} added` },
              ]} />
            </div>
          ) : tab === "categories" ? (
            <div className="grid gap-8 p-5 md:grid-cols-2">
              <div><h2 className="mb-4 text-[13px] text-foreground">By service</h2><TypeBreakdown rows={derived.spendRows} /></div>
              <div><h2 className="mb-4 text-[13px] text-foreground">By model</h2><ModelBreakdown rows={derived.spendRows} /></div>
            </div>
          ) : tab === "caching" ? (
            <UsageSubset title="Prompt caching" rows={cachingRows} empty="No prompt-cache usage was recorded for this selection." />
          ) : (
            <UsageSubset title="Safety usage" rows={safetyRows} empty="No safety or moderation events were recorded for this selection." />
          )}
        </div>

        <aside className="border-t border-border xl:border-l xl:border-t-0">
          <section className="border-b border-border px-4 py-5">
            <div className="flex items-center justify-between text-[13px] text-foreground">
              <span>Monthly spend</span>
              <Button asChild type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                <Link to="/dashboard/billing" aria-label="Manage monthly spend"><Settings2 className="h-4 w-4" /></Link>
              </Button>
            </div>
            <div className="mt-5 flex items-center justify-between text-[13px]">
              <span className="text-foreground">Personal</span>
              <span className="tabular-nums text-foreground">{fmtUsd(data.allowance - remaining, 2)} / {fmtUsd(data.allowance, 2)}</span>
            </div>
            <div className="relative mt-3 h-4 w-full rounded-md bg-muted">
              <div className="h-full rounded-md bg-foreground transition-all" style={{ width: `${100 - pct}%` }} />
            </div>
            {daysLeft != null && (
              <div className="mt-2 text-[11.5px] text-muted-foreground">Resets in {daysLeft} day{daysLeft === 1 ? "" : "s"}</div>
            )}
          </section>

          <section className="border-b border-border px-4 py-5">
            <div className="text-[13px] text-foreground">Total tokens</div>
            <div className="mt-1 text-xl font-medium tabular-nums text-foreground">{fmtInt(derived.totalTokens)}</div>
            <div className="mt-5">
              <MiniLine data={derived.tokenSeries} color="#e11d63" filled={derived.totalTokens > 0} />
            </div>
          </section>

          <section className="border-b border-border px-4 py-5">
            <div className="text-[13px] text-foreground">Total requests</div>
            <div className="mt-1 text-xl font-medium tabular-nums text-foreground">{fmtInt(derived.spendRows.length)}</div>
            <div className="mt-5">
              <MiniLine data={derived.requestSeries} color="#a1a1aa" filled={derived.spendRows.length > 0} dashed />
            </div>
          </section>

          <div className="flex items-center gap-7 border-b border-border px-4 text-[13px]">
            <TabButton active={sideTab === "users"} onClick={() => setSideTab("users")}>Users</TabButton>
            <TabButton active={sideTab === "services"} onClick={() => setSideTab("services")}>Services</TabButton>
            <TabButton active={sideTab === "keys"} onClick={() => setSideTab("keys")}>API Keys</TabButton>
          </div>
          <section className="px-4 py-5">
            {sideTab === "users" ? (
              <div className="space-y-4 text-[12px]">
                <MetricRow label="Personal requests" value={fmtInt(derived.spendRows.length)} />
                <MetricRow label="Personal spend" value={fmtUsd(derived.spent, 2)} />
                <MetricRow label="Average per request" value={fmtUsd(derived.avgCost, 4)} />
                <MetricRow label="Last activity" value={derived.lastActivity ? new Date(derived.lastActivity).toLocaleDateString() : "No activity"} />
              </div>
            ) : sideTab === "services" ? (
              <TypeBreakdown rows={derived.spendRows} />
            ) : data.recentExtensionKeys.length === 0 ? (
              <p className="py-20 text-center text-[13px] text-muted-foreground">There is no usage data for this period and group.</p>
            ) : (
              <div className="divide-y divide-border">
                {data.recentExtensionKeys.map((key, index) => {
                  const usage = derived.keySpend.get(key.id) ?? { spend: 0, requests: 0 };
                  return (
                    <div key={key.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                           <code className="truncate font-mono text-[11.5px] text-foreground">{key.keyPrefix}••••••••••</code>
                           {index === 0 && <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium text-foreground">Newest</span>}
                        </div>
                         <div className="mt-1 truncate text-[10.5px] text-muted-foreground">
                          {key.name} · {usage.requests} request{usage.requests === 1 ? "" : "s"} · {key.revokedAt ? "Revoked" : "Active"}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                         <div className="text-[12px] font-medium tabular-nums text-foreground">{fmtUsd(usage.spend, 2)}</div>
                         <div className="mt-0.5 text-[10px] text-muted-foreground">Spend</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function dateLabel(date: Date) {
  return date.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
}

function rangeStartLabel(days: number) {
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  return dateLabel(start);
}

function rangeEndLabel() {
  return dateLabel(new Date());
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
      <Button
        type="button"
        variant="outline"
        onClick={onToggle}
        aria-expanded={open}
        className="flex h-9 w-full min-w-0 items-center gap-1.5 rounded-full bg-background px-2.5 text-[12px] font-medium text-foreground shadow-none sm:w-auto sm:max-w-[190px] sm:px-3 sm:text-[13px]"
      >
        {icon}
        <span className="truncate">{trigger}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
      </Button>
      {open && (
        <div className="absolute left-0 z-20 mt-1 max-h-64 w-[min(14rem,calc(100vw-2rem))] overflow-y-auto rounded-lg border border-zinc-200 bg-white p-1 shadow-lg sm:left-auto sm:right-0">
          {options.map((o) => (
            <Button
              key={o.value}
              type="button"
              variant="ghost"
              onClick={() => onSelect(o.value)}
              className={`block h-auto w-full truncate rounded-md px-2.5 py-1.5 text-left text-[13px] transition ${
                o.value === value ? "font-semibold text-zinc-900" : "text-zinc-600"
              }`}
            >
              {o.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      className={`h-auto shrink-0 rounded-none border-b border-transparent px-0 py-3 text-[13px] shadow-none ${
        active ? "border-foreground text-foreground" : "text-muted-foreground hover:bg-transparent hover:text-foreground"
      }`}
    >
      {children}
    </Button>
  );
}

function CapabilityCard({ title, items, start, end }: { title: string; items: { color: string; label: string }[]; start: string; end: string }) {
  return (
    <div className="flex min-h-64 flex-col rounded-lg border border-border bg-card p-4 sm:min-h-[250px]">
      <div className="flex items-center gap-1 text-[13px] text-card-foreground">
        {title} <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {items.map((it) => (
          <div key={it.label} className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <span className={`inline-block h-2 w-2 rounded-[2px] ${it.color}`} />
            {it.label}
          </div>
        ))}
      </div>
      <div className="mt-auto flex items-center justify-between px-7 text-[12px] text-muted-foreground">
        <span>{start}</span>
        <span>{end}</span>
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
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-zinc-200 bg-white text-[10px] font-semibold text-zinc-700" aria-hidden="true">
              {modelDisplay(model).provider.slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0 truncate text-[12px] font-medium text-zinc-800">{modelDisplay(model).model}</span>
            <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-500">{modelDisplay(model).provider}</span>
          </div>
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

function UsageSubset({ title, rows, empty }: { title: string; rows: { reason: string; delta: number }[]; empty: string }) {
  return (
    <div className="p-5">
      <h2 className="text-[13px] text-foreground">{title}</h2>
      {rows.length > 0 ? <div className="mt-4"><TypeBreakdown rows={rows} /></div> : (
        <div className="flex min-h-48 flex-col items-center justify-center text-center">
          <ChartColumn className="h-5 w-5 text-muted-foreground" />
          <p className="mt-3 text-[13px] text-muted-foreground">{empty}</p>
        </div>
      )}
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">{label}</span><span className="text-right tabular-nums text-foreground">{value}</span></div>;
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
