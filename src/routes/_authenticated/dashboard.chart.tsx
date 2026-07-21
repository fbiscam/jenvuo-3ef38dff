import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState, Suspense, lazy } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getChartData, type ChartDataResponse } from "@/lib/chart-data.functions";

const PAIRS = ["XAUUSD", "XAUEUR", "XAUGBP", "XAUJPY", "XAUAUD", "XAUCHF"] as const;
const TFS = [
  { v: "5m", label: "5m" },
  { v: "15m", label: "15m" },
  { v: "1h", label: "1H" },
  { v: "4h", label: "4H" },
] as const;

const AnnotatedChart = lazy(() => import("@/components/AnnotatedChart"));

export const Route = createFileRoute("/_authenticated/dashboard/chart")({
  head: () => ({
    meta: [
      { title: "Annotated Chart · Jenvu Desk" },
      { name: "description", content: "Interactive XAU chart with live ICT/SMC markings: FVG, order blocks, BOS, liquidity, killzones." },
    ],
  }),
  component: ChartPage,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <div className="font-medium mb-1">Chart failed to load</div>
          <div className="mb-3">{(error as Error)?.message ?? "Unknown error"}</div>
          <button
            className="px-3 py-1.5 rounded-md bg-white border border-red-300 text-red-700 hover:bg-red-100"
            onClick={() => { void router.invalidate(); reset(); }}
          >Retry</button>
        </div>
      </div>
    );
  },
  notFoundComponent: () => <div className="p-6 text-sm">Not found.</div>,
});

function ChartPage() {
  const [pair, setPair] = useState<typeof PAIRS[number]>("XAUUSD");
  const [tf, setTf] = useState<string>("15m");
  const [data, setData] = useState<ChartDataResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [visible, setVisible] = useState({
    fvg: true,
    orderBlock: true,
    breaker: true,
    structure: true,
    liquidity: true,
    equilibrium: true,
  });

  const fetchChart = useServerFn(getChartData);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    fetchChart({ data: { pair, timeframe: tf } })
      .then((res) => {
        if (cancelled) return;
        if (!res.ok) setErr(res.error || "Chart data unavailable");
        setData(res);
      })
      .catch((e) => {
        if (cancelled) return;
        setErr((e as Error)?.message || "Chart data unavailable");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [pair, tf, fetchChart]);

  const toggle = (k: keyof typeof visible) => setVisible((v) => ({ ...v, [k]: !v[k] }));

  const decimals = data?.decimals ?? 2;
  const fmt = (n: number | undefined) =>
    typeof n === "number" && isFinite(n) ? `$${n.toFixed(decimals)}` : "—";

  return (
    <div className="max-w-[1400px] mx-auto p-4 md:p-6 space-y-4" style={{ fontFamily: "'Google Sans', system-ui, sans-serif" }}>
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Annotated Chart</h1>
          <p className="text-sm text-zinc-600">Live ICT/SMC markings on {data?.display ?? pair}. No AI, no cost — pure structure detection.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={pair}
            onChange={(e) => setPair(e.target.value as typeof PAIRS[number])}
            className="px-3 py-2 text-sm rounded-lg border border-zinc-200 bg-white text-zinc-900"
          >
            {PAIRS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <div className="inline-flex rounded-lg border border-zinc-200 bg-white overflow-hidden">
            {TFS.map((t) => (
              <button
                key={t.v}
                onClick={() => setTf(t.v)}
                className={`px-3 py-2 text-sm ${tf === t.v ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-50"}`}
              >{t.label}</button>
            ))}
          </div>
        </div>
      </header>

      {data && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-xs">
          <StatCard label="Last" value={fmt(data.lastPrice)} />
          <StatCard label="HTF Bias" value={data.htfBias} tone={biasTone(data.htfBias)} />
          <StatCard label="LTF Bias" value={data.ltfBias} tone={biasTone(data.ltfBias)} />
          <StatCard label="Session" value={data.session || "—"} />
          <StatCard label="Killzone" value={data.killzone || "—"} tone={data.inKillzone ? "text-emerald-700" : "text-zinc-500"} />
          <StatCard label="Equilibrium" value={fmt(data.equilibrium)} />
        </div>
      )}

      <div className="flex flex-wrap gap-2 text-xs">
        <Toggle on={visible.fvg} onClick={() => toggle("fvg")} color="#22c55e">FVG</Toggle>
        <Toggle on={visible.orderBlock} onClick={() => toggle("orderBlock")} color="#10b981">Order Block</Toggle>
        <Toggle on={visible.breaker} onClick={() => toggle("breaker")} color="#0ea5e9">Breaker / IFVG</Toggle>
        <Toggle on={visible.structure} onClick={() => toggle("structure")} color="#111827">BOS / CHoCH</Toggle>
        <Toggle on={visible.liquidity} onClick={() => toggle("liquidity")} color="#f59e0b">Liquidity</Toggle>
        <Toggle on={visible.equilibrium} onClick={() => toggle("equilibrium")} color="#6b7280">Range / EQ</Toggle>
      </div>

      {loading && !data && (
        <div className="w-full h-[560px] rounded-xl border border-zinc-200 bg-white flex items-center justify-center text-sm text-zinc-500">
          Loading candles…
        </div>
      )}

      {err && !loading && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{err}</div>
      )}

      {data && data.candles.length > 0 && (
        <Suspense fallback={<div className="w-full h-[560px] rounded-xl border border-zinc-200 bg-white" />}>
          <AnnotatedChart data={data} visible={visible} />
        </Suspense>
      )}

      {data && (
        <div className="grid md:grid-cols-3 gap-3">
          <Panel title={`Zones (${data.zones.length})`}>
            <ul className="space-y-1 text-xs max-h-56 overflow-auto">
              {data.zones.length === 0 && <li className="text-zinc-500">No fresh zones detected.</li>}
              {data.zones.map((z) => (
                <li key={z.id} className="flex justify-between gap-2">
                  <span className={z.mitigated ? "text-zinc-400" : "text-zinc-800"}>
                    {z.label}{z.mitigated ? " (mit)" : ""}
                  </span>
                  <span className="text-zinc-500">{fmt(z.priceLow)} – {fmt(z.priceHigh)}</span>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title={`Structure (${data.structure.length})`}>
            <ul className="space-y-1 text-xs">
              {data.structure.length === 0 && <li className="text-zinc-500">No recent BOS / CHoCH.</li>}
              {data.structure.map((s) => (
                <li key={s.id} className="flex justify-between gap-2">
                  <span className="text-zinc-800">{s.label}</span>
                  <span className="text-zinc-500">{fmt(s.price)}</span>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title={`Liquidity (${data.liquidity.length})`}>
            <ul className="space-y-1 text-xs max-h-56 overflow-auto">
              {data.liquidity.length === 0 && <li className="text-zinc-500">No pools mapped.</li>}
              {data.liquidity.map((l) => (
                <li key={l.id} className="flex justify-between gap-2">
                  <span className={l.swept ? "text-zinc-400" : "text-zinc-800"}>
                    {l.label}{l.swept ? " (swept)" : ""}
                  </span>
                  <span className="text-zinc-500">{fmt(l.price)}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      )}
    </div>
  );
}

function biasTone(b: string) {
  if (b === "bullish") return "text-emerald-700";
  if (b === "bearish") return "text-red-700";
  return "text-zinc-600";
}

function StatCard({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</div>
      <div className={`text-sm font-medium ${tone ?? "text-zinc-900"}`}>{value}</div>
    </div>
  );
}

function Toggle({ on, onClick, color, children }: { on: boolean; onClick: () => void; color: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs transition ${on ? "bg-white border-zinc-300 text-zinc-900" : "bg-zinc-50 border-zinc-200 text-zinc-400"}`}
    >
      <span className="inline-block w-2 h-2 rounded-sm" style={{ backgroundColor: on ? color : "#d4d4d8" }} />
      {children}
    </button>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3">
      <div className="text-xs font-semibold text-zinc-800 mb-2">{title}</div>
      {children}
    </div>
  );
}
