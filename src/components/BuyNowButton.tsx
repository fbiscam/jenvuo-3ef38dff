import * as React from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useAuthUser } from "@/hooks/useAuthUser";
import { getFoundingMembership } from "@/lib/mt5-licenses.functions";
import { purchaseGate, type PurchaseGate } from "@/lib/founding-bot";

/**
 * Shared plan CTA: signed out it reads "Sign up" (sign-up form, free trial); signed in it reads
 * "Buy now". Plans are open to everyone; only approved Founding members still waiting on ID
 * get a toast notice instead of the payment page (the server refuses the purchase too).
 */

const cache = new Map<string, Promise<PurchaseGate>>();

export function useBuyGate(): { signedIn: boolean; loading: boolean; gate: PurchaseGate | null } {
  const { user, loading } = useAuthUser();
  const fetchMembership = useServerFn(getFoundingMembership);
  const [gate, setGate] = React.useState<PurchaseGate | null>(null);
  const uid = user?.id ?? null;
  React.useEffect(() => {
    if (!uid) {
      setGate(null);
      return;
    }
    let alive = true;
    let p = cache.get(uid);
    if (!p) {
      p = fetchMembership()
        .then((r) => purchaseGate({ isAdmin: !!r.isAdmin, member: !!r.member, verified: !!r.verified, kind: "plan" }))
        .catch(() => {
          cache.delete(uid);
          // The payment server checks again, so a failed lookup just opens Payments.
          return { canBuy: true, reason: "ok" } as PurchaseGate;
        });
      cache.set(uid, p);
      // Refresh on the next mount after a short while (ID may get approved meanwhile).
      setTimeout(() => cache.delete(uid), 30_000);
    }
    p.then((g) => alive && setGate(g));
    return () => {
      alive = false;
    };
  }, [uid, fetchMembership]);
  return { signedIn: !!uid, loading: loading || (!!uid && gate === null), gate };
}

const COPY = {
  verify_id: {
    title: "Verify your ID to buy",
    text: "Your Founding plan starts once your ID is approved. Upload your ID; the review usually takes less than a day.",
    cta: "Verify ID now",
    to: "/dashboard/documents" as const,
  },
  no_topup: {
    title: "Plans only",
    text: "Credit top-ups are no longer offered. Pick a plan instead.",
    cta: "See plans",
    to: "/dashboard/pay" as const,
  },
};

/**
 * Toast notice (same look as the "copied" / cancel-plan notices). No modal: a dialog
 * locks page scroll, which made the pricing page shift when Buy now was clicked.
 */
export function showBuyBlocked(reason: Exclude<PurchaseGate["reason"], "ok">, go: (to: "/dashboard/documents" | "/dashboard/pay") => void) {
  const c = COPY[reason];
  toast.info(c.title, {
    id: "buy-blocked",
    duration: 6000,
    action: { label: c.cta, onClick: () => go(c.to) },
  });
}

export function BuyNowButton({
  className,
  to = "/dashboard/pay",
  buyLabel = "Buy now",
  applyLabel = "Sign up",
  children,
}: {
  className: string;
  to?: "/dashboard/pay" | "/pricing";
  buyLabel?: React.ReactNode;
  applyLabel?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const { signedIn, gate } = useBuyGate();
  const navigate = useNavigate();
  if (!signedIn) {
    return (
      <Link to="/auth" search={{ mode: "signup" } as never} className={className}>
        {applyLabel}
        {children}
      </Link>
    );
  }
  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => {
          if (!gate) return;
          if (gate.canBuy) navigate({ to });
          else showBuyBlocked(gate.reason !== "ok" ? gate.reason : "verify_id", (t) => navigate({ to: t }));
        }}
      >
        {buyLabel}
        {children}
      </button>
    </>
  );
}
