import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { RefreshCw, AlertTriangle, CheckCircle2, XCircle, Activity } from "lucide-react";
import { isAdmin } from "@/lib/admin-messages.functions";
import { OpsPage, OpsState, OpsStats, ops } from "@/components/ops/OpsPage";
import { runTvMismatchCheck, type MismatchReport } from "@/lib/tv-mismatch.functions";

export const Route = createFileRoute("/_authenticated/dashboard/admin/tv-mismatch")({
  head: () => ({
    meta: [
      { title: "TradingView Mismatch Checker — Jenvu Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TvMismatchPage,
});

function fmt(n: number | null, d = 2) {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toFixed(d);
}

function StatusBadge({ status }: { status: "ok" | "warn" | "fail" | "no-data" }) {
  if (status === "ok")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gc-green-soft px-2 py-0.5 text-xs font-medium text-gc-success">
        <CheckCircle2 className="h-3 w-3" /> OK
      </span>
    );
  if (status === "warn")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gc-yellow-soft px-2 py-0.5 text-xs font-medium text-gc-amber">
        <AlertTriangle className="h-3 w-3" /> Drift
      </span>
    );
  if (status === "fail")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gc-red-soft px-2 py-0.5 text-xs font-medium text-gc-red">
        <XCircle className="h-3 w-3" /> Mismatch
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      No data
    </span>
  );
}

function TvMismatchPage() {
  const checkAdmin = useServerFn(isAdmin);
  const runCheck = useServerFn(runTvMismatchCheck);
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<MismatchReport | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await runCheck();
      setReport(r);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to run check");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const ok = await checkAdmin();
        setAllowed(!!ok);
        if (ok) await load();
        else setLoading(false);
      } catch {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!loading && !allowed) {
    return <OpsState title="Admin access required" description="Sign in with an admin account to view this page." />;
  }

  return (
    <OpsPage
      title="TradingView mismatch checker"
      description="Compares our XAU/USD chart candles against an independent live reference and reports drift"
      icon={<Activity />}
      actions={
        <button onClick={load} disabled={loading} className={ops.btn}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Re-run
        </button>
      }
    >
      {report && (
        <OpsStats
          items={[
            { label: "Pairs checked", value: report.pairs.length },
            { label: "OK", value: report.pairs.filter((p) => p.status === "ok").length, tone: "success" },
            { label: "Warn", value: report.pairs.filter((p) => p.status === "warn").length, tone: "warning" },
            { label: "Fail", value: report.pairs.filter((p) => p.status === "fail").length, tone: "danger" },
          ]}
        />
      )}
      <div className="px-4 py-5 sm:px-6">
        {report && (
          <div className="mb-4 rounded-xl border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
            Generated: {new Date(report.generatedAt).toLocaleString()} · Warn ≥ {report.thresholds.warnPct}% ·
            Fail ≥ {report.thresholds.failPct}%
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-border bg-background">
          <table className="w-full text-[13px]">
            <thead className="border-b border-border text-left text-[12px] text-muted-foreground">
              <tr>
                <th className="whitespace-nowrap px-4 py-2.5 font-normal">Pair</th>
                <th className="whitespace-nowrap px-4 py-2.5 font-normal">Status</th>
                <th className="whitespace-nowrap px-4 py-2.5 font-normal">Our price</th>
                <th className="whitespace-nowrap px-4 py-2.5 font-normal">Reference</th>
                <th className="whitespace-nowrap px-4 py-2.5 font-normal">Drift %</th>
                <th className="whitespace-nowrap px-4 py-2.5 font-normal">Candle alignment</th>
                <th className="whitespace-nowrap px-4 py-2.5 font-normal">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && !report && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    Running check…
                  </td>
                </tr>
              )}
              {report?.pairs.map((p) => {
                const dec = p.pair.endsWith("JPY") ? 3 : 2;
                return (
                  <tr key={p.pair} className="text-foreground">
                    <td className="px-4 py-3 font-medium">{p.pair}</td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-3 tabular-nums">{fmt(p.yahooLast, dec)}</td>
                    <td className="px-4 py-3 tabular-nums">{fmt(p.reference, dec)}</td>
                    <td className={`px-4 py-3 tabular-nums ${
                      p.status === "fail" ? "text-gc-red font-semibold" :
                      p.status === "warn" ? "text-gc-amber" : ""
                    }`}>
                      {p.driftPct == null ? "—" : `${p.driftPct >= 0 ? "+" : ""}${p.driftPct.toFixed(3)}%`}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {p.candleAlignment
                        ? `${p.candleAlignment.aligned}/${p.candleAlignment.total} · max gap ${p.candleAlignment.maxGapMinutes}m`
                        : p.pair === "XAUUSD" ? `${p.yahooCandles} candles` : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{p.note || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Reference sources: gold-api.com (XAU spot) and open.er-api.com (ECB FX rates). Small drift &lt; 0.25% is
          normal (spot vs futures basis). Drift ≥ 0.75% indicates our chart may not match TradingView.
        </p>
      </div>
    </OpsPage>
  );
}
