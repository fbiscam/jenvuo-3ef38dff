import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Bot, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Area, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from "recharts";
import { getBotUsage, type BotReportRow } from "@/lib/mt5-licenses.functions";
import { dailyTarget, isMt5Plan, sharedTargetStatus } from "@/lib/mt5-licenses";
import { Button } from "@/components/ui/button";
import { UsageTabs } from "@/components/dashboard/UsageTabs";

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
  const { data, isFetching, refetch } = useQuery({ queryKey: ["bot-usage"], queryFn: () => load(), refetchInterval: 60_000 });

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
    const target = data && isMt5Plan(data.plan) ? dailyTarget(data.plan) : 0;
    const allToday = rows.filter((r) => r.day === today);
    const shared = sharedTargetStatus(target, allToday.map((r) => r.today_profit), allToday.some((r) => r.target_hit));
    return {
      accounts,
      latestList,
      chart,
      target,
      shared,
      todayProfit: todayRows.reduce((a, r) => a + r.today_profit, 0),
      monthProfit: chart.reduce((a, r) => a + r.profit, 0),
      balance: latestList.reduce((a, r) => a + r.balance, 0),
      equity: latestList.reduce((a, r) => a + r.equity, 0),
      tradesToday: todayRows.reduce((a, r) => a + r.trades_today, 0),
      openTrades: latestList.filter((r) => r.day === today).reduce((a, r) => a + r.open_trades, 0),
    };
  }, [data, account]);

  const pct = view.target > 0 ? Math.min(100, Math.max(0, (view.shared.combined / view.target) * 100)) : 0;

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

      {data && !data.allowed && view.latestList.length === 0 ? (
        <Empty text="JX Bot needs a paid Pro, Elite or Ultra plan." action={<Link to="/dashboard/billing" className="text-[13px] font-medium text-primary">See plans</Link>} />
      ) : data && view.latestList.length === 0 ? (
        <Empty
          text="No bot data yet. Install the latest JX Bot, add your license key and allow https://jenvu.com in MT5 WebRequest. Data appears within a minute."
          action={<Link to="/dashboard/jx-bot" className="text-[13px] font-medium text-primary">Open JX Bot</Link>}
        />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            <section className="border-b border-border px-4 pb-4 pt-5 sm:px-7">
              <div className="text-[13px] text-foreground">Profit, last 30 days</div>
              <div className="mt-2 text-xl font-medium tabular-nums">{data ? usd(view.monthProfit) : "…"}</div>
              <div className="mt-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={view.chart} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="botProfit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="4 6" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} minTickGap={24} />
                    <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={52} tickFormatter={(v) => `$${v}`} />
                    <RTooltip formatter={(v: number) => [usd(v), "Profit"]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Area type="monotone" dataKey="profit" stroke="var(--chart-1)" strokeWidth={1.6} fill="url(#botProfit)" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="grid grid-cols-2 gap-px border-b border-border bg-border lg:grid-cols-4">
              <Stat label="Profit today" value={usd(view.todayProfit)} />
              <Stat label="Balance" value={usd(view.balance)} />
              <Stat label="Equity" value={usd(view.equity)} />
              <Stat label="Trades today" value={`${view.tradesToday}`} sub={`${view.openTrades} open`} />
            </section>

            <section className="px-4 py-5 sm:px-7">
              <h2 className="text-[13px] text-foreground">Accounts</h2>
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
                      const online = Date.now() - Date.parse(r.updated_at) < ONLINE_MS;
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
                          <td className="py-2.5 text-right tabular-nums">{usd(r.today_profit)}</td>
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

          <aside className="border-t border-border p-5 xl:border-l xl:border-t-0">
            <h2 className="text-[13px] text-foreground">Shared daily target</h2>
            <div className="mt-3 text-xl font-medium tabular-nums">
              {usd(view.shared.combined)} <span className="text-[13px] font-normal text-muted-foreground">/ {usd(view.target)}</span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-3 text-[12px] leading-5 text-muted-foreground">
              {view.shared.stop
                ? "Target reached. All your bots closed their trades and start again tomorrow."
                : "Your plan target is shared by all your MT5 accounts. When their total profit today reaches it, every bot closes its trades and starts again the next day."}
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-background px-4 py-4 sm:px-7">
      <div className="text-[12px] text-muted-foreground">{label}</div>
      <div className="mt-1.5 text-lg font-medium tabular-nums">{value}</div>
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
