import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AlertTriangle, RefreshCw, ShieldCheck } from "lucide-react";
import { isAdmin } from "@/lib/admin-messages.functions";
import {
  listChargeAudit,
  listChargeMismatches,
  type ChargeAuditRow,
  type MismatchRow,
} from "@/lib/admin-charge-audit.functions";
import { OpsBadge, OpsPage, OpsSection, OpsState, OpsStats, ops } from "@/components/ops/OpsPage";

export const Route = createFileRoute("/_authenticated/dashboard/admin/scan-audit")({
  head: () => ({
    meta: [
      { title: "Scan Charge Audit — Jenvu Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ScanAuditPage,
});

function ScanAuditPage() {
  const checkAdmin = useServerFn(isAdmin);
  const fetchAudit = useServerFn(listChargeAudit);
  const fetchMismatches = useServerFn(listChargeMismatches);

  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [rows, setRows] = useState<ChargeAuditRow[]>([]);
  const [mismatches, setMismatches] = useState<MismatchRow[]>([]);
  const [reasonFilter, setReasonFilter] = useState<string>("");
  const [scanFilter, setScanFilter] = useState<string>("");

  const load = async () => {
    try {
      const [audit, mm] = await Promise.all([
        fetchAudit({ data: { limit: 300, reason: reasonFilter || undefined, scanId: scanFilter || undefined } }),
        fetchMismatches(),
      ]);
      setRows(audit);
      setMismatches(mm);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const { admin } = await checkAdmin();
        setAllowed(admin);
        if (admin) await load();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <OpsState title="Loading charge audit…" />;
  if (!allowed) return <OpsState title="Admin access required" description="Sign in with an admin account to view this page." />;

  const totalCharged = rows.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const failed = rows.filter((r) => r.source.includes("failed")).length;

  return (
    <OpsPage
      title="Scan charge audit"
      description="Every credit deduction with source, caller and scan link. Mismatches are flagged automatically."
      icon={<ShieldCheck />}
      actions={
        <button onClick={load} className={ops.btn}>
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      }
    >
      <OpsStats
        items={[
          { label: "Charges shown", value: rows.length },
          { label: "Total charged", value: totalCharged.toFixed(2) },
          { label: "Mismatched scans", value: mismatches.length, tone: mismatches.length ? "danger" : "success" },
          { label: "Failed sources", value: failed, tone: failed ? "warning" : undefined },
        ]}
      />

      <OpsSection
        title={
          <span className="inline-flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-gc-amber" /> Mismatched scans
            <span className="font-normal text-muted-foreground">· any scan with more than 1 deduction</span>
          </span>
        }
        flush
      >
        {mismatches.length === 0 ? (
          <p className="px-4 pb-5 text-[13px] text-muted-foreground sm:px-6">No mismatches. Every scan deducted exactly once.</p>
        ) : (
          <div className={ops.tableWrap}>
            <table className={ops.table}>
              <thead className={ops.thead}>
                <tr>
                  {["Scan ID", "User", "#", "Total", "Reasons", "Sources", "Callers", "Last"].map((h) => (
                    <th key={h} className={ops.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mismatches.map((m) => (
                  <tr key={m.scan_id} className={ops.tr}>
                    <td className={`${ops.td} font-mono text-[11px]`}>
                      <button className="text-gc-blue hover:underline" onClick={() => setScanFilter(m.scan_id)}>
                        {m.scan_id.slice(0, 8)}…
                      </button>
                    </td>
                    <td className={ops.td}>{m.user_email ?? m.user_id.slice(0, 8)}</td>
                    <td className={`${ops.td} font-semibold text-gc-red`}>{m.charge_count}</td>
                    <td className={`${ops.td} tabular-nums`}>-{m.total_amount}</td>
                    <td className={ops.td}>{m.reasons.join(", ")}</td>
                    <td className={ops.td}>{m.sources.join(", ")}</td>
                    <td className={ops.td}>{(m.callers ?? []).filter(Boolean).join(", ")}</td>
                    <td className={`${ops.td} text-muted-foreground`}>{new Date(m.last_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </OpsSection>

      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3 sm:px-6">
        <select value={reasonFilter} onChange={(e) => setReasonFilter(e.target.value)} className={`${ops.input} w-auto`}>
          <option value="">All reasons</option>
          <option value="signal">signal</option>
          <option value="ict_narration">ict_narration</option>
          <option value="voice_query">voice_query</option>
          <option value="alert">alert</option>
        </select>
        <input
          value={scanFilter}
          onChange={(e) => setScanFilter(e.target.value)}
          placeholder="Filter by scan_id"
          className={`${ops.input} w-64 max-w-full font-mono`}
        />
        <button onClick={load} className={ops.btnPrimary}>Apply</button>
        {(reasonFilter || scanFilter) && (
          <button
            onClick={() => { setReasonFilter(""); setScanFilter(""); setTimeout(load, 0); }}
            className="text-[13px] text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        )}
      </div>

      <OpsSection title={`Charge log · ${rows.length}`} flush>
        <div className={ops.tableWrap}>
          <table className={ops.table}>
            <thead className={ops.thead}>
              <tr>
                {["When", "User", "Reason", "Δ", "Balance", "Source", "Caller", "Scan ID", "Symbol"].map((h) => (
                  <th key={h} className={ops.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={ops.tr}>
                  <td className={`${ops.td} text-muted-foreground`}>{new Date(r.created_at).toLocaleString()}</td>
                  <td className={ops.td}>{r.user_email ?? r.user_id.slice(0, 8)}</td>
                  <td className={`${ops.td} font-medium`}>{r.reason}</td>
                  <td className={`${ops.td} tabular-nums`}>-{r.amount}</td>
                  <td className={`${ops.td} tabular-nums`}>{r.balance_after ?? "—"}</td>
                  <td className={ops.td}>
                    <OpsBadge tone={r.source.includes("failed") ? "danger" : r.source === "server_spend" ? "success" : "warning"}>
                      {r.source}
                    </OpsBadge>
                  </td>
                  <td className={`${ops.td} font-mono text-[11px]`}>{r.caller ?? "—"}</td>
                  <td className={`${ops.td} font-mono text-[11px]`}>
                    {r.scan_id ? (
                      <button className="text-gc-blue hover:underline" onClick={() => setScanFilter(r.scan_id!)}>
                        {r.scan_id.slice(0, 8)}…
                      </button>
                    ) : "—"}
                  </td>
                  <td className={ops.td}>{r.symbol ?? "—"}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={9} className="py-12 text-center text-[13px] text-muted-foreground">No entries.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </OpsSection>
    </OpsPage>
  );
}
