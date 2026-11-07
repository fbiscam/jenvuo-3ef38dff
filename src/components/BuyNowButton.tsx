import * as React from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useAuthUser } from "@/hooks/useAuthUser";
import { getFoundingMembership } from "@/lib/mt5-licenses.functions";
import { purchaseGate, type PurchaseGate } from "@/lib/founding-bot";

/**
 * Shared plan CTA: signed out it reads "Apply now" (Founding form); signed in it reads
 * "Buy now". Buying needs a verified Founding ID, so an unverified click shows a toast
 * notice instead of the payment page (the server refuses the purchase too).
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
        .then((r) => purchaseGate({ isAdmin: !!r.isAdmin, member: !!r.member, verified: !!r.verified }))
        .catch(() => {
          cache.delete(uid);
          return { canBuy: false, reason: "apply" } as PurchaseGate;
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
    text: "Plans and credit can be bought once your ID is approved. Upload your ID; the review usually takes less than a day.",
    cta: "Verify ID now",
    to: "/dashboard/documents" as const,
  },
  apply: {
    title: "Founding members only",
    text: "Plans are available to approved Founding Program members. Apply now; seats are limited each month.",
    cta: "Apply now",
    to: "/founding" as const,
  },
};

/**
 * Toast notice (same look as the "copied" / cancel-plan notices). No modal: a dialog
 * locks page scroll, which made the pricing page shift when Buy now was clicked.
 */
export function showBuyBlocked(reason: "verify_id" | "apply", go: (to: "/dashboard/documents" | "/founding") => void) {
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
  applyLabel = "Apply now",
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
      <Link to="/founding" className={className}>
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
          else showBuyBlocked(gate.reason !== "ok" ? gate.reason : "apply", (t) => navigate({ to: t }));
        }}
      >
        {buyLabel}
        {children}
      </button>
    </>
  );
}
