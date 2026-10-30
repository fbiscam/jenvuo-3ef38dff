import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  opsListPayments,
  opsDecidePayment,
  opsListPromos,
  opsSavePromo,
  opsTogglePromo,
  opsGetPaymentConfig,
  opsSetPaymentConfig,
} from "@/lib/ops-payments.functions";
import { networkMeta } from "@/lib/payments/shared";

export const Route = createFileRoute("/ops-x9k2-7m4n/payments")({
  head: () => ({
    meta: [
      { title: "Ops Console · Payments" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: OpsPayments,
});

const SANS = "font-['Google_Sans','Product_Sans','Poppins',system-ui,sans-serif]";

function opsToken(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const fromUrl = new URLSearchParams(window.location.search).get("t");
  if (fromUrl) {
    try { window.sessionStorage.setItem("jenvu_ops_token", fromUrl); } catch { /* ignore */ }
    return fromUrl;
  }
  try { return window.sessionStorage.getItem("jenvu_ops_token") ?? undefined; } catch { return undefined; }
}

type Row = Record<string, any>;

const FILTERS = [
  { id: "review", label: "Needs review" },
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "all", label: "All" },
];

const emptyPromo = {
  code: "",
  type: "flat" as "percent" | "flat" | "discount" | "free",
  value: "5",
  minTopup: "0",
  maxBonus: "",
  usageLimit: "",
  perUserLimit: "1",
  expiresAt: "",
  note: "",
};

function OpsPayments() {
  const listFn = useServerFn(opsListPayments);
  const decideFn = useServerFn(opsDecidePayment);
  const promosFn = useServerFn(opsListPromos);
  const savePromoFn = useServerFn(opsSavePromo);
  const togglePromoFn = useServerFn(opsTogglePromo);
  const getCfg = useServerFn(opsGetPaymentConfig);
  const setCfg = useServerFn(opsSetPaymentConfig);

  const [tab, setTab] = useState<"orders" | "promos" | "config">("orders");
  const [filter, setFilter] = useState("review");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [promos, setPromos] = useState<Row[] | null>(null);
  const [cfg, setCfgState] = useState<{ trc20: string; bep20: string; erc20: string }>({ trc20: "", bep20: "", erc20: "" });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyPromo });
  const [query, setQuery] = useState("");


  const load = useCallback(async () => {
    try {
      const token = opsToken();
      const [o, p, c] = await Promise.all([
        listFn({ data: { token, status: filter } }),
        promosFn({ data: { token } }),
        getCfg({ data: { token } }),
      ]);
      setRows(o);
      setPromos(p);
      setCfgState(c as any);
      setError(null);
    } catch (e: any) {
      setError(String(e?.message ?? "Could not load payments."));
    }
  }, [filter, listFn, promosFn, getCfg]);

  useEffect(() => { void load(); }, [load]);

  async function decide(id: string, action: "approve" | "reject") {
    let reason = "";
    if (action === "reject") {
      reason = window.prompt("Rejection reason (shown to the user):") ?? "";
      if (!reason.trim()) return;
    }
    setBusy(id);
    try {
      await decideFn({ data: { orderId: id, action, reason, token: opsToken() } });
      toast.success(action === "approve" ? "Approved and credited." : "Rejected.");
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Action failed.");
    } finally {
      setBusy(null);
    }
  }

  async function savePromo() {
    setBusy("promo");
    try {
      await savePromoFn({
        data: {
          code: form.code,
          type: form.type,
          value: Number(form.value),
          minTopup: Number(form.minTopup || 0),
          maxBonus: form.maxBonus === "" ? null : Number(form.maxBonus),
          usageLimit: form.usageLimit === "" ? null : Number(form.usageLimit),
          perUserLimit: Number(form.perUserLimit || 1),
          expiresAt: form.expiresAt || null,
          active: true,
          note: form.note,
          token: opsToken(),
        },
      });
      toast.success("Promo code saved.");
      setForm({ ...emptyPromo });
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save the code.");
    } finally {
      setBusy(null);
    }
  }

  async function saveCfg() {
    setBusy("cfg");
    try {
      await setCfg({ data: { ...cfg, token: opsToken() } });
      toast.success("Deposit addresses saved.");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save addresses.");
    } finally {
      setBusy(null);
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied.");
    } catch {
      toast.error("Copy failed.");
    }
  }

  const q = query.trim().toLowerCase();
  const visible: Row[] = (rows ?? []).filter((r) =>
    !q
      ? true
      : [r.email, r.user_email, r.user_id, r.id, r.tx_hash, r.promo_code, r.deposit_address]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q)),
  );

  const input = "rounded-xl border border-gc-line px-3 py-2 text-sm outline-none focus:border-gc-line";


  return (
    <div className={`min-h-dvh w-full bg-background text-gc-ink ${SANS}`}>
      <div className="mx-auto max-w-6xl px-5 py-6">
        <div className="flex flex-wrap items-center gap-2">
          {(["orders", "promos", "config"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-xl px-3.5 py-2 text-sm capitalize transition ${ tab === t ? "bg-gc-blue text-gc-on-blue" : "border border-gc-line text-gc-ink hover:bg-gc-panel" }`}
            >
              {t === "config" ? "Deposit addresses" : t}
            </button>
          ))}
          <button onClick={() => void load()} className="ml-auto rounded-xl border border-gc-line px-3 py-2 text-sm hover:bg-gc-panel">
            Refresh
          </button>
        </div>

        {error && <div className="mt-4 rounded-xl bg-gc-red-soft px-4 py-3 text-sm text-gc-red">{error}</div>}

        {tab === "orders" && (
          <>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`rounded-full px-3 py-1.5 text-[13px] transition ${ filter === f.id ? "bg-gc-blue text-gc-on-blue" : "border border-gc-line text-gc-ink-muted hover:bg-gc-panel" }`}
                >
                  {f.label}
                </button>
              ))}
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search email, TX ID, order ID, promo…"
                className={`${input} ml-auto w-full sm:w-80`}
              />
            </div>

            {rows && rows.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { k: "Orders", v: String(visible.length) },
                  { k: "Paid total", v: `$${visible.reduce((s, r) => s + Number(r.pay_amount_usd || 0), 0).toFixed(2)}` },
                  { k: "Credit total", v: `$${visible.reduce((s, r) => s + Number(r.credit_usd || 0), 0).toFixed(2)}` },
                  { k: "Awaiting action", v: String(visible.filter((r) => !["approved", "rejected"].includes(String(r.status))).length) },
                ].map((s) => (
                  <div key={s.k} className="rounded-xl border border-gc-line px-4 py-3">
                    <div className="text-[11px] uppercase tracking-[0.14em] text-gc-ink-muted">{s.k}</div>
                    <div className="mt-1 text-lg font-medium text-gc-ink">{s.v}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 space-y-3">
              {visible.map((r) => {
                const net = networkMeta(String(r.network));
                const status = String(r.status ?? "");
                const pill =
                  status === "approved"
                    ? "bg-gc-green-soft text-gc-success"
                    : status === "rejected"
                      ? "bg-gc-red-soft text-gc-red"
                      : status === "expired"
                        ? "bg-gc-panel text-gc-ink-muted"
                        : "bg-gc-yellow-soft text-gc-amber";
                return (
                  <div key={r.id} className="rounded-2xl border border-gc-line p-4">
                    <div className="flex flex-wrap items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2.5 py-1 text-[11px] uppercase tracking-[0.1em] ${pill}`}>
                            {status.replace("_", " ") || "unknown"}
                          </span>
                          <span className="text-[13px] font-medium text-gc-ink break-all">
                            {r.email ?? r.user_email ?? String(r.user_id ?? "").slice(0, 8)}
                          </span>
                          <span className="text-[12px] text-gc-ink-muted">{new Date(r.created_at).toLocaleString()}</span>
                        </div>
                        <div className="mt-1 text-[12px] text-gc-ink-muted">
                          {net.label} · order <span className="font-mono">{String(r.id).slice(0, 8)}</span>
                          {r.user_id && <> · user <span className="font-mono">{String(r.user_id)}</span></>}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-medium text-gc-ink">${Number(r.pay_amount_usd || 0).toFixed(2)}</div>
                        <div className="text-[12px] text-gc-ink-muted">
                          {r.is_upgrade ? (
                            <span className="font-semibold text-gc-blue-deep uppercase">Upgrade: {r.target_plan_id}</span>
                          ) : (
                            <>
                              credit ${Number(r.credit_usd || 0).toFixed(2)}
                              {Number(r.bonus_usd) > 0 && <span className="text-gc-success"> (+${Number(r.bonus_usd).toFixed(2)})</span>}
                            </>
                          )}
                        </div>
                      </div>

                    </div>

                    <div className="mt-3 rounded-xl bg-gc-panel px-3 py-2.5">
                      <div className="text-[11px] uppercase tracking-[0.14em] text-gc-ink-muted">Transaction ID</div>
                      {r.tx_hash ? (
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <code className="min-w-0 flex-1 break-all font-mono text-[12.5px] text-gc-ink">{String(r.tx_hash)}</code>
                          <button onClick={() => void copy(String(r.tx_hash))} className="rounded-xl border border-gc-line bg-background px-2.5 py-1 text-[12px] hover:bg-gc-panel">
                            Copy
                          </button>
                          <a href={net.explorerTx(String(r.tx_hash))} target="_blank" rel="noreferrer" className="rounded-xl border border-gc-line bg-background px-2.5 py-1 text-[12px] hover:bg-gc-panel">
                            Explorer
                          </a>
                        </div>
                      ) : (
                        <div className="mt-1 text-[12.5px] text-gc-ink-muted">Not submitted yet</div>
                      )}
                    </div>

                    <div className="mt-3 grid gap-2 text-[12.5px] sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.14em] text-gc-ink-muted">Deposit address</div>
                        <div className="break-all font-mono text-gc-ink">{r.deposit_address ?? "—"}</div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.14em] text-gc-ink-muted">Promo</div>
                        <div className="text-gc-ink">{r.promo_code ?? "—"}</div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.14em] text-gc-ink-muted">Expires</div>
                        <div className="text-gc-ink">{r.expires_at ? new Date(r.expires_at).toLocaleString() : "—"}</div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.14em] text-gc-ink-muted">Auto check</div>
                        <div className="text-gc-ink">{r.auto_result?.reason ?? "—"}</div>
                      </div>
                    </div>

                    {r.reject_reason && (
                      <div className="mt-3 rounded-xl bg-gc-red-soft px-3 py-2 text-[12.5px] text-gc-red">Rejected: {r.reject_reason}</div>
                    )}

                    {status !== "approved" && (
                      <div className="mt-3 flex gap-2">
                        <button
                          disabled={busy === r.id}
                          onClick={() => void decide(r.id, "approve")}
                          className="rounded-xl bg-gc-success px-3.5 py-2 text-[13px] text-gc-on-blue hover:bg-gc-success/90 disabled:opacity-50"
                        >
                          Approve & credit
                        </button>
                        {status !== "rejected" && (
                          <button
                            disabled={busy === r.id}
                            onClick={() => void decide(r.id, "reject")}
                            className="rounded-xl border border-gc-line px-3.5 py-2 text-[13px] text-gc-ink hover:bg-gc-panel disabled:opacity-50"
                          >
                            Reject
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {rows && visible.length === 0 && <p className="py-8 text-center text-sm text-gc-ink-muted">No payments in this view.</p>}
              {!rows && <p className="py-8 text-center text-sm text-gc-ink-muted">Loading…</p>}
            </div>
          </>
        )}


        {tab === "promos" && (
          <>
            <div className="mt-5 rounded-2xl border border-gc-line p-4">
              <div className="text-[13px] font-medium text-gc-ink">Create / update code</div>
              <div className="mt-3 grid gap-2 sm:grid-cols-4">
                <input className={input} placeholder="CODE" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
                <select className={input} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as any })}>
                  <option value="percent">Percent bonus (%)</option>
                  <option value="flat">Flat bonus ($)</option>
                  <option value="discount">Discount (% off)</option>
                  <option value="free">Free credit ($)</option>
                </select>
                <input className={input} placeholder="Value" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
                <input className={input} placeholder="Min top-up $" value={form.minTopup} onChange={(e) => setForm({ ...form, minTopup: e.target.value })} />
                <input className={input} placeholder="Max bonus $ (optional)" value={form.maxBonus} onChange={(e) => setForm({ ...form, maxBonus: e.target.value })} />
                <input className={input} placeholder="Total uses (optional)" value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} />
                <input className={input} placeholder="Per user limit" value={form.perUserLimit} onChange={(e) => setForm({ ...form, perUserLimit: e.target.value })} />
                <input className={input} type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
                <input className={`${input} sm:col-span-3`} placeholder="Note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
                <button onClick={() => void savePromo()} disabled={busy === "promo"} className="rounded-xl bg-gc-blue px-4 py-2 text-sm text-gc-on-blue hover:bg-gc-blue-hover disabled:opacity-50">
                  Save code
                </button>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead className="text-gc-ink-muted">
                  <tr>
                    <th className="py-2 pr-3 font-normal">Code</th>
                    <th className="py-2 pr-3 font-normal">Type</th>
                    <th className="py-2 pr-3 font-normal">Value</th>
                    <th className="py-2 pr-3 font-normal">Min</th>
                    <th className="py-2 pr-3 font-normal">Cap</th>
                    <th className="py-2 pr-3 font-normal">Used</th>
                    <th className="py-2 pr-3 font-normal">Expires</th>
                    <th className="py-2 pr-3 font-normal">Active</th>
                  </tr>
                </thead>
                <tbody>
                  {(promos ?? []).map((p) => (
                    <tr key={p.code} className="border-t border-gc-line">
                      <td className="py-2.5 pr-3 font-medium">{p.code}</td>
                      <td className="py-2.5 pr-3">{p.type}</td>
                      <td className="py-2.5 pr-3">{Number(p.value)}{p.type === "percent" || p.type === "discount" ? "%" : "$"}</td>
                      <td className="py-2.5 pr-3">${Number(p.min_topup_usd).toFixed(2)}</td>
                      <td className="py-2.5 pr-3">{p.max_bonus_usd == null ? "—" : `$${Number(p.max_bonus_usd).toFixed(2)}`}</td>
                      <td className="py-2.5 pr-3">{p.used_count}{p.usage_limit ? ` / ${p.usage_limit}` : ""}</td>
                      <td className="py-2.5 pr-3">{p.expires_at ? new Date(p.expires_at).toLocaleDateString() : "—"}</td>
                      <td className="py-2.5 pr-3">
                        <button
                          onClick={async () => {
                            await togglePromoFn({ data: { code: p.code, active: !p.active, token: opsToken() } });
                            await load();
                          }}
                          className={`rounded-full px-2.5 py-1 text-[12px] ${p.active ? "bg-gc-green-soft text-gc-success" : "bg-gc-panel text-gc-ink-muted"}`}
                        >
                          {p.active ? "Active" : "Disabled"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === "config" && (
          <div className="mt-5 max-w-2xl rounded-2xl border border-gc-line p-4">
            <div className="text-[13px] font-medium text-gc-ink">Deposit addresses</div>
            <p className="mt-1 text-[12px] text-gc-ink-muted">Users see these on the payment page and auto-verification checks them.</p>
            <div className="mt-4 space-y-3">
              {(["trc20", "bep20", "erc20"] as const).map((k) => (
                <div key={k}>
                  <div className="text-[12px] uppercase tracking-[0.14em] text-gc-ink-muted">{networkMeta(k).chain}</div>
                  <input
                    className={`${input} mt-1 w-full`}
                    value={cfg[k]}
                    onChange={(e) => setCfgState({ ...cfg, [k]: e.target.value })}
                    placeholder="Paste wallet address"
                  />
                </div>
              ))}
              <button onClick={() => void saveCfg()} disabled={busy === "cfg"} className="rounded-xl bg-gc-blue px-4 py-2 text-sm text-gc-on-blue hover:bg-gc-blue-hover disabled:opacity-50">
                Save addresses
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
