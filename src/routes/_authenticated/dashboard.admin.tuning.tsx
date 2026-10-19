import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { RefreshCw, Play, CheckCircle2, RotateCcw, ShieldCheck, ShieldAlert, ChevronDown, ChevronRight } from "lucide-react";
import { isAdmin } from "@/lib/admin-messages.functions";
import {
  listWeightConfigs, listTuningRuns, activateWeightConfig, rollbackWeightConfig,
  listFoldResultsForConfig,
  type WeightConfigRow, type TuningRunRow, type FoldResultRow,
} from "@/lib/tuning/weights-admin.functions";
import { runGridSearchTuning } from "@/lib/tuning/grid-search.functions";
import { runWalkForwardValidation } from "@/lib/tuning/walk-forward.functions";

export const Route = createFileRoute("/_authenticated/dashboard/admin/tuning")({
  head: () => ({
    meta: [
      { title: "Signal Weight Tuning — Jenvu Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TuningPage,
});

function pct(n: number | null | undefined, d = 1) {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n.toFixed(d)}%`;
}
function num(n: number | null | undefined, d = 2) {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toFixed(d);
}
function timeAgo(iso: string | null) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function TuningPage() {
  const checkAdmin = useServerFn(isAdmin);
  const loadConfigs = useServerFn(listWeightConfigs);
  const loadRuns = useServerFn(listTuningRuns);
  const runGrid = useServerFn(runGridSearchTuning);
  const runValidate = useServerFn(runWalkForwardValidation);
  const loadFolds = useServerFn(listFoldResultsForConfig);
  const activate = useServerFn(activateWeightConfig);
  const rollback = useServerFn(rollbackWeightConfig);

  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [configs, setConfigs] = useState<WeightConfigRow[]>([]);
  const [runs, setRuns] = useState<TuningRunRow[]>([]);
  const [symbol, setSymbol] = useState("XAUUSD");
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [foldsByConfig, setFoldsByConfig] = useState<Record<string, FoldResultRow[]>>({});

  const reload = async () => {
    setLoading(true);
    try {
      const [c, r] = await Promise.all([loadConfigs(), loadRuns()]);
      setConfigs(c ?? []);
      setRuns(r ?? []);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const ok = await checkAdmin();
        setAllowed(!!ok);
        if (ok) await reload();
      } catch {
        setAllowed(false);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && !allowed) {
    return <div className="p-8 text-sm text-gc-ink-muted">Loading…</div>;
  }
  if (!allowed) {
    return <div className="p-8 text-sm text-rose-600">Admins only.</div>;
  }

  const active = configs.find((c) => c.status === "active");

  const startGrid = async () => {
    if (busy) return;
    setBusy(true);
    const tid = toast.loading("Running grid search — this can take up to 60s…");
    try {
      const res = await runGrid({ data: { symbol, threshold: 62 } });
      toast.success(
        `Best v${res.newVersion}: winRate=${pct(res.best.winRate)} · avgR=${num(res.best.avgR)} · sample=${res.best.sample}`,
        { id: tid },
      );
      await reload();
    } catch (e: any) {
      toast.error(e?.message ?? "Grid search failed", { id: tid });
    } finally {
      setBusy(false);
    }
  };

  const doActivate = async (id: string, version: number, validated: boolean) => {
    const force = !validated;
    const msg = force
      ? `⚠️ v${version} has NOT passed walk-forward validation. Manual override will activate it anyway. Continue?`
      : `Activate weight config v${version}?`;
    if (!confirm(msg)) return;
    try {
      await activate({ data: { configId: id, forceManualOverride: force } });
      toast.success(`v${version} is now active`);
      await reload();
    } catch (e: any) {
      toast.error(e?.message ?? "Activation failed");
    }
  };
  const doRollback = async () => {
    if (!confirm("Roll back to the most recently retired configuration?")) return;
    try {
      const r = await rollback();
      toast.success(`Rolled back to v${r.rolledBackTo}`);
      await reload();
    } catch (e: any) {
      toast.error(e?.message ?? "Rollback failed");
    }
  };

  const doValidate = async (id: string, version: number) => {
    if (validatingId) return;
    setValidatingId(id);
    const tid = toast.loading(`Walk-forward validating v${version} — 5 folds…`);
    try {
      const res = await runValidate({ data: { configId: id, symbol, threshold: 62 } });
      const s = res.summary as any;
      if (res.passed) {
        toast.success(`v${version} PASSED · ${s.foldWinsForCandidate}/${s.folds} folds · winRate=${pct(s.aggWinRate)} · avgR=${num(s.aggAvgR)}`, { id: tid });
      } else {
        toast.error(`v${version} FAILED · ${s.foldWinsForCandidate}/${s.folds} folds · winRate=${pct(s.aggWinRate)} · avgR=${num(s.aggAvgR)}`, { id: tid });
      }
      await reload();
      // refresh folds inline if expanded
      if (expanded === id) {
        const folds = await loadFolds({ data: { configId: id } });
        setFoldsByConfig((m) => ({ ...m, [id]: folds }));
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Validation failed", { id: tid });
    } finally {
      setValidatingId(null);
    }
  };

  const toggleFolds = async (id: string) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (!foldsByConfig[id]) {
      try {
        const folds = await loadFolds({ data: { configId: id } });
        setFoldsByConfig((m) => ({ ...m, [id]: folds }));
      } catch (e: any) {
        toast.error(e?.message ?? "Failed to load folds");
      }
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="pl-1 text-[28px] font-normal leading-tight sm:text-[32px] text-gc-ink">Signal Weight Tuning</h1>
          <p className="text-sm text-gc-ink-muted">Grid search on backtest history · Phase 1</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={reload}
            className="inline-flex items-center gap-1 rounded-xl border border-gc-line bg-background px-3 py-1.5 text-sm text-gc-ink hover:bg-gc-panel"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          <button
            onClick={doRollback}
            className="inline-flex items-center gap-1 rounded-xl border border-gc-line bg-background px-3 py-1.5 text-sm text-gc-ink hover:bg-gc-panel"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Rollback
          </button>
        </div>
      </header>

      {active && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
          <div className="font-medium text-emerald-900">
            Active configuration: v{active.version}{" "}
            <span className="text-emerald-700">({active.created_by})</span>
          </div>
          <div className="text-emerald-800">
            Activated {timeAgo(active.activated_at)}
            {active.notes ? ` · ${active.notes}` : ""}
          </div>
        </div>
      )}

      <section className="rounded-xl border border-gc-line bg-background p-4">
        <h2 className="pl-1 mb-3 text-lg font-semibold text-gc-ink">Run grid search</h2>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs text-gc-ink-muted">
            Symbol
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="rounded-xl border border-gc-line bg-background px-3 py-1.5 text-sm text-gc-ink"
            >
              {["XAUUSD"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <button
            onClick={startGrid}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-gc-on-blue hover:bg-slate-800 disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5" /> {busy ? "Running…" : "Run grid search"}
          </button>
        </div>
        <p className="mt-3 text-xs text-gc-ink-muted">
          27 combinations · scores each on ~900 15m candles + 600 1h candles ·
          objective = expectancy × √sample. Best candidate is saved but NOT
          auto-activated. Activate manually with a confirm, or wait for Phase 2
          walk-forward validation.
        </p>
      </section>

      <section className="rounded-xl border border-gc-line bg-background">
        <h2 className="pl-1 border-b border-gc-line p-4 text-lg font-semibold text-gc-ink">Tuning runs</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gc-panel text-xs uppercase text-gc-ink-muted">
              <tr>
                <th className="px-3 py-2 text-left">Started</th>
                <th className="px-3 py-2 text-left">Mode</th>
                <th className="px-3 py-2 text-left">Symbol</th>
                <th className="px-3 py-2 text-right">Combos</th>
                <th className="px-3 py-2 text-right">Best win %</th>
                <th className="px-3 py-2 text-right">Best avg R</th>
                <th className="px-3 py-2 text-right">Sample</th>
                <th className="px-3 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {runs.length === 0 && (
                <tr><td colSpan={8} className="px-3 py-6 text-center text-gc-ink-muted">No runs yet.</td></tr>
              )}
              {runs.map((r) => {
                const m = (r.metrics ?? {}) as Record<string, any>;
                return (
                  <tr key={r.id} className="border-t border-gc-line">
                    <td className="px-3 py-2 text-gc-ink">{timeAgo(r.started_at)}</td>
                    <td className="px-3 py-2 text-gc-ink">{r.mode}</td>
                    <td className="px-3 py-2 text-gc-ink">{r.symbol}</td>
                    <td className="px-3 py-2 text-right text-gc-ink">{r.combinations_tested}</td>
                    <td className="px-3 py-2 text-right text-gc-ink">{pct(m.winRate)}</td>
                    <td className="px-3 py-2 text-right text-gc-ink">{num(m.avgR)}</td>
                    <td className="px-3 py-2 text-right text-gc-ink">{m.sample ?? "—"}</td>
                    <td className="px-3 py-2 text-gc-ink">{r.status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-gc-line bg-background">
        <h2 className="pl-1 border-b border-gc-line p-4 text-lg font-semibold text-gc-ink">Weight configurations</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gc-panel text-xs uppercase text-gc-ink-muted">
              <tr>
                <th className="px-3 py-2 text-left"></th>
                <th className="px-3 py-2 text-left">Version</th>
                <th className="px-3 py-2 text-left">Source</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Validation</th>
                <th className="px-3 py-2 text-left">Notes</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {configs.map((c) => {
                const s = (c.validation_summary ?? {}) as any;
                const isOpen = expanded === c.id;
                const folds = foldsByConfig[c.id] ?? [];
                return (
                  <>
                    <tr key={c.id} className="border-t border-gc-line align-top">
                      <td className="px-3 py-2">
                        <button onClick={() => toggleFolds(c.id)} className="text-gc-ink-muted hover:text-gc-ink">
                          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                      </td>
                      <td className="px-3 py-2 font-medium text-gc-ink">v{c.version}</td>
                      <td className="px-3 py-2 text-gc-ink">{c.created_by}</td>
                      <td className="px-3 py-2">
                        {c.status === "active" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            <CheckCircle2 className="h-3 w-3" /> Active
                          </span>
                        ) : c.status === "candidate" ? (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                            Candidate
                          </span>
                        ) : (
                          <span className="rounded-full bg-gc-panel px-2 py-0.5 text-xs font-medium text-gc-ink-muted">
                            Retired
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {c.validated ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
                            <ShieldCheck className="h-3 w-3" /> Passed
                            {s.foldWinsForCandidate != null ? ` ${s.foldWinsForCandidate}/${s.folds ?? 5}` : ""}
                          </span>
                        ) : c.validation_summary ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 font-medium text-rose-700">
                            <ShieldAlert className="h-3 w-3" /> Failed
                            {s.foldWinsForCandidate != null ? ` ${s.foldWinsForCandidate}/${s.folds ?? 5}` : ""}
                          </span>
                        ) : (
                          <span className="rounded-full bg-gc-panel px-2 py-0.5 font-medium text-gc-ink-muted">
                            Not run
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-gc-ink-muted">{c.notes ?? "—"}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-1">
                          {c.status !== "active" && c.status !== "retired" && (
                            <button
                              onClick={() => doValidate(c.id, c.version)}
                              disabled={validatingId === c.id}
                              className="rounded-xl border border-gc-line bg-background px-3 py-1 text-xs text-gc-ink hover:bg-gc-panel disabled:opacity-50"
                            >
                              {validatingId === c.id ? "Validating…" : "Validate"}
                            </button>
                          )}
                          {c.status !== "active" && (
                            <button
                              onClick={() => doActivate(c.id, c.version, c.validated)}
                              className={
                                c.validated
                                  ? "rounded-xl bg-slate-900 px-3 py-1 text-xs font-medium text-gc-on-blue hover:bg-slate-800"
                                  : "rounded-xl border border-rose-200 bg-background px-3 py-1 text-xs text-rose-700 hover:bg-rose-50"
                              }
                            >
                              {c.validated ? "Activate" : "Force activate"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="border-t border-gc-line bg-gc-panel/60">
                        <td colSpan={7} className="px-4 py-3">
                          {folds.length === 0 ? (
                            <div className="text-xs text-gc-ink-muted">No walk-forward folds recorded for this config yet.</div>
                          ) : (
                            <table className="min-w-full text-xs">
                              <thead className="text-gc-ink-muted">
                                <tr>
                                  <th className="px-2 py-1 text-left">Fold</th>
                                  <th className="px-2 py-1 text-left">OOS window</th>
                                  <th className="px-2 py-1 text-right">Cand win %</th>
                                  <th className="px-2 py-1 text-right">Cand avg R</th>
                                  <th className="px-2 py-1 text-right">Sample</th>
                                  <th className="px-2 py-1 text-right">Base win %</th>
                                  <th className="px-2 py-1 text-right">Base avg R</th>
                                  <th className="px-2 py-1 text-left">Beats baseline</th>
                                </tr>
                              </thead>
                              <tbody>
                                {folds.map((f) => {
                                  const cm = (f.metrics ?? {}) as any;
                                  const b = cm.baseline ?? {};
                                  return (
                                    <tr key={f.id} className="border-t border-gc-line/70">
                                      <td className="px-2 py-1 text-gc-ink">#{f.fold_index}</td>
                                      <td className="px-2 py-1 text-gc-ink-muted">
                                        {new Date(f.oos_start).toLocaleDateString()} → {new Date(f.oos_end).toLocaleDateString()}
                                      </td>
                                      <td className="px-2 py-1 text-right text-gc-ink">{pct(f.win_rate)}</td>
                                      <td className="px-2 py-1 text-right text-gc-ink">{num(f.expectancy_r)}</td>
                                      <td className="px-2 py-1 text-right text-gc-ink">{f.sample_size}</td>
                                      <td className="px-2 py-1 text-right text-gc-ink-muted">{pct(b.winRate)}</td>
                                      <td className="px-2 py-1 text-right text-gc-ink-muted">{num(b.avgR)}</td>
                                      <td className="px-2 py-1">
                                        {f.passed ? (
                                          <span className="text-emerald-700">✓</span>
                                        ) : (
                                          <span className="text-rose-700">✗</span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
