import { useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useCredits } from "@/hooks/useCredits";
import { useTrial } from "@/hooks/useTrial";
import { cancelMyPlan } from "@/lib/subscription.functions";
import { redeemFreeCode } from "@/lib/payments.functions";
import InvoiceHistory from "@/components/billing/InvoiceHistory";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Info } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/billing")({
  head: () => ({
    meta: [
      { title: "Billing — Jenvu" },
      { name: "description", content: "Manage your Jenvu plan, wallet balance, payments, invoices, and billing preferences." },
      { property: "og:title", content: "Billing — Jenvu" },
      { property: "og:description", content: "Manage your Jenvu plan, wallet balance, payments, invoices, and billing preferences." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: Billing,
});

const MONO = "font-sans";

type BillingRow = {
  id: string;
  created_at: string;
  model: string | null;
  stage: string | null;
  reason: string;
  delta: number;
  promptTokens: number | null;
  completionTokens: number | null;
  scanId: string | null;
  metadata: Record<string, unknown> | null;
};

const pill =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-gc-line bg-background px-4 text-[14px] text-gc-ink transition-colors hover:bg-gc-surface disabled:opacity-50";
const pillSolid =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-gc-blue px-4 text-[14px] font-medium text-gc-on-blue transition-colors hover:bg-gc-blue-hover disabled:opacity-50";
const field =
  "h-10 w-full rounded-lg border border-gc-line bg-background px-3 text-[14px] text-gc-ink outline-none focus:border-gc-ink-muted";

function Billing() {
  const credits = useCredits();
  const trial = useTrial();
  const cancelPlan = useServerFn(cancelMyPlan);
  const redeemPromotion = useServerFn(redeemFreeCode);

  const [promoOpen, setPromoOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancellingPlan, setCancellingPlan] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [redeemingPromo, setRedeemingPromo] = useState(false);
  const [prefs, setPrefs] = useState(() => {
    try { return JSON.parse(localStorage.getItem("jenvu-billing-prefs") ?? "{}"); } catch { return {}; }
  });
  const updatePref = (key: string, value: string) => {
    setPrefs((p: Record<string, string>) => {
      const next = { ...p, [key]: value };
      try { localStorage.setItem("jenvu-billing-prefs", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const allRows: BillingRow[] = useMemo(() => (credits.state?.recent ?? [])
    .filter((r) => r.delta < 0)
    .map((r) => ({
      id: r.id,
      created_at: r.created_at,
      model: r.model ?? null,
      stage: r.stage ?? null,
      reason: r.reason,
      delta: Number(r.delta),
      promptTokens: r.prompt_tokens ?? null,
      completionTokens: r.completion_tokens ?? null,
      scanId: (r.metadata?.scanId as string | undefined) ?? null,
      metadata: (r.metadata as Record<string, unknown> | undefined) ?? null,
    })), [credits.state?.recent]);

  const handleCancelPlan = async () => {
    setCancellingPlan(true);
    try {
      const result = await cancelPlan();
      if (!result.ok) {
        toast.error(result.error === "NO_ACTIVE_PLAN" ? "No active plan was found." : "Could not cancel your plan.");
        return;
      }
      setCancelDialogOpen(false);
      await credits.refresh();
      toast.success("Plan cancelled", {
        description: `Your paid features were removed${Number(result.credits_removed ?? 0) > 0 ? ` and $${Number(result.credits_removed).toFixed(2)} in credits were forfeited` : ""}.`,
      });
    } catch (error) {
      toast.error("Could not cancel your plan", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setCancellingPlan(false);
    }
  };

  const handleRedeemPromotion = async () => {
    const code = promoCode.trim();
    if (!code || redeemingPromo) return;
    setRedeemingPromo(true);
    try {
      const result = await redeemPromotion({ data: { code } });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setPromoCode("");
      await credits.refresh();
      toast.success(`$${Number(result.credited).toFixed(2)} promotional credit added.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not apply this promotion.");
    } finally {
      setRedeemingPromo(false);
    }
  };

  // A cancelled account legitimately has no current plan. Only wait for the
  // credit request itself; treating a null plan as loading caused an endless
  // skeleton immediately after cancellation.
  const isLoading = credits.isLoading && !credits.state;

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-[930px] space-y-8 pt-2">
        <div className="h-9 w-28 animate-pulse rounded bg-gc-surface" />
        <div className="h-8 w-full animate-pulse rounded bg-gc-surface" />
        <div className="h-40 w-full animate-pulse rounded-xl bg-gc-surface" />
      </div>
    );
  }

  // Use the same resolved, cached response as the balance. An independent
  // subscription request started at null on every visit and flashed the CTA.
  const plan = credits.plan && credits.plan.id !== "free" ? credits.plan.id : null;
  const planLabel = trial.active ? "Pay as you go" : plan ? "Pay as you go" : "Pay as you go";
  const remaining = credits.balance;

  void allRows;
  const grants = credits.state?.grants ?? [];
  const promotions = credits.state?.promotions ?? [];
  const hasCredit = Number(remaining) > 0;
  const fmtDay = (iso: string) => new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  const prefField = (key: string, placeholder: string, type = "text") => (
    <input type={type} placeholder={placeholder} value={prefs[key] ?? ""} onChange={(e) => updatePref(key, e.target.value)} className={field} />
  );

  return (
    <div className="mx-auto w-full max-w-[930px] pb-10 pt-2 text-foreground">
      <h1 className="text-[28px] font-normal leading-tight tracking-tight text-gc-ink sm:text-[32px]">Billing</h1>

      {/* Spend management */}
      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[20px] font-normal text-gc-ink">Spend management</h2>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setPromoOpen((v) => !v)} className={pill} aria-expanded={promoOpen}>
              Redeem promo code
            </button>
            <Link to="/dashboard/usage" className={pill}>View usage</Link>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-xl bg-gc-surface">
          <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-[14px] font-medium text-gc-ink">Credits</p>
              <p className="mt-2 text-[14px] text-gc-ink-muted">Your total credit balance, including free credits granted to your account.</p>
              <p className="mt-5 text-[24px] tabular-nums text-gc-ink">${Number(remaining).toFixed(2)}</p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {plan ? (
                <button type="button" onClick={() => setCancelDialogOpen(true)} className={pill}>Cancel plan</button>
              ) : (
                <Link to="/pricing" className={pill}>Choose a plan</Link>
              )}
              <Link to="/dashboard/pay" search={{ purchase: "credits" }} className={pillSolid}>Add credits</Link>
            </div>
          </div>

          {promoOpen && (
            <div className="flex flex-col gap-2 border-t border-gc-line px-5 py-4 sm:flex-row sm:items-center">
              <input
                placeholder="Enter promo code"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void handleRedeemPromotion(); }}
                className={`${field} sm:max-w-sm`}
                autoFocus
              />
              <button type="button" disabled={!promoCode.trim() || redeemingPromo} onClick={() => void handleRedeemPromotion()} className={pillSolid}>
                {redeemingPromo ? "Applying…" : "Apply"}
              </button>
            </div>
          )}

          <div className="space-y-1.5 border-t border-gc-line px-5 py-4 text-[14px] text-gc-ink-muted">
            <p className="flex items-center gap-2.5">
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${hasCredit ? "bg-gc-success" : "bg-destructive"}`} aria-hidden="true" />
              {hasCredit ? (
                <span>You have <span className="text-gc-ink">${Number(remaining).toFixed(2)} credits</span> remaining</span>
              ) : (
                <span>You have <span className="text-gc-ink">no credits</span> remaining</span>
              )}
            </p>
            {trial.active && (
              <p className="pl-4 text-[13px]">
                14-day Pro access ends {trial.endsAtLabel} · {trial.daysLeft > 1 ? `${trial.daysLeft}d left` : trial.hoursLeft > 1 ? `${trial.hoursLeft}h left` : "ends today"} · remaining trial credit becomes $0.00
              </p>
            )}
            <p className="flex items-center gap-2 pl-4 text-[13px]">
              <Info className="h-3.5 w-3.5 shrink-0" />
              Chat and primary-only analysis cost $0.03; completed senior-reviewed analysis costs $0.20.
            </p>
          </div>
        </div>
      </section>

      <AlertDialog open={cancelDialogOpen} onOpenChange={(open) => !cancellingPlan && setCancelDialogOpen(open)}>
        <AlertDialogContent className="max-w-md rounded-xl border-zinc-200 bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-zinc-900">Cancel your plan?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 text-zinc-600">
              <span className="block">This action takes effect immediately. You will lose your remaining credits and all paid plan features.</span>
              <span className="block font-medium text-rose-600">Your current ${Number(remaining).toFixed(2)} credit balance will become $0.00.</span>
              <span className="block">Are you sure you want to continue?</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancellingPlan}>Keep plan</AlertDialogCancel>
            <AlertDialogAction
              disabled={cancellingPlan}
              onClick={(event) => {
                event.preventDefault();
                void handleCancelPlan();
              }}
              className="bg-rose-600 text-white hover:bg-rose-700"
            >
              {cancellingPlan ? "Cancelling…" : "Cancel plan permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Payment details */}
      <section className="mt-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[20px] font-normal text-gc-ink">Payment details</h2>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setDetailsOpen((v) => !v)} className={pill} aria-expanded={detailsOpen}>
              {detailsOpen ? "Hide billing details" : "Add billing details"}
            </button>
            <Link to="/dashboard/pay" className={pillSolid}>Add payment method</Link>
          </div>
        </div>
        <p className="mt-4 text-[14px] text-gc-ink-muted">Add billing details to appear on your invoices.</p>

        {detailsOpen && (
          <div className="mt-5 grid gap-3 rounded-xl bg-gc-surface p-5 sm:grid-cols-2">
            {prefField("companyName", "Company name")}
            {prefField("billingEmail", "Billing email", "email")}
            {prefField("poNumber", "Purchase order (PO) number")}
            <select value={prefs.country ?? ""} onChange={(e) => updatePref("country", e.target.value)} className={field}>
              <option value="">Select country</option>
              {["Pakistan", "United States", "United Kingdom", "United Arab Emirates", "Saudi Arabia", "India", "Germany", "Canada", "Australia"].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            {prefField("address1", "Address line 1")}
            {prefField("address2", "Address line 2")}
            {prefField("city", "City")}
            {prefField("postalCode", "Postal code")}
            <div className="sm:col-span-2">{prefField("region", "State, county, province, or region")}</div>
            <p className="text-[12px] text-gc-ink-muted sm:col-span-2">Saved on this browser and used for future invoices only.</p>
          </div>
        )}

        <div className="mt-5">
          <div className="flex justify-between border-b border-gc-line py-3 text-[12px] text-gc-ink-muted">
            <span>Card</span>
            <span>Expiry</span>
          </div>
          <p className="px-2 py-4 text-center text-[14px] text-gc-ink-muted">No payment methods. Payments are made in crypto from the Payments page.</p>
        </div>
      </section>

      {/* Credit grants */}
      <section className="mt-12">
        <h2 className="text-[20px] font-normal text-gc-ink">Credit grants</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-[14px]">
            <thead>
              <tr className="border-b border-gc-line text-[12px] text-gc-ink-muted">
                <th className="px-2 py-3 first:pl-0 last:pr-0 font-normal">Grant</th>
                <th className="px-2 py-3 first:pl-0 last:pr-0 font-normal">Date</th>
                <th className="px-2 py-3 first:pl-0 last:pr-0 text-right font-normal">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gc-line">
              {grants.length === 0 && promotions.length === 0 ? (
                <tr><td colSpan={3} className="px-2 py-4 text-center text-gc-ink-muted">No credit grants found.</td></tr>
              ) : (
                <>
                  {grants.map((g) => (
                    <tr key={g.id}>
                      <td className="px-2 py-3 first:pl-0 last:pr-0 text-gc-ink">{g.reason.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ")}</td>
                      <td className="px-2 py-3 first:pl-0 last:pr-0 text-gc-ink-muted">{fmtDay(g.createdAt)}</td>
                      <td className="px-2 py-3 first:pl-0 last:pr-0 text-right tabular-nums text-gc-success">+${g.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                  {promotions.map((pr) => (
                    <tr key={pr.id}>
                      <td className={`${MONO} px-2 py-3 first:pl-0 last:pr-0 text-gc-ink`}>Promo code {pr.code}</td>
                      <td className="px-2 py-3 first:pl-0 last:pr-0 text-gc-ink-muted">{fmtDay(pr.createdAt)}</td>
                      <td className="px-2 py-3 first:pl-0 last:pr-0 text-right tabular-nums text-gc-success">+${pr.bonusUsd.toFixed(2)}</td>
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Invoices */}
      <div className="mt-12">
        <InvoiceHistory variant="table" />
      </div>
    </div>
  );
}
