import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Bot, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Area, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from "recharts";
import { getBotUsage, type BotReportRow, type BotSessionRow } from "@/lib/mt5-licenses.functions";
import { dailyTarget, isMt5Plan, sessionEndCause, sharedTargetStatus } from "@/lib/mt5-licenses";
import { Button } from "@/components/ui/button";
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
  const { data, isFetching, refetch } = useQuery({ queryKey: ["bot-usage"], queryFn: () => load(), refetchInterval: 5_000, refetchOnWindowFocus: true });

  const view = useMemo(() => {
    const rows: BotReportRow[] = data?.rows ?? [];
    const accounts = Array.from(new Set(rows.map((r) => r.mt5_account)));
    const picked = account === "all" ? rows : rows.filter((r) => r.mt5_account === account);
    const today = new Date().toISOString().slice(0, 10);
    const todayRows = picked.filter((r) => r.day === today);
    const latest = new Map<string, BotReportRow>();
    for (const r of picked) latest.set(r.license_id, r); // rows ordered by day
    const latestList = Array.from(latest.values());
    const days = new Map<string, number>();
    for (let i = 29; i >= 0; i--) days.set(new Date(Date.now() - i * 86400000).toISOString().slice(0, 10), 0);
    for (const r of picked) if (days.has(r.day)) days.set(r.day, (days.get(r.day) ?? 0) + r.today_profit);
    const chart = Array.from(days, ([day, profit]) => ({ day: day.slice(5), profit: Math.round(profit * 100) / 100 }));
    const target = data && isMt5Plan(data.plan) ? (data.dailyTarget || dailyTarget(data.plan)) : 0;
    const perAccount = latestList.filter((r) => r.day === today).map((r) => ({ account: r.mt5_account, ...sharedTargetStatus(target, [r.today_profit], r.target_hit) }));
    return {
      accounts,
      latestList,
      chart,
      target,
      perAccount,
      todayProfit: todayRows.reduce((a, r) => a + r.today_profit, 0),
      monthProfit: chart.reduce((a, r) => a + r.profit, 0),
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
  }, [data, account]);
  const zeroAt = useMemo(() => {
    const vals = view.chart.map((r) => r.profit);
    const max = Math.max(0, ...vals);
    const min = Math.min(0, ...vals);
    if (max === min) return 1;
    return Math.min(1, Math.max(0, max / (max - min)));
  }, [view.chart]);


  return (
    <div className="-mx-5 -mb-7 min-h-[calc(100dvh-4rem)] overflow-hidden bg-background text-foreground sm:-mx-8">
      <div className="flex min-h-14 flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <UsageTabs active="bot" />
        <div className="flex items-center gap-2">
          <select
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            className="h-9 rounded-lg border border-border bg-card px-3 text-[13px] text-foreground outline-none"
            aria-label="MT5 account"
          >
            <option value="all">All MT5 accounts</option>
            {view.accounts.map((a) => (
              <option key={a} value={a}>MT5 {a}</option>
            ))}
          </select>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Refresh bot usage"
            className="text-muted-foreground"
            onClick={async () => {
              const r = await refetch();
              if (r.isError) toast.error("Bot usage could not be refreshed");
              else toast.success("Bot usage refreshed");
            }}
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {data && view.latestList.length === 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5 text-[12px] text-muted-foreground sm:px-7">
          <Bot className="h-4 w-4" />
          {data.allowed
            ? "No bot data yet. Run the latest JX Bot with your license key and allow https://jenvu.com in MT5 WebRequest. Data appears within a minute."
            : "JX Bot needs a paid Pro, Elite or Ultra plan."}
          <Link to={data.allowed ? "/dashboard/jx-bot" : "/dashboard/billing"} className="font-medium text-primary">{data.allowed ? "Open JX Bot" : "See plans"}</Link>
        </div>
      )}
      {(
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            <section className="border-b border-border px-4 pb-4 pt-5 sm:px-7">
              <div className="text-[13px] text-foreground">Profit, last 30 days</div>
              <div className={`mt-2 text-xl font-medium tabular-nums ${data ? pnlClass(view.monthProfit) : ""}`}>{data ? usd(view.monthProfit) : "…"}</div>
              <div className="mt-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={view.chart} margin={{ top: 4, right: 4, left: -2, bottom: 0 }}>
                    <defs>
                      <linearGradient id="botProfit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--gc-success)" stopOpacity={0.28} />
                        <stop offset={zeroAt} stopColor="var(--gc-success)" stopOpacity={0.04} />
                        <stop offset={zeroAt} stopColor="var(--destructive)" stopOpacity={0.04} />
                        <stop offset="100%" stopColor="var(--destructive)" stopOpacity={0.28} />
                      </linearGradient>
                      <linearGradient id="botProfitLine" x1="0" y1="0" x2="0" y2="1">
                        <stop offset={zeroAt} stopColor="var(--gc-success)" />
                        <stop offset={zeroAt} stopColor="var(--destructive)" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="4 6" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} minTickGap={24} />
                    <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={28} tickFormatter={(v) => `$${v}`} />
                    <RTooltip formatter={(v: number) => [usd(v), "Profit"]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Area type="monotone" dataKey="profit" stroke="url(#botProfitLine)" strokeWidth={1.8} fill="url(#botProfit)" baseValue={0} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="grid grid-cols-2 gap-px border-b border-border bg-border lg:grid-cols-4">
              <Stat label="Profit today" value={usd(view.todayProfit)} tone={pnlClass(view.todayProfit)} />
              <Stat label="Balance" value={usd(view.balance)} sub={view.runningCount ? `${view.runningCount} running` : "Last account"} />
              <Stat label="Equity" value={usd(view.equity)} sub={view.runningCount ? `${view.runningCount} running` : "Last account"} />
              <Stat label="Trades today" value={`${view.tradesToday}`} sub={`${view.openTrades} open`} />
            </section>

            <LiveTrades rows={view.latestList} sessions={data?.sessions ?? []} />

            <section className="px-4 py-5 sm:px-7">
              <h2 className="text-[13px] text-foreground"> Accounts</h2>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[640px] text-[13px]">
                  <thead className="text-left text-muted-foreground">
                    <tr className="border-b border-border">
                      <th className="py-2 font-normal">MT5 account</th>
                      <th className="py-2 font-normal">Status</th>
                      <th className="py-2 text-right font-normal">Balance</th>
                      <th className="py-2 text-right font-normal">Equity</th>
                      <th className="py-2 text-right font-normal">Today</th>
                      <th className="py-2 text-right font-normal">Trades</th>
                      <th className="py-2 text-right font-normal">Open lots</th>
                    </tr>
                  </thead>
                  <tbody>
                    {view.latestList.map((r) => {
                      const lastSession = (data?.sessions ?? []).find((x) => x.mt5_account === r.mt5_account);
                      const online = Date.now() - Date.parse(r.updated_at) < ONLINE_MS && !lastSession?.ended_at;
                      return (
                        <tr key={r.license_id} className="border-b border-border last:border-0">
                          <td className="py-2.5">{r.mt5_account}<span className="ml-2 text-muted-foreground">{r.symbol}</span></td>
                          <td className="py-2.5">
                            <span className={`inline-flex items-center gap-1.5 ${online ? "text-foreground" : "text-muted-foreground"}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${online ? "bg-primary" : "bg-muted-foreground"}`} />
                              {r.target_hit && r.day === new Date().toISOString().slice(0, 10) ? "Target reached" : online ? "Running" : "Offline"}
                            </span>
                          </td>
                          <td className="py-2.5 text-right tabular-nums">{usd(r.balance)}</td>
                          <td className="py-2.5 text-right tabular-nums">{usd(r.equity)}</td>
                          <td className={`py-2.5 text-right tabular-nums ${pnlClass(r.today_profit)}`}>{usd(r.today_profit)}</td>
                          <td className="py-2.5 text-right tabular-nums">{r.trades_today}</td>
                          <td className="py-2.5 text-right tabular-nums">{r.open_lots.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <aside className="border-t border-border xl:border-l xl:border-t-0">
            <div className="border-b border-border p-5">
            <h2 className="text-[13px] text-foreground">Daily target per account</h2>
            <div className="mt-2 text-xl font-medium tabular-nums">{usd(view.target)} <span className="text-[13px] font-normal text-muted-foreground">each</span></div>
            {view.perAccount.length === 0 && <div className="mt-3 h-1.5 rounded-full bg-secondary" />}
            {view.perAccount.map((a) => (
              <div key={a.account} className="mt-3">
                <div className="flex justify-between text-[12px]"><span>MT5 {a.account}</span><span className="tabular-nums text-muted-foreground">{usd(a.combined)} / {usd(view.target)}</span></div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${view.target > 0 ? Math.min(100, Math.max(0, (a.combined / view.target) * 100)) : 0}%` }} />
                </div>
              </div>
            ))}
            <p className="mt-3 text-[12px] leading-5 text-muted-foreground">
              Every license has its own daily target. When one account reaches it, that bot closes its trades and starts again next day. bot only trade EURUSD
            </p>
            </div>
            <OnOffLog sessions={(data?.sessions ?? []).filter((x) => account === "all" || x.mt5_account === account)} />
          </aside>
        </div>
      )}
    </div>
  );
}

function pnlClass(v: number) {
  return v > 0 ? "text-gc-success" : v < 0 ? "text-destructive" : "";
}

function Stat({ label, value, sub, tone = "" }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="bg-background px-4 py-4 sm:px-7">
      <div className="text-[12px] text-muted-foreground">{label}</div>
      <div className={`mt-1.5 text-lg font-medium tabular-nums ${tone}`}>{value}</div>
      {sub && <div className="text-[12px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function Empty({ text, action }: { text: string; action: React.ReactNode }) {
  return (
    <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
      <Bot className="h-6 w-6 text-muted-foreground" />
      <p className="mt-3 max-w-md text-[13px] text-muted-foreground">{text}</p>
      <div className="mt-3">{action}</div>
    </div>
  );
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
  const first = "pl-4 sm:pl-7";
  return (
    <section className="border-b border-border">
      <div className="flex items-center justify-between border-b border-border px-4 sm:px-7">
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
                    <tr key={r.license_id} className="border-b border-border last:border-0">
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
                  <tr key={r.license_id} className="border-b border-border last:border-0">
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
