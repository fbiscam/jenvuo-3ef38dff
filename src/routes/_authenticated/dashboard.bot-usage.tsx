import { ConsoleSelect } from "@/components/dashboard/ConsoleSelect";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Bot, Calendar, Download, Lock, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ProfitBars, StackedBars } from "@/components/dashboard/ConsoleBars";
import { deleteBotAccount, getBotUsage, type BotReportRow, type BotSessionRow } from "@/lib/mt5-licenses.functions";
import { dailyTarget, isMt5Plan, sessionEndCause, sharedTargetStatus } from "@/lib/mt5-licenses";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { UsageTabs } from "@/components/dashboard/UsageTabs";
import euFlag from "@/assets/watchlist/flag-eu.svg";

export const Route = createFileRoute("/_authenticated/dashboard/bot-usage")({
  head: () => ({
    meta: [
      { title: "Bot Usage — Jenvu" },
      { name: "description", content: "See JX Bot profit, balance, equity and trades for every MT5 account." },
      { property: "og:title", content: "Bot Usage — Jenvu" },
      { property: "og:description", content: "See JX Bot profit, balance, equity and trades for every MT5 account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BotUsagePage,
});

const usd = (n: number) => `${n < 0 ? "-" : ""}$${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const ONLINE_MS = 3 * 60 * 1000;

function BotUsagePage() {
  const load = useServerFn(getBotUsage);
  const [account, setAccount] = useState("all");
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const removeAccount = useServerFn(deleteBotAccount);
  const qc = useQueryClient();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmAcc, setConfirmAcc] = useState<string | null>(null);
  const onDelete = (acc: string) => setConfirmAcc(acc);
  const doDelete = async (acc: string) => {
    setConfirmAcc(null);
    setDeleting(acc);
    try {
      const r = await removeAccount({ data: { account: acc } });
      if (!r.ok) toast.error(r.error);
      else {
        toast.success(`MT5 ${acc} deleted`);
        if (account === acc) setAccount("all");
        await qc.invalidateQueries({ queryKey: ["bot-usage"] });
      }
    } catch {
      toast.error("Could not delete the account.");
    } finally {
      setDeleting(null);
    }
  };
  const { data, isFetching, refetch } = useQuery({ queryKey: ["bot-usage"], queryFn: () => load(), refetchInterval: 5_000, refetchOnWindowFocus: true });
  const [rangeDays, setRangeDays] = useState(30);
  const [rangeOpen, setRangeOpen] = useState(false);

  const view = useMemo(() => {
    const rows: BotReportRow[] = data?.rows ?? [];
    const accounts = Array.from(new Set(rows.map((r) => r.mt5_account)));
    const picked = account === "all" ? rows : rows.filter((r) => r.mt5_account === account);
    const today = new Date().toISOString().slice(0, 10);
    const todayRows = picked.filter((r) => r.day === today);
    const latest = new Map<string, BotReportRow>();
    for (const r of picked) latest.set(r.mt5_account, r); // one row per account, rows ordered by day
    const latestList = Array.from(latest.values());
    const days = new Map<string, { profit: number; trades: number }>();
    for (let i = rangeDays - 1; i >= 0; i--) days.set(new Date(Date.now() - i * 86400000).toISOString().slice(0, 10), { profit: 0, trades: 0 });
    for (const r of picked) {
      const d = days.get(r.day);
      if (d) {
        d.profit += r.today_profit;
        d.trades += r.trades_today;
      }
    }
    const chart = Array.from(days, ([date, d]) => ({ date, v: Math.round(d.profit * 100) / 100, trades: d.trades }));
    const target = data && isMt5Plan(data.plan) ? (data.dailyTarget || dailyTarget(data.plan)) : 0;
    const perAccount = latestList.filter((r) => r.day === today).map((r) => ({ account: r.mt5_account, ...sharedTargetStatus(target, [r.today_profit], r.target_hit) }));
    return {
      accounts,
      latestList,
      chart,
      target,
      perAccount,
      todayProfit: todayRows.reduce((a, r) => a + r.today_profit, 0),
      rangeProfit: chart.reduce((a, r) => a + r.v, 0),
      gains: chart.reduce((a, r) => a + Math.max(0, r.v), 0),
      losses: chart.reduce((a, r) => a + Math.min(0, r.v), 0),
      rangeTrades: chart.reduce((a, r) => a + r.trades, 0),
      ...(() => {
        // Only running accounts count; if none is running, show the most recently reported account.
        const running = latestList.filter((r) => Date.now() - Date.parse(r.updated_at) < ONLINE_MS && !(data?.sessions ?? []).find((x) => x.mt5_account === r.mt5_account)?.ended_at);
        const newest = [...latestList].sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at)).slice(0, 1);
        const src = running.length ? running : newest;
        return { balance: src.reduce((a, r) => a + r.balance, 0), equity: src.reduce((a, r) => a + r.equity, 0), runningCount: running.length };
      })(),
      tradesToday: todayRows.reduce((a, r) => a + r.trades_today, 0),
      openTrades: latestList
        .filter((r) => r.day === today && Date.now() - Date.parse(r.updated_at) < ONLINE_MS && !(data?.sessions ?? []).find((x) => x.mt5_account === r.mt5_account)?.ended_at)
        .reduce((a, r) => a + r.open_trades, 0),
    };
  }, [data, account, rangeDays]);

  const rangeLabel = (() => {
    const start = new Date(Date.now() - (rangeDays - 1) * 86400000);
    const end = new Date();
    return `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} - ${end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
  })();

  const exportCsv = () => {
    const lines = [["Day", "Profit (USD)", "Trades"], ...view.chart.map((d) => [d.date, d.v.toFixed(2), String(d.trades)])];
    const blob = new Blob([lines.map((l) => l.join(",")).join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jenvu-bot-usage-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const iconBtn = "grid h-8 w-8 place-items-center rounded-md text-foreground transition-colors hover:bg-foreground/[0.06]";

  return (
    <div className="mx-auto w-full max-w-[1100px] pb-10 text-foreground">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-[30px] font-normal tracking-tight text-foreground sm:text-[34px]">Bot Usage</h1>
        <UsageTabs active="bot" />
      </div>

      {/* Filter bar */}
      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2">
        <ConsoleSelect
          plain
          open={accountMenuOpen}
          onToggle={() => {
            setAccountMenuOpen((v) => !v);
            setRangeOpen(false);
          }}
          label=" Account"
          valueLabel={account === "all" ? "All" : `MT5 ${account}`}
          ariaLabel="MT5 account"
          options={[{ value: "all", label: "All MT5 accounts" }, ...view.accounts.map((a) => ({ value: a, label: `MT5 ${a}` }))]}
          value={account}
          onSelect={(v) => {
            setAccount(v);
            setAccountMenuOpen(false);
          }}
        />
        <div className="ml-auto flex items-center gap-1">
          <ConsoleSelect
            plain
            align="right"
            open={rangeOpen}
            onToggle={() => {
              setRangeOpen((v) => !v);
              setAccountMenuOpen(false);
            }}
            valueLabel={rangeLabel}
            icon={<Calendar className="h-4 w-4 text-foreground" />}
            hideArrows
            options={[
              { value: "7", label: "Last 7 days" },
              { value: "14", label: "Last 14 days" },
              { value: "30", label: "Last 30 days" },
            ]}
            value={String(rangeDays)}
            onSelect={(v) => {
              setRangeDays(Number(v));
              setRangeOpen(false);
            }}
          />
          <button
            type="button"
            aria-label="Refresh bot usage"
            className={`ml-1 ${iconBtn}`}
            onClick={async () => {
              const r = await refetch();
              if (r.isError) toast.error("Bot usage could not be refreshed");
              else toast.success("Bot usage refreshed");
            }}
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
          <button type="button" onClick={exportCsv} aria-label="Download bot usage CSV" className={iconBtn}>
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      {data && view.latestList.length === 0 && (
        <div className="console-card mt-4 flex flex-wrap items-center gap-2 px-4 py-3 text-[13px] text-muted-foreground">
          <Bot className="h-4 w-4" />
          {data.allowed
            ? "No bot data yet. Add your IP on the JX Bot page, type it into MyIP in the latest JX Bot and allow https://jenvu.com in MT5 WebRequest. Data appears within a minute."
            : "JX Bot needs a paid Pro, Elite or Ultra plan."}
          <Link to={data.allowed ? "/dashboard/jx-bot" : "/dashboard/billing"} className="font-medium text-foreground underline underline-offset-2">{data.allowed ? "Open JX Bot" : "See plans"}</Link>
        </div>
      )}

      {/* Profit + Balance / Trades */}
      <div className="mt-4 grid grid-cols-1 gap-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="console-card flex min-h-[420px] min-w-0 flex-col p-4 sm:p-5">
          <div className="text-[13px] text-muted-foreground">Profit</div>
          <div className={`mt-1 text-[22px] font-medium tabular-nums ${data ? pnlClass(view.rangeProfit) : ""}`}>{data ? usd(view.rangeProfit) : "…"}</div>
          <ProfitBars className="mt-4 flex-1" days={view.chart} format={usd} />
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-[12px]">
            <span className="inline-flex items-center gap-1.5 text-foreground">
              <span className="h-2 w-2 rounded-[2px]" style={{ background: "#2a9d8f" }} />
              Gains <span className="text-muted-foreground">({usd(view.gains)})</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-foreground">
              <span className="h-2 w-2 rounded-[2px]" style={{ background: "#e76f51" }} />
              Losses <span className="text-muted-foreground">({usd(view.losses)})</span>
            </span>
          </div>
        </section>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
          <section className="console-card flex min-h-[200px] flex-col p-4">
            <div className="text-[13px] text-muted-foreground">Trades</div>
            <div className="mt-1 text-[20px] font-medium tabular-nums text-foreground">{view.rangeTrades.toLocaleString()}</div>
            <StackedBars
              className="mt-3 flex-1"
              days={view.chart.map((d) => ({ date: d.date, v: d.trades }))}
              keys={["v"]}
              colors={["#a1a1aa"]}
              baseline="var(--border)"
              format={(v) => `${v} trades`}
              compact
            />
          </section>
          <section className="console-card flex min-h-[200px] flex-col p-4">
            <div className="text-[13px] text-muted-foreground">Balance</div>
            <div className="mt-1 text-[20px] font-medium tabular-nums text-foreground">{usd(view.balance)}</div>
            <dl className="mt-auto grid grid-cols-2 gap-x-4 gap-y-3 pt-4 text-[13px]">
              <div>
                <dt className="text-muted-foreground">Equity</dt>
                <dd className="mt-0.5 tabular-nums text-foreground">{usd(view.equity)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Profit today</dt>
                <dd className={`mt-0.5 tabular-nums ${pnlClass(view.todayProfit) || "text-foreground"}`}>{usd(view.todayProfit)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Trades today</dt>
                <dd className="mt-0.5 tabular-nums text-foreground">{view.tradesToday} <span className="text-muted-foreground">· {view.openTrades} open</span></dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Accounts</dt>
                <dd className="mt-0.5 tabular-nums text-foreground">{view.runningCount ? `${view.runningCount} running` : "Last account"}</dd>
              </div>
            </dl>
          </section>
        </div>
      </div>

      {/* Live trades */}
      <h2 className="mt-10 text-[18px] font-medium text-foreground">Trades</h2>
      <LiveTrades rows={view.latestList} sessions={data?.sessions ?? []} />

      {/* Accounts */}
      <h2 className="mt-10 text-[18px] font-medium text-foreground">Accounts</h2>
      <section className="console-card mt-3 p-4 sm:p-5">
        <p className="text-[13px] text-muted-foreground">Old accounts can be deleted. Accounts live on your JX Bot plan or running now are locked.</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[680px] text-[13px]">
            <thead className="text-left text-[12px] text-muted-foreground">
              <tr className="border-b border-border">
                <th className="pb-2 font-normal">MT5 account</th>
                <th className="pb-2 font-normal">Status</th>
                <th className="pb-2 text-right font-normal">Balance</th>
                <th className="pb-2 text-right font-normal">Equity</th>
                <th className="pb-2 text-right font-normal">Today</th>
                <th className="pb-2 text-right font-normal">Trades</th>
                <th className="pb-2 text-right font-normal">Open lots</th>
                <th className="pb-2 text-right font-normal"><span className="sr-only">Delete</span></th>
              </tr>
            </thead>
            <tbody>
              {view.latestList.length === 0 ? (
                <tr><td colSpan={8} className="py-8 text-center text-[12px] text-muted-foreground">No MT5 accounts have reported yet.</td></tr>
              ) : view.latestList.map((r) => {
                const lastSession = (data?.sessions ?? []).find((x) => x.mt5_account === r.mt5_account);
                const online = Date.now() - Date.parse(r.updated_at) < ONLINE_MS && !lastSession?.ended_at;
                const block = data?.deleteBlock?.[r.mt5_account] ?? null;
                return (
                  <tr key={r.license_id}>
                    <td className="py-2.5 text-foreground">{r.mt5_account}<span className="ml-2 text-muted-foreground">{r.symbol}</span></td>
                    <td className="py-2.5">
                      <span className={`inline-flex items-center gap-1.5 ${online ? "text-foreground" : "text-muted-foreground"}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${online ? "bg-emerald-600" : "bg-muted-foreground"}`} />
                        {r.target_hit && r.day === new Date().toISOString().slice(0, 10) ? "Target reached" : online ? "Running" : "Offline"}
                      </span>
                    </td>
                    <td className="py-2.5 text-right tabular-nums">{usd(r.balance)}</td>
                    <td className="py-2.5 text-right tabular-nums">{usd(r.equity)}</td>
                    <td className={`py-2.5 text-right tabular-nums ${pnlClass(r.today_profit)}`}>{usd(r.today_profit)}</td>
                    <td className="py-2.5 text-right tabular-nums">{r.trades_today}</td>
                    <td className="py-2.5 text-right tabular-nums">{r.open_lots.toFixed(2)}</td>
                    <td className="py-2.5 pl-2 text-right">
                      {block ? (
                        // Missing status = not locked; the server still refuses deleting live/running accounts.
                        <span
                          className="inline-flex h-8 w-8 items-center justify-center text-muted-foreground"
                          title={block === "running" ? "Running now, can't delete" : "Live on your JX Bot plan, can't delete"}
                          aria-label={block === "running" ? "Running now, can't delete" : "Live on your JX Bot plan, can't delete"}
                        >
                          <Lock className="h-3.5 w-3.5" />
                        </span>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          aria-label={`Delete MT5 ${r.mt5_account}`}
                          disabled={deleting === r.mt5_account}
                          onClick={() => onDelete(r.mt5_account)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Target + ON/OFF */}
      <div className="mt-10 grid grid-cols-1 gap-2 lg:grid-cols-2">
        <section className="console-card p-4 sm:p-5">
          <div className="text-[13px] text-muted-foreground">Daily target per account</div>
          <div className="mt-1 text-[22px] font-medium tabular-nums text-foreground">{usd(view.target)} <span className="text-[13px] font-normal text-muted-foreground">each</span></div>
          {view.perAccount.length === 0 && <div className="mt-4 h-1.5 rounded-full bg-background" />}
          {view.perAccount.map((a) => (
            <div key={a.account} className="mt-4">
              <div className="flex justify-between text-[12px]"><span className="text-foreground">MT5 {a.account}</span><span className="tabular-nums text-muted-foreground">{usd(a.combined)} / {usd(view.target)}</span></div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-background">
                <div className="h-full rounded-full" style={{ background: "#2a9d8f", width: `${view.target > 0 ? Math.min(100, Math.max(0, (a.combined / view.target) * 100)) : 0}%` }} />
              </div>
            </div>
          ))}
          <p className="mt-4 text-[13px] leading-5 text-muted-foreground">
            Every IP has its own daily target. When one account reaches it, that bot closes its trades and starts again next day.
          </p>
        </section>
        <section className="console-card">
          <OnOffLog sessions={(data?.sessions ?? []).filter((x) => account === "all" || x.mt5_account === account)} />
        </section>
      </div>
      <ConfirmDialog
        open={!!confirmAcc}
        title={`Delete MT5 ${confirmAcc ?? ""}?`}
        description="Profit history and ON/OFF log will be removed."
        onCancel={() => setConfirmAcc(null)}
        onConfirm={() => confirmAcc && doDelete(confirmAcc)}
      />
    </div>
  );
}

function pnlClass(v: number) {
  return v > 0 ? "text-gc-success" : v < 0 ? "text-destructive" : "";
}

const utc = (iso: string) => {
  const d = new Date(iso);
  return `${d.toISOString().slice(5, 10).replace("-", "/")} ${d.toISOString().slice(11, 16)}`;
};
const dur = (a: string, b: string) => {
  const m = Math.max(0, Math.round((Date.parse(b) - Date.parse(a)) / 60000));
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
};
const WHO: Record<string, string> = { you: "By you", pc: "PC / internet", bot: "By the bot", none: "" };

/** Bot ON/OFF times (UTC) for the last 3 days and why each stop happened. */
function OnOffLog({ sessions }: { sessions: BotSessionRow[] }) {
  const now = Date.now();
  return (
    <div className="p-5">
      <div className="text-[13px] font-semibold text-foreground">Bot ON / OFF · last 3 days (UTC)</div>
      {sessions.length === 0 ? (
        <p className="mt-3 text-[12px] text-muted-foreground">No ON/OFF records yet. They appear once the latest bot is running.</p>
      ) : (
        <ul className="no-scrollbar-arrows mt-3 max-h-[480px] divide-y divide-border overflow-y-auto">
          {sessions.map((x) => {
            const cause = sessionEndCause(x, now);
            const running = cause.by === "none";
            const end = x.ended_at ?? x.last_seen_at;
            return (
              <li key={x.id} className="py-2.5 text-[12px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-foreground">MT5 {x.mt5_account}</span>
                  <OnOffBadge on={running} />
                </div>
                <div className="mt-1 tabular-nums text-muted-foreground">
                  ON {utc(x.started_at)} → {running ? "now" : `OFF ${utc(end)}`} · {dur(x.started_at, running ? new Date(now).toISOString() : end)}
                </div>
                {!running && (
                  <div className="mt-1 text-foreground">
                    {cause.label}
                    <span className="ml-1.5 rounded bg-secondary px-1.5 py-0.5 text-[11px] text-muted-foreground">{WHO[cause.by]}</span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function OnOffBadge({ on }: { on: boolean }) {
  return on ? (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-gc-success/30 bg-gc-success/10 px-2 py-0.5 text-[11px] font-semibold text-gc-success">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gc-success opacity-70" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-gc-success" />
      </span>
      ON
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold text-destructive">
      <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
      OFF
    </span>
  );
}

const localTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit" });
const symbolLabel = (s: string) => (/EURUSD/i.test(s) || !s ? "EUR/USD" : s);

/** Exness-style live positions table, one row per account (the bot reports account totals, not single trades). */
function LiveTrades({ rows, sessions }: { rows: BotReportRow[]; sessions: BotSessionRow[] }) {
  const [tab, setTab] = useState<"open" | "closed">("open");
  const today = new Date().toISOString().slice(0, 10);
  const live = rows.filter((r) => r.day === today);
  const isOnline = (r: BotReportRow) => {
    const s = sessions.find((x) => x.mt5_account === r.mt5_account);
    return Date.now() - Date.parse(r.updated_at) < ONLINE_MS && !s?.ended_at;
  };
  const open = live.filter((r) => r.open_trades > 0 && isOnline(r));
  const totalOpen = open.reduce((a, r) => a + r.open_trades, 0);
  const totalFloat = open.reduce((a, r) => a + (r.equity - r.balance), 0);
  const th = "px-3 py-2 font-normal whitespace-nowrap";
  const td = "px-3 py-2.5 whitespace-nowrap";
  const first = "pl-4 sm:pl-5";
  return (
    <section className="console-card mt-3 overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 sm:px-5">
        <div className="flex items-center gap-7">
          {([["open", "Open", totalOpen], ["closed", "Closed today", null]] as const).map(([k, label, n]) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={`relative flex shrink-0 items-center gap-1.5 py-3 text-[13px] ${tab === k ? "text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {label}
              {n !== null && <span className="rounded-full bg-secondary px-1.5 text-[11px] leading-4 tabular-nums text-foreground">{n}</span>}
            </button>
          ))}
        </div>
        <div className="hidden text-[12px] text-muted-foreground sm:block">
          Floating <span className={`font-medium tabular-nums ${pnlClass(totalFloat)}`}>{usd(totalFloat)}</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        {tab === "open" ? (
          <table className="w-full min-w-[760px] text-[13px]">
            <thead className="text-left text-[12px] text-muted-foreground">
              <tr className="border-b border-border">
                <th className={`${th} ${first}`}>Symbol</th>
                <th className={th}>Account</th>
                <th className={`${th} text-right`}>Volume, lot</th>
                <th className={`${th} text-right`}>Balance</th>
                <th className={`${th} text-right`}>Equity</th>
                <th className={th}>Status</th>
                <th className={th}>Updated</th>
                <th className={`${th} text-right`}>P/L, USD</th>
              </tr>
            </thead>
            <tbody>
              {open.length === 0 ? (
                <tr><td colSpan={8} className="px-3 py-8 text-center text-[12px] text-muted-foreground">No open trades right now. They appear here while the bot is trading.</td></tr>
              ) : (
                open.map((r) => {
                  const floating = r.equity - r.balance;
                  const lastSession = sessions.find((x) => x.mt5_account === r.mt5_account);
                  const online = Date.now() - Date.parse(r.updated_at) < ONLINE_MS && !lastSession?.ended_at;
                  return (
                    <tr key={r.license_id}>
                      <td className={`${td} ${first}`}>
                        <span className="inline-flex items-center gap-2">
                          <img src={euFlag} alt="" className="h-4 w-4 rounded-full object-cover" />
                          <span className="text-foreground">{symbolLabel(r.symbol)}</span>
                          <span className="rounded-full bg-secondary px-1.5 text-[11px] tabular-nums">{r.open_trades}</span>
                        </span>
                      </td>
                      <td className={`${td} tabular-nums`}>{r.mt5_account}</td>
                      <td className={`${td} text-right tabular-nums`}>{r.open_lots.toFixed(2)}</td>
                      <td className={`${td} text-right tabular-nums`}>{usd(r.balance)}</td>
                      <td className={`${td} text-right tabular-nums`}>{usd(r.equity)}</td>
                      <td className={td}><OnOffBadge on={online} /></td>
                      <td className={`${td} text-muted-foreground`}>{localTime(r.updated_at)}</td>
                      <td className={`${td} text-right font-medium tabular-nums ${pnlClass(floating)}`}>{floating.toFixed(2)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full min-w-[560px] text-[13px]">
            <thead className="text-left text-[12px] text-muted-foreground">
              <tr className="border-b border-border">
                <th className={`${th} ${first}`}>Symbol</th>
                <th className={th}>Account</th>
                <th className={`${th} text-right`}>Trades today</th>
                <th className={th}>Updated</th>
                <th className={`${th} text-right`}>P/L today, USD</th>
              </tr>
            </thead>
            <tbody>
              {live.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-8 text-center text-[12px] text-muted-foreground">No trades closed today yet.</td></tr>
              ) : (
                live.map((r) => (
                  <tr key={r.license_id}>
                    <td className={`${td} ${first}`}>
                      <span className="inline-flex items-center gap-2">
                        <img src={euFlag} alt="" className="h-4 w-4 rounded-full object-cover" />
                        <span className="text-foreground">{symbolLabel(r.symbol)}</span>
                      </span>
                    </td>
                    <td className={`${td} tabular-nums`}>{r.mt5_account}</td>
                    <td className={`${td} text-right tabular-nums`}>{r.trades_today}</td>
                    <td className={`${td} text-muted-foreground`}>{localTime(r.updated_at)}</td>
                    <td className={`${td} text-right font-medium tabular-nums ${pnlClass(r.today_profit)}`}>{r.today_profit.toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
