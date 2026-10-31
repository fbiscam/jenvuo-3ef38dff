import { ConsoleSelect } from "@/components/dashboard/ConsoleSelect";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Calendar,
  ChartColumn,
  ChevronRight,
  Download,
  RefreshCw,
} from "lucide-react";
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
import { UsageTabs } from "@/components/dashboard/UsageTabs";
import chatGptLogoAsset from "@/assets/chatgpt-logo.png.asset.json";
import solLogoAsset from "@/assets/sol-logo.png.asset.json";

export const Route = createFileRoute("/_authenticated/dashboard/usage")({
  head: () => ({
    meta: [
      { title: "Usage — Jenvu" },
      {
        name: "description",
        content: "Track your USD wallet usage, per-scan model + cost history.",
      },
      { property: "og:title", content: "Usage — Jenvu" },
      {
        property: "og:description",
        content: "Track your USD wallet usage, per-scan model + cost history.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: UsagePage,
});

const REASON_LABEL: Record<string, string> = {
  ai_scan: "AI scan",
  terminal_scan: "Terminal chart scan",
  terminal_daily: "Terminal daily fee",
  extension_api: "AI usage",
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
  const provider =
    providerId === "browseruse"
      ? "Browser Use"
      : providerId === "evolink"
        ? "Evolink"
        : providerId === "agentrouter"
          ? "AgentRouter"
          : providerId;
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
    refetchInterval: 120_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
  const [tab, setTab] = useState<"capabilities" | "categories" | "terminal" | "forecast">(
    "capabilities",
  );
  const [sideTab, setSideTab] = useState<"users" | "services" | "keys">("keys");
  const [rangeDays, setRangeDays] = useState<number>(7);
  const [breakdown, setBreakdown] = useState<ApiType>("text");
  const [model, setModel] = useState<string>("all");
  const [groupDays, setGroupDays] = useState<number>(1);
  const [openMenu, setOpenMenu] = useState<"type" | "key" | "model" | "range" | "group" | null>(null);
  const [groupBy, setGroupBy] = useState<"type" | "key" | "model">("type");
  const [apiKey, setApiKey] = useState<string>("all");
  // How many whole ranges back from today the window ends (0 = ends today).
  const [shift, setShift] = useState(0);
  const offsetDays = shift * rangeDays;

  const models = useMemo(() => {
    if (!data) return [] as string[];
    return [...new Set(data.ledger.map((r) => r.model).filter(Boolean) as string[])].sort();
  }, [data]);

  const derived = useMemo(() => {
    if (!data) return null;
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    from.setDate(from.getDate() - (rangeDays - 1 + offsetDays));
    const fromMs = from.getTime();
    const to = new Date();
    to.setHours(0, 0, 0, 0);
    to.setDate(to.getDate() - offsetDays + 1);
    const toMs = to.getTime();

    const rows = data.ledger.filter((r) => {
      const t = new Date(r.created_at).getTime();
      if (t < fromMs || t >= toMs) return false;
      if (apiKey !== "all" && apiKeyIdOf(r) !== apiKey) return false;
      if (model !== "all" && (r.model ?? "unknown") !== model) return false;
      return true;
    });

    const spendRows = rows.filter((r) => r.delta < 0);
    const earnRows = rows.filter((r) => r.delta > 0);
    const spent = spendRows.reduce((s, r) => s + Math.abs(r.delta), 0);
    const earned = earnRows.reduce((s, r) => s + r.delta, 0);
    const totalTokens = spendRows.reduce(
      (s, r) => s + (r.prompt_tokens ?? 0) + (r.completion_tokens ?? 0),
      0,
    );
    const inputTokens = spendRows.reduce((s, r) => s + (r.prompt_tokens ?? 0), 0);
    const outputTokens = totalTokens - inputTokens;

    const days: {
      date: string;
      spent: number;
      earned: number;
      tokens: number;
      requests: number;
      responses: number;
      inputTokens: number;
      seniorReviews: number;
      seniorTokens: number;
      extensionRequests: number;
      additions: number;
      addedUsd: number;
      terminalScans: number;
      terminalScanUsd: number;
      terminalDays: number;
      terminalDailyUsd: number;
    }[] = [];
    const idx = new Map<string, number>();
    for (let i = rangeDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i - offsetDays);
      const key = d.toISOString().slice(0, 10);
      idx.set(key, days.length);
      days.push({
        date: key,
        spent: 0,
        earned: 0,
        tokens: 0,
        requests: 0,
        responses: 0,
        inputTokens: 0,
        seniorReviews: 0,
        seniorTokens: 0,
        extensionRequests: 0,
        additions: 0,
        addedUsd: 0,
        terminalScans: 0,
        terminalScanUsd: 0,
        terminalDays: 0,
        terminalDailyUsd: 0,
      });
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
        if (r.reason === "terminal_scan") {
          b.terminalScans += 1;
          b.terminalScanUsd += Math.abs(r.delta);
        }
        if (r.reason === "terminal_daily") {
          b.terminalDays += 1;
          b.terminalDailyUsd += Math.abs(r.delta);
        }
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
      if (
        row.reason !== "extension_api" ||
        !row.metadata ||
        typeof row.metadata !== "object" ||
        Array.isArray(row.metadata)
      )
        continue;
      const keyId = typeof row.metadata.api_key_id === "string" ? row.metadata.api_key_id : null;
      if (!keyId) continue;
      const current = keySpend.get(keyId) ?? { spend: 0, requests: 0 };
      current.spend += Math.abs(row.delta);
      current.requests += 1;
      keySpend.set(keyId, current);
    }
    return {
      rows,
      spendRows,
      earnRows,
      spent,
      earned,
      totalTokens,
      inputTokens,
      outputTokens,
      days,
      avgCost,
      lastActivity,
      hasSpend,
      tokenSeries: days.map((d) => d.tokens),
      requestSeries: days.map((d) => d.requests),
      keySpend,
      terminalScans: days.reduce((sum, day) => sum + day.terminalScans, 0),
      terminalScanUsd: days.reduce((sum, day) => sum + day.terminalScanUsd, 0),
      terminalDays: days.reduce((sum, day) => sum + day.terminalDays, 0),
      terminalDailyUsd: days.reduce((sum, day) => sum + day.terminalDailyUsd, 0),
    };
  }, [data, rangeDays, model, apiKey, offsetDays]);

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
  const burnPerDay = derived.spent / rangeDays;
  const runway = burnPerDay > 0 ? Math.floor(data.balance / burnPerDay) : null;

  const exportCsv = () => {
    const rows = [
      [
        "date",
        "reason",
        "model",
        "prompt_tokens",
        "completion_tokens",
        "raw_cost_usd",
        "delta_usd",
        "balance_after",
      ],
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
  const chartDays =
    groupDays === 1
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
  const activeDays = derived.days.filter((day) => day.spent > 0);
  const topDay = derived.days.reduce<(typeof derived.days)[number] | null>(
    (best, day) => (day.spent > (best?.spent ?? 0) ? day : best),
    null,
  );
  const last7 = derived.days.slice(-7).reduce((sum, day) => sum + day.spent, 0);
  const prev7 = derived.days.slice(-14, -7).reduce((sum, day) => sum + day.spent, 0);
  const weekChange = prev7 > 0 ? ((last7 - prev7) / prev7) * 100 : null;
  const terminalTotal = derived.terminalScanUsd + derived.terminalDailyUsd;
  const terminalShare = derived.spent > 0 ? (terminalTotal / derived.spent) * 100 : 0;

  const typeOf = (reason: string): ApiType => {
    if (reason === "terminal_scan" || reason === "terminal_daily") return "terminal";
    if (reason === "alert") return "alerts";
    if (TEXT_REASONS.has(reason)) return "text";
    return "other";
  };
  const typedDays = chartDays.map((day) => ({ date: day.date, text: 0, terminal: 0, alerts: 0, other: 0 }));
  const typedIndex = new Map(chartDays.map((day, index) => [day.date, index]));
  const typeTotals: Record<ApiType, number> = { text: 0, terminal: 0, alerts: 0, other: 0 };
  const reasonTotals = new Map<string, { type: ApiType; count: number; spend: number }>();
  const sortedDates = chartDays.map((day) => day.date);
  for (const row of derived.spendRows) {
    const date = row.created_at.slice(0, 10);
    let index = typedIndex.get(date);
    if (index == null) {
      // grouped buckets: find the last bucket whose start date is <= row date
      index = -1;
      for (let i = 0; i < sortedDates.length; i++) if (sortedDates[i]! <= date) index = i;
      if (index < 0) continue;
    }
    const type = typeOf(row.reason);
    const amount = Math.abs(row.delta);
    typedDays[index]![type] += amount;
    typeTotals[type] += amount;
    const key = label(row.reason);
    const current = reasonTotals.get(key) ?? { type, count: 0, spend: 0 };
    current.count += 1;
    current.spend += amount;
    reasonTotals.set(key, current);
  }
  const breakdownRows = [...reasonTotals.entries()]
    .filter(([, value]) => value.type === breakdown)
    .sort((a, b) => b[1].spend - a[1].spend);
  const breakdownTotal = breakdownRows.reduce((sum, [, value]) => sum + value.spend, 0);
  const tokenBars = chartDays.map((day) => day.tokens);
  const requestBars = chartDays.map((day) => day.requests);
  const shortRange = `${rangeDays}d`;

  return (
    <div className="mx-auto w-full max-w-[1100px] pb-10 text-foreground">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-[28px] font-medium tracking-tight text-foreground sm:text-[32px]">Usage</h1>
        <UsageTabs active="usage" />
      </div>

      {/* Filter bar */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <ConsoleSelect
          open={openMenu === "type"}
          onToggle={() => setOpenMenu(openMenu === "type" ? null : "type")}
          label="Group by"
          valueLabel="API Type"
          options={[{ value: "type", label: "API Type" }]}
          value="type"
          onSelect={() => setOpenMenu(null)}
        />
        <ConsoleSelect
          open={openMenu === "model"}
          onToggle={() => setOpenMenu(openMenu === "model" ? null : "model")}
          label="Model"
          valueLabel={model === "all" ? "All" : modelDisplay(model).model}
          options={[
            { value: "all", label: "All models" },
            ...models.map((m) => ({ value: m, label: modelDisplay(m).model })),
          ]}
          value={model}
          onSelect={(v) => {
            setModel(v);
            setOpenMenu(null);
          }}
        />
        <ConsoleSelect
          open={openMenu === "group"}
          onToggle={() => setOpenMenu(openMenu === "group" ? null : "group")}
          label="Granularity"
          valueLabel={groupDays === 1 ? "Day" : `${groupDays} days`}
          options={[1, 7, 14]
            .filter((days) => days < rangeDays || days === 1)
            .map((days) => ({ value: String(days), label: days === 1 ? "Day" : `${days} days` }))}
          value={String(groupDays)}
          onSelect={(value) => {
            setGroupDays(Number(value));
            setOpenMenu(null);
          }}
        />
        <ConsoleSelect
          open={openMenu === "range"}
          onToggle={() => setOpenMenu(openMenu === "range" ? null : "range")}
          valueLabel={`${rangeStartLabel(rangeDays)} – ${rangeEndLabel()}`}
          icon={<Calendar className="h-3.5 w-3.5 text-muted-foreground" />}
          options={RANGES.map((r) => ({ value: String(r.days), label: r.label }))}
          value={String(rangeDays)}
          onSelect={(v) => {
            const next = Number(v);
            setRangeDays(next);
            if (groupDays >= next) setGroupDays(1);
            setOpenMenu(null);
          }}
        />
        <div className="ml-auto flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={async () => {
              const result = await refetch();
              if (result.isError) toast.error("Usage could not be refreshed");
              else toast.success("Usage refreshed");
            }}
            aria-label="Refresh usage"
            className="h-9 w-9 shrink-0 rounded-full text-muted-foreground"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={exportCsv}
            aria-label="Download usage CSV"
            className="h-9 w-9 shrink-0 rounded-full text-muted-foreground"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Spend + Tokens / Requests */}
      <div className="mt-4 grid grid-cols-1 gap-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="console-card flex min-h-[420px] flex-col p-4 sm:p-5">
          <div className="text-[13px] text-muted-foreground">Spend</div>
          <div className="mt-1 text-[22px] font-medium tabular-nums text-foreground">
            {fmtUsd(derived.spent, 2)}
          </div>
          <StackedBars
            className="mt-4 flex-1"
            days={typedDays}
            keys={API_TYPES.map((t) => t.id)}
            colors={API_TYPES.map((t) => t.color)}
            format={(v) => fmtUsd(v, 2)}
          />
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-[12px]">
            {API_TYPES.map((t) => (
              <span key={t.id} className="inline-flex items-center gap-1.5 text-foreground">
                <span className="h-2 w-2 rounded-[2px]" style={{ background: t.color }} />
                {t.label}
                <span className="text-muted-foreground">({fmtUsd(typeTotals[t.id], 2)})</span>
              </span>
            ))}
          </div>
        </section>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
          <section className="console-card flex min-h-[200px] flex-col p-4">
            <div className="text-[13px] text-muted-foreground">Tokens</div>
            <div className="mt-1 text-[20px] font-medium tabular-nums text-foreground">
              {fmtInt(derived.totalTokens)}
            </div>
            <StackedBars
              className="mt-3 flex-1"
              days={chartDays.map((day, i) => ({ date: day.date, v: tokenBars[i] ?? 0 }))}
              keys={["v"]}
              colors={["#a1a1aa"]}
              baseline="var(--border)"
              format={(v) => `${fmtInt(v)} tokens`}
              compact
            />
          </section>
          <section className="console-card flex min-h-[200px] flex-col p-4">
            <div className="text-[13px] text-muted-foreground">Requests</div>
            <div className="mt-1 text-[20px] font-medium tabular-nums text-foreground">
              {fmtInt(derived.spendRows.length)}
            </div>
            <StackedBars
              className="mt-3 flex-1"
              days={chartDays.map((day, i) => ({ date: day.date, v: requestBars[i] ?? 0 }))}
              keys={["v"]}
              colors={["#a1a1aa"]}
              baseline="var(--border)"
              format={(v) => `${fmtInt(v)} requests`}
              compact
            />
          </section>
        </div>
      </div>

      {/* Breakdown */}
      <h2 className="mt-10 text-[18px] font-medium text-foreground">Breakdown</h2>
      <div className="mt-3 flex flex-wrap items-center gap-1" role="tablist">
        {API_TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={breakdown === t.id}
            onClick={() => setBreakdown(t.id)}
            className={`rounded-full px-3 py-1.5 text-[14px] transition-colors ${
              breakdown === t.id
                ? "console-card font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <section className="console-card mt-3 grid grid-cols-1 gap-6 p-4 sm:p-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="flex min-h-[340px] flex-col">
          <div className="text-[13px] text-muted-foreground">
            {API_TYPES.find((t) => t.id === breakdown)?.label}
          </div>
          <div className="mt-1 text-[22px] font-medium tabular-nums text-foreground">
            {fmtUsd(typeTotals[breakdown], 2)}
          </div>
          <StackedBars
            className="mt-4 flex-1"
            days={typedDays.map((day) => ({ date: day.date, v: day[breakdown] }))}
            keys={["v"]}
            colors={[API_TYPES.find((t) => t.id === breakdown)?.color ?? "#f4a261"]}
            format={(v) => fmtUsd(v, 2)}
          />
        </div>
        <div className="min-w-0">
          <div className="text-right text-[13px] text-muted-foreground">{shortRange}</div>
          <table className="mt-10 w-full text-[13px]">
            <thead>
              <tr className="border-b border-border text-[12px] text-muted-foreground">
                <th className="pb-2 text-left font-normal">Type</th>
                <th className="pb-2 text-right font-normal">Usage</th>
                <th className="pb-2 text-right font-normal">Spend</th>
              </tr>
            </thead>
            <tbody>
              {breakdownRows.map(([name, value]) => (
                <tr key={name}>
                  <td className="py-2 text-foreground">{name}</td>
                  <td className="py-2 text-right tabular-nums text-muted-foreground">
                    {fmtInt(value.count)}
                  </td>
                  <td className="py-2 text-right tabular-nums text-foreground">
                    {fmtSpend(value.spend)}
                  </td>
                </tr>
              ))}
              <tr>
                <td className="pt-3 font-medium text-foreground">Total</td>
                <td />
                <td className="pt-3 text-right font-medium tabular-nums text-foreground">
                  {fmtUsd(breakdownTotal, 2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

type ApiType = "text" | "terminal" | "alerts" | "other";

const TEXT_REASONS = new Set([
  "ai_scan",
  "extension_api",
  "signal",
  "ict_narration",
  "voice_query",
]);

const API_TYPES: { id: ApiType; label: string; color: string }[] = [
  { id: "text", label: "Text", color: "#f4a261" },
  { id: "terminal", label: "Terminal", color: "#2a9d8f" },
  { id: "alerts", label: "Alerts", color: "#3d5a6c" },
  { id: "other", label: "Other", color: "#e76f51" },
];

function StackedBars<K extends string>({
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
  const labelEvery = Math.max(1, Math.ceil(days.length / (compact ? 3 : 4)));
  const fmtDate = (iso: string) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: compact ? undefined : "numeric",
    });
  return (
    <div className={`flex min-h-0 flex-col ${className}`}>
      <div className={`flex flex-1 items-stretch gap-[10px] ${compact ? "min-h-[80px]" : "min-h-[220px]"}`}>
        {days.map((day, i) => {
          const total = totals[i] ?? 0;
          return (
            <div
              key={day.date}
              title={`${fmtDate(day.date)} · ${format(total)}`}
              className="group flex min-w-0 flex-1 flex-col justify-end rounded-t-[3px] transition-colors hover:bg-foreground/[0.07]"
            >
              <div
                className="flex w-full flex-col-reverse overflow-hidden rounded-t-[3px]"
                style={{ height: max > 0 ? `${(total / max) * 100}%` : "0%" }}
              >
                {keys.map((k, ki) => {
                  const v = day[k] ?? 0;
                  if (v <= 0 || total <= 0) return null;
                  return (
                    <div
                      key={k}
                      style={{ height: `${(v / total) * 100}%`, background: colors[ki] }}
                    />
                  );
                })}
              </div>
              <div className="h-[1.5px] w-full" style={{ background: baseline ?? colors[0] }} />
            </div>
          );
        })}
      </div>
      {!compact ? (
        <div className="mt-2 flex gap-[10px] text-[11.5px] text-muted-foreground">
          {days.map((day, i) => (
            <div key={day.date} className="min-w-0 flex-1 overflow-visible whitespace-nowrap text-center">
              {i % labelEvery === 0 || i === days.length - 1 ? fmtDate(day.date) : ""}
            </div>
          ))}
        </div>
      ) : null}
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

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
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

function CapabilityCard({
  title,
  items,
  start,
  end,
}: {
  title: string;
  items: { color: string; label: string; data: number[] }[];
  start: string;
  end: string;
}) {
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
      <CapabilityChart
        title={title}
        series={items.map((item, index) => ({ data: item.data, tone: index }))}
      />
      <div className="mt-auto flex items-center justify-between px-7 text-[12px] text-muted-foreground">
        <span>{start}</span>
        <span>{end}</span>
      </div>
    </div>
  );
}

function CapabilityChart({
  title,
  series,
}: {
  title: string;
  series: { data: number[]; tone: number }[];
}) {
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
      line: points
        .map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`)
        .join(" "),
      area: `M0 ${bottom} ${points.map(([x, y]) => `L${x.toFixed(1)} ${y.toFixed(1)}`).join(" ")} L${width} ${bottom} Z`,
    };
  });
  const gradientId = `capability-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div
      className="mt-5 min-h-0 flex-1"
      role="img"
      aria-label={`${title} usage trend from ${series[0]?.data.length ?? 0} daily data points`}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-[116px] w-full"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[top, (top + bottom) / 2, bottom].map((y) => (
          <line
            key={y}
            x1="0"
            y1={y}
            x2={width}
            y2={y}
            stroke="var(--border)"
            strokeWidth="1"
            strokeDasharray="4 5"
          />
        ))}
        {paths[0] && <path d={paths[0].area} fill={`url(#${gradientId})`} />}
        {paths.map((path) => (
          <path
            key={path.tone}
            d={path.line}
            fill="none"
            stroke={palette[path.tone] ?? "var(--chart-3)"}
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>
    </div>
  );
}

function ModelBreakdown({
  rows,
}: {
  rows: {
    model?: string | null;
    prompt_tokens?: number | null;
    completion_tokens?: number | null;
    raw_cost_usd?: number | null;
    delta: number;
    created_at?: string;
  }[];
}) {
  const byModel = new Map<
    string,
    { requests: number; tokens: number; cost: number; trend: { date: string; cost: number }[] }
  >();
  for (const r of rows) {
    const key = r.model ?? "unknown";
    const cur = byModel.get(key) ?? { requests: 0, tokens: 0, cost: 0, trend: [] };
    cur.requests += 1;
    cur.tokens += (r.prompt_tokens ?? 0) + (r.completion_tokens ?? 0);
    const charged = Math.abs(Number(r.delta) || 0);
    const raw = r.raw_cost_usd != null ? Math.abs(Number(r.raw_cost_usd)) : 0;
    const cost = charged > 0 ? charged : raw;
    cur.cost += cost;
    cur.trend.push({ date: r.created_at ?? "", cost });
    byModel.set(key, cur);
  }
  const list = [...byModel.entries()].sort((a, b) => b[1].cost - a[1].cost);
  if (list.length === 0) {
    return (
      <p className="p-5 text-center text-[13px] text-zinc-500">
        There is no usage data for this period and group.
      </p>
    );
  }
  return (
    <div className="divide-y divide-zinc-100">
      {list.map(([model, s]) => (
        <div key={model} className="px-4 py-3 text-[13px] sm:px-5">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="flex min-w-0 items-center gap-2">
              <ModelLogo model={model} />
              <span className="min-w-0 truncate text-[12px] font-medium text-zinc-800">
                {modelDisplay(model).model}
              </span>
            </div>
            <div className="grid grid-cols-3 items-center gap-2 tabular-nums text-[11px] text-zinc-500 sm:flex sm:shrink-0 sm:gap-4 sm:text-[12px]">
              <span>{fmtInt(s.requests)} requests</span>
              <span>{fmtInt(s.tokens)} tokens</span>
              <span className="font-semibold text-zinc-800">{fmtSpend(s.cost)}</span>
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
  if (normalized.includes("astra"))
    return (
      <img
        src={chatGptLogoAsset.url}
        alt="ChatGPT logo"
        className="h-7 w-7 shrink-0 object-contain"
      />
    );
  if (normalized.includes("claude") || normalized.includes("fable"))
    return (
      <span className="grid h-7 w-7 shrink-0 place-items-center text-[#D97757]">
        <ClaudeLogo className="h-6 w-6" />
      </span>
    );
  if (normalized.includes("sol"))
    return (
      <img src={solLogoAsset.url} alt="Sol logo" className="h-7 w-7 shrink-0 object-contain" />
    );
  if (normalized.includes("gemini") || normalized.includes("google"))
    return <CompanyMark company="Google" />;
  if (normalized.includes("grok") || normalized.includes("xai"))
    return <CompanyMark company="xAI" />;
  if (normalized.includes("deepseek")) return <CompanyMark company="DeepSeek" />;
  if (normalized.includes("llama") || normalized.includes("meta"))
    return <CompanyMark company="Meta" />;
  if (normalized.includes("mistral")) return <CompanyMark company="Mistral" />;
  if (normalized.includes("nemotron") || normalized.includes("nvidia"))
    return <CompanyMark company="NVIDIA" />;
  if (normalized.includes("gpt") || normalized.includes("openai"))
    return <CompanyMark company="OpenAI" />;
  const display = modelDisplay(model);
  return (
    <span
      className="grid h-7 w-7 shrink-0 place-items-center text-[10px] font-medium text-foreground"
      aria-hidden="true"
    >
      {display.provider.slice(0, 1).toUpperCase()}
    </span>
  );
}

function CompanyMark({
  company,
}: {
  company: "Google" | "xAI" | "DeepSeek" | "Meta" | "Mistral" | "NVIDIA" | "OpenAI";
}) {
  if (company === "Google") {
    return (
      <span
        className="grid h-7 w-7 shrink-0 place-items-center text-lg font-medium text-foreground"
        aria-label="Google logo"
      >
        G
      </span>
    );
  }
  if (company === "xAI") {
    return (
      <span
        className="grid h-7 w-7 shrink-0 place-items-center text-base font-medium text-foreground"
        aria-label="xAI logo"
      >
        𝕏
      </span>
    );
  }
  if (company === "Meta") {
    return (
      <span
        className="grid h-7 w-7 shrink-0 place-items-center text-xl text-foreground"
        aria-label="Meta logo"
      >
        ∞
      </span>
    );
  }
  if (company === "NVIDIA") {
    return (
      <span
        className="grid h-7 w-7 shrink-0 place-items-center text-[9px] font-medium text-foreground"
        aria-label="NVIDIA logo"
      >
        NVIDIA
      </span>
    );
  }
  if (company === "Mistral") {
    return (
      <span
        className="grid h-7 w-7 shrink-0 place-items-center text-base font-medium text-foreground"
        aria-label="Mistral AI logo"
      >
        M
      </span>
    );
  }
  if (company === "DeepSeek") {
    return (
      <span
        className="grid h-7 w-7 shrink-0 place-items-center text-base font-medium text-foreground"
        aria-label="DeepSeek logo"
      >
        DS
      </span>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-label="OpenAI logo"
      className="h-6 w-6 shrink-0 text-foreground"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <path d="M12 3.1a4.45 4.45 0 0 1 7.65 3.08 4.46 4.46 0 0 1 1.04 7.96 4.45 4.45 0 0 1-4.87 6.65A4.46 4.46 0 0 1 8.1 19.8a4.45 4.45 0 0 1-4.76-6.72A4.46 4.46 0 0 1 4.4 5.14 4.45 4.45 0 0 1 12 3.1Z" />
      <path d="m8.15 7.8 3.86-2.22 3.85 2.22v4.45L12 14.48 8.15 12.25V7.8Zm0 4.45v4.45L12 18.92l3.86-2.22v-4.45M12 14.48v4.44" />
    </svg>
  );
}

function TypeBreakdown({
  rows,
}: {
  rows: { reason: string; delta: number; created_at?: string }[];
}) {
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
    return (
      <p className="py-8 text-center text-[13px] text-zinc-500">
        There is no usage data for this period and group.
      </p>
    );
  }
  const max = Math.max(...list.map(([, s]) => s.cost), 0.0001);
  return (
    <div className="space-y-3">
      {list.map(([name, s]) => (
        <div key={name}>
          <div className="flex items-center justify-between text-[12px]">
            <span className="font-medium text-zinc-700">{name}</span>
            <span className="tabular-nums text-zinc-500">
              {fmtInt(s.count)} · {fmtSpend(s.cost)}
            </span>
          </div>
          <div className="mt-1 h-1.5 w-full rounded-full bg-zinc-100">
            <div
              className="h-full rounded-full bg-zinc-800"
              style={{ width: `${(s.cost / max) * 100}%` }}
            />
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

function UsageSubset({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: { reason: string; delta: number }[];
  empty: string;
}) {
  return (
    <div className="p-5">
      <h2 className="text-[13px] text-foreground">{title}</h2>
      {rows.length > 0 ? (
        <div className="mt-4">
          <TypeBreakdown rows={rows} />
        </div>
      ) : (
        <div className="flex min-h-48 flex-col items-center justify-center text-center">
          <ChartColumn className="h-5 w-5 text-muted-foreground" />
          <p className="mt-3 text-[13px] text-muted-foreground">{empty}</p>
        </div>
      )}
    </div>
  );
}

function UsageFeature({
  title,
  description,
  value,
}: {
  title: string;
  description: string;
  value: string;
}) {
  return (
    <div className="min-h-40 rounded-lg border border-border bg-card p-4">
      <div className="text-[13px] text-card-foreground">{title}</div>
      <div className="mt-3 text-xl font-medium tabular-nums text-card-foreground">{value}</div>
      <p className="mt-3 max-w-md text-[12px] leading-5 text-muted-foreground">{description}</p>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right tabular-nums text-foreground">{value}</span>
    </div>
  );
}

function MiniLine({
  data,
  color,
  filled,
  dashed,
}: {
  data: number[];
  color: string;
  filled: boolean;
  dashed?: boolean;
}) {
  const W = 260;
  const H = 44;
  const n = Math.max(data.length, 2);
  const max = Math.max(...data, 1);
  const pts = Array.from({ length: n }, (_, i) => {
    const x = (i / (n - 1)) * W;
    const y = H - 4 - ((data[i] ?? 0) / max) * (H - 10);
    return [x, y] as const;
  });
  const dPath = pts
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");
  const last = pts[pts.length - 1];
  if (!filled) {
    // dashed empty baseline, like the reference
    const segs = 7;
    return (
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        preserveAspectRatio="none"
        style={{ height: H }}
      >
        {Array.from({ length: segs }, (_, i) => {
          const x0 = (i / segs) * W + 2;
          const x1 = ((i + 1) / segs) * W - 6;
          return (
            <line key={i} x1={x0} y1={H - 4} x2={x1} y2={H - 4} stroke={color} strokeWidth={1.5} />
          );
        })}
      </svg>
    );
  }
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      preserveAspectRatio="none"
      style={{ height: H }}
    >
      <path
        d={dPath}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeDasharray={dashed ? "5 4" : undefined}
        strokeLinecap="round"
      />
      <circle cx={last[0]} cy={last[1]} r={3.5} fill="white" stroke={color} strokeWidth={1.5} />
    </svg>
  );
}

