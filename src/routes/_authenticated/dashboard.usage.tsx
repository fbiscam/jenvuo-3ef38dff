import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Calendar, ChartColumn, ChevronDown, ChevronRight, Download, RefreshCw, Settings2 } from "lucide-react";
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
import chatGptLogoAsset from "@/assets/chatgpt-logo.png.asset.json";
import solLogoAsset from "@/assets/sol-logo.png.asset.json";

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

function fmtSpend(n: number) {
  if (!Number.isFinite(n) || n === 0) return "$0.00";
  const abs = Math.abs(n);
  if (abs >= 1) return `$${n.toFixed(2)}`;
  if (abs >= 0.01) return `$${n.toFixed(3)}`;
  if (abs >= 0.0001) return `$${n.toFixed(5)}`;
  return `<$0.0001`;
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

function metadataEntries(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return [] as [string, unknown][];
  return Object.entries(metadata as Record<string, unknown>);
}

function metadataNumber(metadata: unknown, pattern: RegExp) {
  return metadataEntries(metadata).reduce((sum, [key, value]) => {
    if (!pattern.test(key)) return sum;
    const amount = typeof value === "number" ? value : Number(value);
    return sum + (Number.isFinite(amount) ? amount : 0);
  }, 0);
}

function metadataFlag(metadata: unknown, pattern: RegExp) {
  return metadataEntries(metadata).some(([key, value]) => pattern.test(key) && value !== false && value !== 0 && value !== "false");
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

    const days: { date: string; spent: number; earned: number; tokens: number; requests: number; responses: number; inputTokens: number; seniorReviews: number; seniorTokens: number; extensionRequests: number; additions: number; addedUsd: number; cacheReads: number; cacheWrites: number; cacheHits: number; safetyChecks: number; blockedRequests: number }[] = [];
    const idx = new Map<string, number>();
    for (let i = rangeDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      idx.set(key, days.length);
      days.push({ date: key, spent: 0, earned: 0, tokens: 0, requests: 0, responses: 0, inputTokens: 0, seniorReviews: 0, seniorTokens: 0, extensionRequests: 0, additions: 0, addedUsd: 0, cacheReads: 0, cacheWrites: 0, cacheHits: 0, safetyChecks: 0, blockedRequests: 0 });
    }
    for (const r of rows) {
      const i = idx.get(r.created_at.slice(0, 10));
      if (i == null) continue;
      const b = days[i]!;
      if (r.delta < 0) {
        b.spent += Math.abs(r.delta);
        b.requests += 1;
        b.tokens += (r.prompt_tokens ?? 0) + (r.completion_tokens ?? 0);
        b.responses += 1;
        b.inputTokens += r.prompt_tokens ?? 0;
        if (r.stage === "senior_review") {
          b.seniorReviews += 1;
          b.seniorTokens += r.completion_tokens ?? 0;
        }
        if (r.reason === "extension_api") b.extensionRequests += 1;
        b.cacheReads += metadataNumber(r.metadata, /cache.*(?:read|input).*token|cached.*token/i);
        b.cacheWrites += metadataNumber(r.metadata, /cache.*(?:write|creation).*token/i);
        if (metadataFlag(r.metadata, /cache.*hit/i)) b.cacheHits += 1;
        if (metadataFlag(r.metadata, /safety|moderation|screened/i)) b.safetyChecks += 1;
        if (metadataFlag(r.metadata, /blocked|flagged|rejected/i)) b.blockedRequests += 1;
      } else {
        b.earned += r.delta;
        b.additions += 1;
        b.addedUsd += r.delta;
      }
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
      cacheReads: days.reduce((sum, day) => sum + day.cacheReads, 0),
      cacheWrites: days.reduce((sum, day) => sum + day.cacheWrites, 0),
      cacheHits: days.reduce((sum, day) => sum + day.cacheHits, 0),
      safetyChecks: days.reduce((sum, day) => sum + day.safetyChecks, 0),
      blockedRequests: days.reduce((sum, day) => sum + day.blockedRequests, 0),
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
  const spendPct = data.allowance > 0 ? Math.min(100, (data.spentThisPeriod / data.allowance) * 100) : 0;
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
         <h1 className="text-lg font-medium text-foreground">  Usage</h1>
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] items-center gap-2 sm:flex">
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
                 { color: "bg-chart-1", label: `${fmtInt(derived.spendRows.length)} requests`, data: derived.days.map((d) => d.responses) },
                 { color: "bg-chart-2", label: `${fmtInt(derived.inputTokens)} input tokens`, data: derived.days.map((d) => d.inputTokens) },
               ]} />
               <CapabilityCard title="Senior reviews" start={rangeStartLabel(rangeDays)} end={rangeEndLabel()} items={[
                 { color: "bg-chart-1", label: `${fmtInt(derived.spendRows.filter((r) => r.stage === "senior_review").length)} requests`, data: derived.days.map((d) => d.seniorReviews) },
                 { color: "bg-chart-2", label: `${fmtInt(derived.spendRows.filter((r) => r.stage === "senior_review").reduce((sum, r) => sum + (r.completion_tokens ?? 0), 0))} output tokens`, data: derived.days.map((d) => d.seniorTokens) },
               ]} />
               <CapabilityCard title="Extension API" start={rangeStartLabel(rangeDays)} end={rangeEndLabel()} items={[
                 { color: "bg-chart-1", label: `${fmtInt(derived.spendRows.filter((r) => r.reason === "extension_api").length)} requests`, data: derived.days.map((d) => d.extensionRequests) },
               ]} />
               <CapabilityCard title="Credits and top-ups" start={rangeStartLabel(rangeDays)} end={rangeEndLabel()} items={[
                 { color: "bg-chart-1", label: `${fmtInt(derived.earnRows.length)} additions`, data: derived.days.map((d) => d.additions) },
                 { color: "bg-chart-2", label: `${fmtUsd(derived.earned, 2)} added`, data: derived.days.map((d) => d.addedUsd) },
               ]} />
            </div>
          ) : tab === "categories" ? (
            <div className="grid gap-8 p-5 md:grid-cols-2">
               <div><h2 className="mb-4 text-[13px] text-foreground">  By service</h2><TypeBreakdown rows={derived.spendRows} /></div>
               <div><h2 className="mb-4 text-[13px] text-foreground">       By model</h2><ModelBreakdown rows={derived.spendRows} /></div>
            </div>
          ) : tab === "caching" ? (
            <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
              <CapabilityCard title="Cached input tokens" start={rangeStartLabel(rangeDays)} end={rangeEndLabel()} items={[
                { color: "bg-chart-1", label: `${fmtInt(derived.cacheReads)} tokens reused`, data: derived.days.map((day) => day.cacheReads) },
                { color: "bg-chart-2", label: `${fmtInt(derived.cacheHits)} cache hits`, data: derived.days.map((day) => day.cacheHits) },
              ]} />
              <CapabilityCard title="Cache writes" start={rangeStartLabel(rangeDays)} end={rangeEndLabel()} items={[
                { color: "bg-chart-1", label: `${fmtInt(derived.cacheWrites)} tokens stored`, data: derived.days.map((day) => day.cacheWrites) },
              ]} />
              <UsageFeature title="Prompt caching activity" description="Requests with reusable prompt context are tracked here when the model provider reports cache usage." value={`${cachingRows.length} tracked requests`} />
              <UsageFeature title="Estimated efficiency" description="Token reuse lowers repeated input processing while keeping the complete conversation context available." value={derived.cacheReads > 0 ? `${fmtInt(derived.cacheReads)} tokens reused` : "Ready to track"} />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
              <CapabilityCard title="Safety checks" start={rangeStartLabel(rangeDays)} end={rangeEndLabel()} items={[
                { color: "bg-chart-1", label: `${fmtInt(derived.safetyChecks)} checks`, data: derived.days.map((day) => day.safetyChecks) },
              ]} />
              <CapabilityCard title="Blocked requests" start={rangeStartLabel(rangeDays)} end={rangeEndLabel()} items={[
                { color: "bg-chart-2", label: `${fmtInt(derived.blockedRequests)} blocked`, data: derived.days.map((day) => day.blockedRequests) },
              ]} />
              <UsageFeature title="Moderation events" description="Safety and moderation results reported by the analysis pipeline appear in this view." value={`${safetyRows.length} recorded events`} />
              <UsageFeature title="Protection status" description="Chart uploads and prompts continue through the configured validation and review safeguards." value="Active" />
            </div>
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
              <span className="tabular-nums text-foreground">{fmtUsd(data.spentThisPeriod, 2)} / {fmtUsd(data.allowance, 2)}</span>
            </div>
            <div className="relative mt-3 h-4 w-full rounded-md bg-muted">
              <div className="h-full rounded-md bg-foreground transition-all" style={{ width: `${spendPct}%` }} />
            </div>
            <div className="mt-3 flex items-center justify-between text-[11.5px] text-muted-foreground">
              <span>Wallet balance</span>
              <span className="tabular-nums text-foreground">{fmtUsd(data.balance, 2)}</span>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[11.5px] text-muted-foreground">
              <span>Added this period</span>
              <span className="tabular-nums text-foreground">{fmtUsd(data.earnedThisPeriod, 2)}</span>
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
              <div className="space-y-4">
                <div className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between text-[11.5px]">
                    <span className="text-muted-foreground">Daily token limit</span>
                    <span className="tabular-nums text-foreground">
                      {fmtInt(data.tokensUsedToday)} / {data.dailyTokenLimit > 0 ? fmtInt(data.dailyTokenLimit) : "—"}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${data.dailyTokenLimit > 0 ? Math.min(100, (data.tokensUsedToday / data.dailyTokenLimit) * 100) : 0}%` }}
                    />
                  </div>
                  <div className="mt-2 text-[10px] text-muted-foreground">
                    Balance based · ${data.tokenRateUsdPerMillion} per 1M tokens · resets 00:00 UTC
                  </div>
                </div>
                <div className="divide-y divide-border">
                  {data.recentExtensionKeys.map((key, index) => {
                    const usage = derived.keySpend.get(key.id) ?? { spend: 0, requests: 0 };
                    const pctToday = data.dailyTokenLimit > 0 ? Math.min(100, (key.tokensToday / data.dailyTokenLimit) * 100) : 0;
                    return (
                      <div key={key.id} className="py-3">
                        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
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
                        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-primary/70" style={{ width: `${pctToday}%` }} />
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                          <span className="tabular-nums">{fmtInt(key.tokensToday)} tokens today</span>
                          <span className="tabular-nums">{fmtUsd(key.costTodayUsd, 4)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
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
      className={`relative h-auto shrink-0 rounded-none border-0 px-0 py-3 text-[13px] shadow-none hover:bg-transparent ${
        active
          ? "text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-foreground"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </Button>
  );
}

function CapabilityCard({ title, items, start, end }: { title: string; items: { color: string; label: string; data: number[] }[]; start: string; end: string }) {
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
      <CapabilityChart title={title} series={items.map((item, index) => ({ data: item.data, tone: index }))} />
      <div className="mt-auto flex items-center justify-between px-7 text-[12px] text-muted-foreground">
        <span>{start}</span>
        <span>{end}</span>
      </div>
    </div>
  );
}

function CapabilityChart({ title, series }: { title: string; series: { data: number[]; tone: number }[] }) {
  const width = 480;
  const height = 116;
  const top = 10;
  const bottom = 104;
  const palette = ["var(--chart-1)", "var(--chart-2)"];
  const paths = series.map(({ data, tone }) => {
    const count = Math.max(data.length, 2);
    const maximum = Math.max(...data, 1);
    const points = Array.from({ length: count }, (_, index) => {
      const x = (index / (count - 1)) * width;
      const y = bottom - ((data[index] ?? 0) / maximum) * (bottom - top);
      return [x, y] as const;
    });
    return {
      tone,
      line: points.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" "),
      area: `M0 ${bottom} ${points.map(([x, y]) => `L${x.toFixed(1)} ${y.toFixed(1)}`).join(" ")} L${width} ${bottom} Z`,
    };
  });
  const gradientId = `capability-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div className="mt-5 min-h-0 flex-1" role="img" aria-label={`${title} usage trend from ${series[0]?.data.length ?? 0} daily data points`}>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[116px] w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[top, (top + bottom) / 2, bottom].map((y) => <line key={y} x1="0" y1={y} x2={width} y2={y} stroke="var(--border)" strokeWidth="1" strokeDasharray="4 5" />)}
        {paths[0] && <path d={paths[0].area} fill={`url(#${gradientId})`} />}
        {paths.map((path) => <path key={path.tone} d={path.line} fill="none" stroke={palette[path.tone] ?? "var(--chart-3)"} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />)}
      </svg>
    </div>
  );
}

function ModelBreakdown({ rows }: { rows: { model?: string | null; prompt_tokens?: number | null; completion_tokens?: number | null; raw_cost_usd?: number | null; delta: number; created_at?: string }[] }) {
  const byModel = new Map<string, { requests: number; tokens: number; cost: number; trend: { date: string; cost: number }[] }>();
  for (const r of rows) {
    const key = r.model ?? "unknown";
    const cur = byModel.get(key) ?? { requests: 0, tokens: 0, cost: 0, trend: [] };
    cur.requests += 1;
    cur.tokens += (r.prompt_tokens ?? 0) + (r.completion_tokens ?? 0);
    const cost = r.raw_cost_usd != null ? Number(r.raw_cost_usd) : Math.abs(r.delta);
    cur.cost += cost;
    cur.trend.push({ date: r.created_at ?? "", cost });
    byModel.set(key, cur);
  }
  const list = [...byModel.entries()].sort((a, b) => b[1].cost - a[1].cost);
  if (list.length === 0) {
    return <p className="p-5 text-center text-[13px] text-zinc-500">There is no usage data for this period and group.</p>;
  }
  return (
    <div className="divide-y divide-zinc-100">
      {list.map(([model, s]) => (
        <div key={model} className="px-4 py-3 text-[13px] sm:px-5">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="flex min-w-0 items-center gap-2">
              <ModelLogo model={model} />
              <span className="min-w-0 truncate text-[12px] font-medium text-zinc-800">{modelDisplay(model).model}</span>
            </div>
            <div className="grid grid-cols-3 items-center gap-2 tabular-nums text-[11px] text-zinc-500 sm:flex sm:shrink-0 sm:gap-4 sm:text-[12px]">
              <span>{fmtInt(s.requests)} requests</span>
              <span>{fmtInt(s.tokens)} tokens</span>
              <span className="font-semibold text-zinc-800">{fmtUsd(s.cost, 2)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ClaudeLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M4.709 15.955l4.72-2.647.079-.23-.08-.128H9.2l-.79-.048-2.698-.073-2.339-.097-2.266-.122-.571-.121L0 11.784l.055-.352.48-.321.686.06 1.52.103 2.278.158 1.652.097 2.449.255h.389l.055-.157-.134-.098-.103-.097-2.358-1.596-2.552-1.688-1.336-.972-.724-.491-.364-.462-.158-1.008.656-.722.881.06.225.061.893.686 1.908 1.476 2.491 1.833.365.304.145-.103.019-.073-.164-.274-1.355-2.446-1.446-2.49-.644-1.032-.17-.619a2.97 2.97 0 01-.104-.729L6.283.134 6.696 0l.996.134.42.364.62 1.414 1.002 2.229 1.555 3.03.456.898.243.832.091.255h.158V9.01l.128-1.706.237-2.095.23-2.695.08-.76.376-.91.747-.492.584.28.48.685-.067.444-.286 1.851-.559 2.903-.364 1.942h.212l.243-.242.985-1.306 1.652-2.064.73-.82.85-.904.547-.431h1.033l.76 1.129-.34 1.166-1.064 1.347-.881 1.142-1.264 1.7-.79 1.36.073.11.188-.02 2.856-.606 1.543-.28 1.841-.315.833.388.091.395-.328.807-1.969.486-2.309.462-3.439.813-.042.03.049.061 1.549.146.662.036h1.622l3.02.225.79.522.474.638-.079.485-1.215.62-1.64-.389-3.829-.91-1.312-.329h-.182v.11l1.093 1.068 2.006 1.81 2.509 2.33.127.578-.322.455-.34-.049-2.205-1.657-.851-.747-1.926-1.62h-.128v.17l.444.649 2.345 3.521.122 1.08-.17.353-.607.213-.667-.122-1.373-1.925-1.415-2.167-1.143-1.943-.14.08-.674 7.254-.316.37-.729.28-.607-.461-.322-.747.322-1.476.389-1.924.315-1.53.286-1.9.17-.632-.012-.042-.14.018-1.434 1.967-2.18 2.945-1.726 1.845-.414.164-.717-.37.067-.662.401-.589 2.388-3.036 1.44-1.882.93-1.086-.006-.158h-.055L4.132 18.56l-1.13.146-.487-.456.061-.746.231-.243 1.913-1.315-.012.008z" />
    </svg>
  );
}

function ModelLogo({ model }: { model: string }) {
  const normalized = model.toLowerCase();
  if (normalized.includes("astra")) return <img src={chatGptLogoAsset.url} alt="ChatGPT logo" className="h-7 w-7 shrink-0 object-contain" />;
  if (normalized.includes("claude") || normalized.includes("fable")) return <span className="grid h-7 w-7 shrink-0 place-items-center text-[#D97757]"><ClaudeLogo className="h-6 w-6" /></span>;
  if (normalized.includes("sol")) return <img src={solLogoAsset.url} alt="Sol logo" className="h-7 w-7 shrink-0 object-contain" />;
  if (normalized.includes("gemini") || normalized.includes("google")) return <CompanyMark company="Google" />;
  if (normalized.includes("grok") || normalized.includes("xai")) return <CompanyMark company="xAI" />;
  if (normalized.includes("deepseek")) return <CompanyMark company="DeepSeek" />;
  if (normalized.includes("llama") || normalized.includes("meta")) return <CompanyMark company="Meta" />;
  if (normalized.includes("mistral")) return <CompanyMark company="Mistral" />;
  if (normalized.includes("nemotron") || normalized.includes("nvidia")) return <CompanyMark company="NVIDIA" />;
  if (normalized.includes("gpt") || normalized.includes("openai")) return <CompanyMark company="OpenAI" />;
  const display = modelDisplay(model);
  return <span className="grid h-7 w-7 shrink-0 place-items-center text-[10px] font-medium text-foreground" aria-hidden="true">{display.provider.slice(0, 1).toUpperCase()}</span>;
}

function CompanyMark({ company }: { company: "Google" | "xAI" | "DeepSeek" | "Meta" | "Mistral" | "NVIDIA" | "OpenAI" }) {
  if (company === "Google") {
    return <span className="grid h-7 w-7 shrink-0 place-items-center text-lg font-medium text-foreground" aria-label="Google logo">G</span>;
  }
  if (company === "xAI") {
    return <span className="grid h-7 w-7 shrink-0 place-items-center text-base font-medium text-foreground" aria-label="xAI logo">𝕏</span>;
  }
  if (company === "Meta") {
    return <span className="grid h-7 w-7 shrink-0 place-items-center text-xl text-foreground" aria-label="Meta logo">∞</span>;
  }
  if (company === "NVIDIA") {
    return <span className="grid h-7 w-7 shrink-0 place-items-center text-[9px] font-medium text-foreground" aria-label="NVIDIA logo">NVIDIA</span>;
  }
  if (company === "Mistral") {
    return <span className="grid h-7 w-7 shrink-0 place-items-center text-base font-medium text-foreground" aria-label="Mistral AI logo">M</span>;
  }
  if (company === "DeepSeek") {
    return <span className="grid h-7 w-7 shrink-0 place-items-center text-base font-medium text-foreground" aria-label="DeepSeek logo">DS</span>;
  }
  return (
    <svg viewBox="0 0 24 24" role="img" aria-label="OpenAI logo" className="h-6 w-6 shrink-0 text-foreground" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 3.1a4.45 4.45 0 0 1 7.65 3.08 4.46 4.46 0 0 1 1.04 7.96 4.45 4.45 0 0 1-4.87 6.65A4.46 4.46 0 0 1 8.1 19.8a4.45 4.45 0 0 1-4.76-6.72A4.46 4.46 0 0 1 4.4 5.14 4.45 4.45 0 0 1 12 3.1Z" />
      <path d="m8.15 7.8 3.86-2.22 3.85 2.22v4.45L12 14.48 8.15 12.25V7.8Zm0 4.45v4.45L12 18.92l3.86-2.22v-4.45M12 14.48v4.44" />
    </svg>
  );
}

function TypeBreakdown({ rows }: { rows: { reason: string; delta: number; created_at?: string }[] }) {
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
          {name.toLowerCase().includes("ict") && (
            <div className="mt-2" aria-label={`${name} usage graph`}>
              <MiniLine
                data={rows
                  .filter((row) => label(row.reason) === name)
                  .sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? ""))
                  .map((row) => Math.abs(row.delta))}
                color="var(--chart-1)"
                filled
              />
            </div>
          )}
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

function UsageFeature({ title, description, value }: { title: string; description: string; value: string }) {
  return (
    <div className="min-h-40 rounded-lg border border-border bg-card p-4">
      <div className="text-[13px] text-card-foreground">{title}</div>
      <div className="mt-3 text-xl font-medium tabular-nums text-card-foreground">{value}</div>
      <p className="mt-3 max-w-md text-[12px] leading-5 text-muted-foreground">{description}</p>
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
