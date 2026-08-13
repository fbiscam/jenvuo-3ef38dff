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

  const input = "rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400";

  return (
    <div className={`min-h-dvh w-full bg-white text-zinc-900 ${SANS}`}>
      <div className="mx-auto max-w-6xl px-5 py-6">
        <div className="flex flex-wrap items-center gap-2">
          {(["orders", "promos", "config"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-3.5 py-2 text-sm capitalize transition ${
                tab === t ? "bg-zinc-900 text-white" : "border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              {t === "config" ? "Deposit addresses" : t}
            </button>
          ))}
          <button onClick={() => void load()} className="ml-auto rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50">
            Refresh
          </button>
        </div>

        {error && <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {tab === "orders" && (
          <>
            <div className="mt-4 flex flex-wrap gap-2">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`rounded-full px-3 py-1.5 text-[13px] transition ${
                    filter === f.id ? "bg-zinc-100 text-zinc-900" : "text-zinc-500 hover:text-zinc-900"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead className="text-zinc-400">
                  <tr>
                    <th className="py-2 pr-3 font-normal">Created</th>
                    <th className="py-2 pr-3 font-normal">User</th>
                    <th className="py-2 pr-3 font-normal">Paid</th>
                    <th className="py-2 pr-3 font-normal">Credit</th>
                    <th className="py-2 pr-3 font-normal">Promo</th>
                    <th className="py-2 pr-3 font-normal">Network / TX</th>
                    <th className="py-2 pr-3 font-normal">Auto check</th>
                    <th className="py-2 pr-3 font-normal">Status</th>
                    <th className="py-2 pr-3 font-normal"></th>
                  </tr>
                </thead>
                <tbody>
                  {(rows ?? []).map((r) => {
                    const net = networkMeta(String(r.network));
                    return (
                      <tr key={r.id} className="border-t border-zinc-100 align-top">
                        <td className="py-2.5 pr-3 text-zinc-500">{new Date(r.created_at).toLocaleString()}</td>
                        <td className="py-2.5 pr-3">{r.email ?? r.user_id?.slice(0, 8)}</td>
                        <td className="py-2.5 pr-3">${Number(r.pay_amount_usd).toFixed(2)}</td>
                        <td className="py-2.5 pr-3">
                          ${Number(r.credit_usd).toFixed(2)}
                          {Number(r.bonus_usd) > 0 && <span className="text-emerald-700"> (+{Number(r.bonus_usd).toFixed(2)})</span>}
                        </td>
                        <td className="py-2.5 pr-3">{r.promo_code ?? "—"}</td>
                        <td className="py-2.5 pr-3">
                          <div>{net.label}</div>
                          {r.tx_hash ? (
                            <a href={net.explorerTx(r.tx_hash)} target="_blank" rel="noreferrer" className="break-all text-[12px] text-blue-600 underline">
                              {String(r.tx_hash).slice(0, 22)}…
                            </a>
                          ) : (
                            <span className="text-[12px] text-zinc-400">no tx yet</span>
                          )}
                        </td>
                        <td className="py-2.5 pr-3 max-w-[220px] text-[12px] text-zinc-500">
                          {r.auto_result?.reason ?? "—"}
                        </td>
                        <td className="py-2.5 pr-3">
                          <span
                            className={
                              r.status === "approved" ? "text-emerald-700" : r.status === "rejected" ? "text-red-600" : "text-zinc-600"
                            }
                          >
                            {r.status}
                          </span>
                          {r.reject_reason && <div className="text-[12px] text-red-500">{r.reject_reason}</div>}
                        </td>
                        <td className="py-2.5 pr-3">
                          {r.status !== "approved" && (
                            <div className="flex gap-1.5">
                              <button
                                disabled={busy === r.id}
                                onClick={() => void decide(r.id, "approve")}
                                className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[12px] text-white hover:bg-emerald-700 disabled:opacity-50"
                              >
                                Approve
                              </button>
                              {r.status !== "rejected" && (
                                <button
                                  disabled={busy === r.id}
                                  onClick={() => void decide(r.id, "reject")}
                                  className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[12px] text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                                >
                                  Reject
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {rows && rows.length === 0 && <p className="py-8 text-center text-sm text-zinc-400">No payments in this view.</p>}
            </div>
          </>
        )}

        {tab === "promos" && (
          <>
            <div className="mt-5 rounded-2xl border border-zinc-200 p-4">
              <div className="text-[13px] font-medium text-zinc-900">Create / update code</div>
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
                <button onClick={() => void savePromo()} disabled={busy === "promo"} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-800 disabled:opacity-50">
                  Save code
                </button>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead className="text-zinc-400">
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
                    <tr key={p.code} className="border-t border-zinc-100">
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
                          className={`rounded-full px-2.5 py-1 text-[12px] ${p.active ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500"}`}
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
          <div className="mt-5 max-w-2xl rounded-2xl border border-zinc-200 p-4">
            <div className="text-[13px] font-medium text-zinc-900">Deposit addresses</div>
            <p className="mt-1 text-[12px] text-zinc-500">Users see these on the payment page and auto-verification checks them.</p>
            <div className="mt-4 space-y-3">
              {(["trc20", "bep20", "erc20"] as const).map((k) => (
                <div key={k}>
                  <div className="text-[12px] uppercase tracking-[0.14em] text-zinc-400">{networkMeta(k).chain}</div>
                  <input
                    className={`${input} mt-1 w-full`}
                    value={cfg[k]}
                    onChange={(e) => setCfgState({ ...cfg, [k]: e.target.value })}
                    placeholder="Paste wallet address"
                  />
                </div>
              ))}
              <button onClick={() => void saveCfg()} disabled={busy === "cfg"} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-800 disabled:opacity-50">
                Save addresses
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
