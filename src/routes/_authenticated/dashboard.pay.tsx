import { createFileRoute, Link } from "@tanstack/react-router";
import { useCredits } from "@/hooks/useCredits";
import { useTrial } from "@/hooks/useTrial";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  quoteTopup,
  createTopupOrder,
  submitTxHash,
  listMyOrders,
  cancelOrder,
  redeemFreeCode,
} from "@/lib/payments.functions";
import {
  NETWORKS,
  PRESET_AMOUNTS,
  networkMeta,
  statusLabel,
  type NetworkId,
  type PaymentOrder,
  type Quote,
} from "@/lib/payments/shared";
import { UsdtIcon, TronIcon, BnbIcon, EthIcon, NetworkIcon } from "@/components/pay/CoinIcons";

export const Route = createFileRoute("/_authenticated/dashboard/pay")({
  head: () => ({
    meta: [
      { title: "Add Funds · Crypto Top-Up · Jenvu" },
      { name: "description", content: "Top up your Jenvu scan wallet with USDT on Tron, BNB Smart Chain or Ethereum. Instant on-chain verification." },
      { property: "og:title", content: "Add Funds · Crypto Top-Up · Jenvu" },
      { property: "og:description", content: "Top up your Jenvu scan wallet with USDT. Instant on-chain verification." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { amount?: number; purchase?: "credits" | "plan"; renew?: string } => {
    const raw = Number(search['amount']);
    const purchase = search['purchase'] === "credits" ? "credits" : search['purchase'] === "plan" ? "plan" : undefined;
    const amount = Number.isFinite(raw) && raw > 0
      ? Math.min(1000, Math.round(raw * 100) / 100)
      : undefined;
    const renew = ["pro", "elite", "ultra"].includes(String(search['renew'])) ? String(search['renew']) : undefined;
    return { amount, purchase, renew };
  },
  component: PayPage,
});

const SANS = { fontFamily: '"Google Sans Flex", "Google Sans", "Product Sans", "Roboto", system-ui, sans-serif', fontWeight: 400 } as const;

function useCountdown(iso: string | null | undefined) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (!iso) return;
    const tick = () => setLeft(Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [iso]);
  return left;
}

function PayPage() {
  const quoteFn = useServerFn(quoteTopup);
  const createFn = useServerFn(createTopupOrder);
  const submitFn = useServerFn(submitTxHash);
  const listFn = useServerFn(listMyOrders);
  const cancelFn = useServerFn(cancelOrder);
  const redeemFn = useServerFn(redeemFreeCode);

  const { amount: presetFromUrl, purchase, renew } = Route.useSearch();
  const credits = useCredits();
  const currentPlan = credits.plan && typeof credits.plan === 'object' ? (credits.plan as any).id : credits.plan;
  const trial = useTrial();
  const [mode, setMode] = useState<"topup" | "upgrade">(purchase === "credits" ? "topup" : "upgrade");
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(renew ?? null);


  const [amount, setAmount] = useState<number>(
    presetFromUrl && PRESET_AMOUNTS.includes(presetFromUrl) ? presetFromUrl : 25,
  );
  const [custom, setCustom] = useState(
    presetFromUrl && !PRESET_AMOUNTS.includes(presetFromUrl) ? String(presetFromUrl) : "",
  );
  const [network, setNetwork] = useState<NetworkId>("trc20");
  const [code, setCode] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const [hash, setHash] = useState("");
  const [busy, setBusy] = useState(false);
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const qSeq = useRef(0);

  const PLANS = [
    { id: "pro", name: "Pro", price: 49, features: ["Realtime Alerts", "Journal Access", "Multi-Timeframe Bias"] },
    { id: "elite", name: "Elite", price: 99, features: ["XAU/USD Senior Review", "Custom Alert Rules", "AI Model Analysis"] },
    { id: "ultra", name: "Ultra", price: 169, features: ["Priority Support", "Advanced Signals", "Full ICT Narration"] },
  ];

  const currentPrice = useMemo(() => {
    const p = PLANS.find(x => x.id === currentPlan);
    if (trial.active) return 0;
    return p ? p.price : 0;
  }, [currentPlan, trial.active]);

  useEffect(() => {
    if (mode === "upgrade" && !selectedPlanId) {
      const next = PLANS.find(p => p.price > currentPrice);
      if (next) {
        setSelectedPlanId(next.id);
      } else {
        // If they are already on the highest plan (Ultra), default to Ultra or their current plan
        // This ensures the button isn't disabled by default if no "next" plan exists.
        setSelectedPlanId(currentPlan || "pro");
      }
    }
  }, [mode, currentPlan, currentPrice, selectedPlanId]);

  const effAmount = useMemo(() => {
    if (mode === "upgrade" && selectedPlanId) {
      return PLANS.find(p => p.id === selectedPlanId)?.price ?? amount;
    }
    const c = Number(custom);
    return custom.trim() && Number.isFinite(c) ? Math.round(c * 100) / 100 : amount;
  }, [amount, custom, mode, selectedPlanId]);



  const loadOrders = useCallback(async () => {
    try {
      setOrders(await listFn());
    } catch { /* ignore */ }
  }, [listFn]);

  useEffect(() => { void loadOrders(); }, [loadOrders]);

  useEffect(() => {
    const seq = ++qSeq.current;
    const t = setTimeout(async () => {
      try {
        const q = await quoteFn({ data: { amountUsd: effAmount, code: code.trim() || null } });
        if (seq === qSeq.current) setQuote(q);
      } catch { /* ignore */ }
    }, 250);
    return () => clearTimeout(t);
  }, [effAmount, code, quoteFn]);

  const secondsLeft = useCountdown(order?.status === "pending" ? order.expires_at : null);
  useEffect(() => {
    if (order?.status === "pending" && secondsLeft === 0 && order.expires_at && new Date(order.expires_at).getTime() < Date.now()) {
      setOrder((o) => (o ? { ...o, status: "expired" } : o));
    }
  }, [secondsLeft, order?.status, order?.expires_at]);

  async function onCreate() {
    if (effAmount < 5) return toast.error("Minimum top-up is $5.");
    setBusy(true);
    try {
      const res: any = await createFn({ 
        data: { 
          amountUsd: effAmount, 
          network, 
          code: code.trim() || null,
          planId: mode === "upgrade" ? selectedPlanId : null
        } 
      });
      if (!res.ok) return toast.error(res.error);
      setOrder(res.order);
      setHash("");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not start the payment.");
    } finally {
      setBusy(false);
    }
  }


  async function onSubmitHash() {
    if (!order) return;
    if (hash.trim().length < 10) return toast.error("Enter the full transaction ID.");
    setBusy(true);
    try {
      const res: any = await submitFn({ data: { orderId: order.id, txHash: hash.trim() } });
      if (!res.ok) return toast.error(res.error);
      if (res.status === "approved") {
        toast.success("Payment verified — credits added to your wallet.");
        setOrder({ ...order, status: "approved", tx_hash: hash.trim() });
      } else {
        toast.message("Sent for review", { description: res.detail ?? "Our team will confirm shortly." });
        setOrder({ ...order, status: "needs_review", tx_hash: hash.trim() });
      }
      void loadOrders();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not submit the transaction.");
    } finally {
      setBusy(false);
    }
  }

  async function onRedeem() {
    if (!code.trim()) return toast.error("Enter a promo code.");
    setBusy(true);
    try {
      const res: any = await redeemFn({ data: { code: code.trim() } });
      if (!res.ok) return toast.error(res.error);
      toast.success(`$${Number(res.credited).toFixed(2)} added to your wallet.`);
      setCode("");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not redeem this code.");
    } finally {
      setBusy(false);
    }
  }

  const net = networkMeta(order?.network ?? network);
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  const pill =
    "inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-gc-line bg-background px-4 text-[14px] text-gc-ink transition-colors hover:bg-gc-surface disabled:opacity-50";
  const pillSolid =
    "inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-gc-blue px-5 text-[14px] font-medium text-gc-on-blue transition-colors hover:bg-gc-blue-hover disabled:opacity-50";
  const field =
    "h-10 rounded-lg border border-gc-line bg-background px-3 text-[14px] text-gc-ink outline-none placeholder:text-gc-ink-muted focus:border-gc-ink-muted";
  const choice = (active: boolean) =>
    `relative flex flex-col rounded-xl p-4 text-left transition-colors ${active ? "bg-gc-surface ring-1 ring-gc-ink" : "bg-gc-surface/60 hover:bg-gc-surface"}`;

  return (
    <div className="mx-auto w-full max-w-[930px] pb-10 pt-2 text-foreground" style={SANS}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-normal leading-tight tracking-tight text-gc-ink sm:text-[32px]">Payments</h1>
          <p className="mt-1 max-w-[560px] text-[14px] text-gc-ink-muted">
            {mode === "upgrade"
              ? "Pick a plan and pay with USDT on Tron, BNB Smart Chain or Ethereum."
              : "Send USDT on Tron, BNB Smart Chain or Ethereum. Credit lands in your wallet after on-chain verification."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            <TronIcon className="h-7 w-7 rounded-full ring-2 ring-background" />
            <BnbIcon className="h-7 w-7 rounded-full ring-2 ring-background" />
            <EthIcon className="h-7 w-7 rounded-full ring-2 ring-background" />
          </div>
          <Link to="/dashboard/billing" className={pill}>Billing</Link>
        </div>
      </div>

      {!order || order.status === "expired" ? (
        <>
          {/* What to buy */}
          <section className="mt-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-[20px] font-normal text-gc-ink">{mode === "upgrade" ? "Choose a plan" : "Choose an amount"}</h2>
              <div className="inline-flex rounded-full bg-gc-surface p-1" role="tablist">
                {(["upgrade", "topup"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="tab"
                    aria-selected={mode === m}
                    onClick={() => setMode(m)}
                    className={`rounded-full px-4 py-1.5 text-[13px] transition-colors ${mode === m ? "bg-background font-medium text-gc-ink shadow-sm" : "text-gc-ink-muted hover:text-gc-ink"}`}
                  >
                    {m === "upgrade" ? "Upgrade plan" : "Top-up credits"}
                  </button>
                ))}
              </div>
            </div>

            {mode === "upgrade" ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {PLANS.map((p) => {
                  // Renewing: the current plan stays selectable so it can be paid again.
                  const isCurrent = !renew && !trial.active && currentPlan === p.id;
                  const disabled = isCurrent;
                  const selected = selectedPlanId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => setSelectedPlanId(p.id)}
                      className={`${choice(selected)} ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[14px] font-medium text-gc-ink">{p.name}</span>
                        {isCurrent && <span className="rounded-full bg-background px-2 py-0.5 text-[11px] text-gc-success">Current</span>}
                      </div>
                      <div className="mt-2 text-[24px] tabular-nums text-gc-ink">${p.price}</div>
                      <ul className="mt-4 space-y-1.5">
                        {p.features.map((f) => (
                          <li key={f} className="flex items-center gap-2 text-[13px] text-gc-ink-muted">
                            <span className="h-1 w-1 shrink-0 rounded-full bg-gc-ink-muted" aria-hidden="true" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="mt-5 flex flex-wrap gap-2">
                {PRESET_AMOUNTS.map((a) => {
                  const active = !custom.trim() && amount === a;
                  return (
                    <button
                      key={a}
                      type="button"
                      onClick={() => { setAmount(a); setCustom(""); }}
                      className={`h-10 min-w-[84px] rounded-full px-4 text-[14px] tabular-nums transition-colors ${active ? "bg-gc-blue font-medium text-gc-on-blue" : "bg-gc-surface text-gc-ink hover:bg-gc-surface/70"}`}
                    >
                      ${a}
                    </button>
                  );
                })}
                <input
                  value={custom}
                  onChange={(e) => setCustom(e.target.value.replace(/[^0-9.]/g, ""))}
                  placeholder="Custom $"
                  inputMode="decimal"
                  aria-label="Custom amount"
                  className={`${field} w-32 rounded-full`}
                />
              </div>
            )}
          </section>

          {/* Network */}
          <section className="mt-12">
            <h2 className="text-[20px] font-normal text-gc-ink">Network</h2>
            <p className="mt-1 text-[14px] text-gc-ink-muted">USDT only. Pick the chain your wallet sends from.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {NETWORKS.map((n) => (
                <button key={n.id} type="button" onClick={() => setNetwork(n.id)} className={choice(network === n.id)}>
                  <span className="relative inline-flex w-fit">
                    <NetworkIcon id={n.id} className="h-8 w-8" />
                    <UsdtIcon className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full ring-2 ring-background" />
                  </span>
                  <span className="mt-3 text-[14px] font-medium text-gc-ink">{n.label}</span>
                  <span className="mt-0.5 text-[13px] text-gc-ink-muted">{n.note}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Promo + summary */}
          <section className="mt-12">
            <h2 className="text-[20px] font-normal text-gc-ink">Summary</h2>
            <div className="mt-5 overflow-hidden rounded-xl bg-gc-surface">
              <div className="flex flex-wrap items-center gap-2 p-5">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="Promo code"
                  aria-label="Promo code"
                  className={`${field} w-48 uppercase`}
                />
                <button type="button" onClick={onRedeem} disabled={busy} className={pill}>Redeem free credit</button>
                {quote?.error && <span className="text-[13px] text-destructive">{quote.error}</span>}
                {!quote?.error && quote?.promoCode && (
                  <span className="text-[13px] text-gc-success">
                    {quote.promoType === "discount"
                      ? `You pay $${quote.payUsd.toFixed(2)} and receive $${quote.creditUsd.toFixed(2)}`
                      : quote.promoType === "free"
                        ? `Free credit code — press "Redeem free credit"`
                        : `+$${quote.bonusUsd.toFixed(2)} bonus applied`}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-4 border-t border-gc-line p-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[14px] text-gc-ink-muted">You pay</p>
                  <div className="mt-1 flex items-center gap-2">
                    <UsdtIcon className="h-6 w-6" />
                    <span className="text-[28px] tabular-nums text-gc-ink">${(quote?.payUsd ?? effAmount).toFixed(2)}</span>
                  </div>
                  <p className="mt-1 text-[13px] text-gc-ink-muted">
                    {mode === "upgrade" ? (
                      <>Upgrade to <span className="text-gc-ink">{PLANS.find((p) => p.id === selectedPlanId)?.name}</span> plan</>
                    ) : (
                      <>You receive <span className="text-gc-ink">${(quote?.creditUsd ?? effAmount).toFixed(2)}</span> in credit</>
                    )}
                  </p>
                  {trial.active && mode === "upgrade" && (
                    <p className="mt-2 text-[13px] text-gc-ink-muted">This ends your free trial and starts the paid plan.</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onCreate}
                  disabled={busy || !!quote?.error || (mode === "upgrade" && !selectedPlanId)}
                  className={pillSolid}
                >
                  {mode === "upgrade" ? "Upgrade now" : "Continue to payment"}
                </button>
              </div>
            </div>
          </section>
        </>
      ) : (
        <section className="mt-8">
          <h2 className="text-[20px] font-normal text-gc-ink">Send payment</h2>
          <div className="mt-5 overflow-hidden rounded-xl bg-gc-surface">
            <div className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div className="flex items-center gap-3">
                <span className="relative inline-flex">
                  <NetworkIcon id={order.network} className="h-10 w-10" />
                  <UsdtIcon className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full ring-2 ring-background" />
                </span>
                <div>
                  <div className="text-[24px] tabular-nums text-gc-ink">{Number(order.pay_amount_usd).toFixed(2)} USDT</div>
                  <div className="text-[13px] text-gc-ink-muted">Send this exact amount — the cents identify your payment.</div>
                </div>
              </div>
              {order.status === "pending" && (
                <div className="text-right">
                  <div className="text-[12px] text-gc-ink-muted">Time left</div>
                  <div className="font-mono text-[22px] tabular-nums text-destructive">{mm}:{ss}</div>
                </div>
              )}
            </div>

            <div className="border-t border-gc-line p-5">
              <div className="text-[13px] text-gc-ink-muted">Deposit address ({net.label})</div>
              <div className="mt-2 flex items-center gap-2">
                <code className="min-w-0 flex-1 break-all rounded-lg bg-background px-3 py-2 text-[13px] text-gc-ink">{order.deposit_address}</code>
                <button
                  type="button"
                  onClick={() => { void navigator.clipboard.writeText(order.deposit_address); toast.success("Address copied"); }}
                  className={pill}
                >
                  Copy
                </button>
              </div>
              <p className="mt-2 text-[13px] text-gc-ink-muted">
                {order.is_upgrade ? (
                  <>Upgrade to <span className="uppercase text-gc-ink">{order.target_plan_id}</span> plan</>
                ) : (
                  <>Credit on approval: <span className="text-gc-ink">${Number(order.credit_usd).toFixed(2)}</span>
                  {Number(order.bonus_usd) > 0 && <> · bonus ${Number(order.bonus_usd).toFixed(2)}</>}</>
                )}
              </p>
              <p className="mt-1 text-[13px] text-amber-700 dark:text-amber-400">
                Only send {net.asset} on {net.chain}. Other assets or networks cannot be recovered.
              </p>
            </div>

            <div className="border-t border-gc-line p-5">
              <p className="text-[14px] text-gc-ink">Status: <span className="text-gc-ink-muted">{statusLabel(order.status)}</span></p>
              {order.status === "approved" ? (
                <p className="mt-2 text-[13px] text-gc-success">Payment confirmed — ${Number(order.credit_usd).toFixed(2)} added to your wallet.</p>
              ) : order.status === "needs_review" ? (
                <p className="mt-2 text-[13px] text-gc-ink-muted">We couldn't auto-confirm it yet. Our team reviews it manually and you'll get an email either way.</p>
              ) : (
                <>
                  <p className="mt-2 text-[13px] text-gc-ink-muted">After sending, paste the transaction ID (hash) below.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <input
                      value={hash}
                      onChange={(e) => setHash(e.target.value.trim())}
                      placeholder="Transaction ID / hash"
                      aria-label="Transaction ID"
                      className={`${field} min-w-0 flex-1`}
                    />
                    <button type="button" onClick={onSubmitHash} disabled={busy} className={pillSolid}>Verify payment</button>
                  </div>
                </>
              )}
              <button
                type="button"
                onClick={async () => {
                  if (order.status === "pending") await cancelFn({ data: { orderId: order.id } });
                  setOrder(null);
                  void loadOrders();
                }}
                className="mt-4 text-[13px] text-gc-ink-muted underline underline-offset-4 hover:text-gc-ink"
              >
                {order.status === "pending" ? "Cancel and start over" : "Make another payment"}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* History */}
      <section className="mt-12">
        <h2 className="text-[20px] font-normal text-gc-ink">Payment history</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-[14px]">
            <thead>
              <tr className="border-b border-gc-line text-[12px] text-gc-ink-muted">
                <th className="py-3 pr-3 font-normal">Date</th>
                <th className="py-3 pr-3 font-normal">Paid</th>
                <th className="py-3 pr-3 font-normal">Credit</th>
                <th className="py-3 pr-3 font-normal">Network</th>
                <th className="py-3 font-normal">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gc-line">
              {orders.length === 0 ? (
                <tr><td colSpan={5} className="py-4 text-center text-gc-ink-muted">No payments yet.</td></tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id}>
                    <td className="py-3 pr-3 text-gc-ink-muted">{new Date(o.created_at).toLocaleDateString()}</td>
                    <td className="py-3 pr-3 tabular-nums text-gc-ink">${Number(o.pay_amount_usd).toFixed(2)}</td>
                    <td className="py-3 pr-3 tabular-nums text-gc-ink">${Number(o.credit_usd).toFixed(2)}</td>
                    <td className="py-3 pr-3 text-gc-ink">
                      <span className="inline-flex items-center gap-1.5">
                        <NetworkIcon id={o.network} className="h-4 w-4" />
                        {networkMeta(o.network).label}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={o.status === "approved" ? "text-gc-success" : o.status === "rejected" ? "text-destructive" : "text-gc-ink-muted"}>
                        {statusLabel(o.status)}
                      </span>
                      {o.reject_reason && <div className="text-[12px] text-destructive">{o.reject_reason}</div>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
