import * as React from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck, Sparkles, X } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useAuthUser } from "@/hooks/useAuthUser";
import { getFoundingMembership } from "@/lib/mt5-licenses.functions";
import { purchaseGate, type PurchaseGate } from "@/lib/founding-bot";

/**
 * Shared plan CTA: signed out it reads "Apply now" (Founding form); signed in it reads
 * "Buy now". Buying needs a verified Founding ID, so an unverified click opens a themed
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

export function BuyBlockedDialog({ open, onOpenChange, reason }: { open: boolean; onOpenChange: (v: boolean) => void; reason: "verify_id" | "apply" }) {
  const c = COPY[reason];
  const Icon = reason === "verify_id" ? ShieldCheck : Sparkles;
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[80] bg-foreground/30 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed left-1/2 top-1/2 z-[81] w-[calc(100%-2rem)] max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-gc-line bg-background p-7 text-center shadow-xl outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-full p-1.5 text-gc-ink-muted transition hover:bg-gc-surface hover:text-gc-ink" aria-label="Close">
            <X className="h-4 w-4" />
          </DialogPrimitive.Close>
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gc-surface">
            <Icon className="h-5 w-5 text-gc-ink" aria-hidden="true" />
          </span>
          <DialogPrimitive.Title className="mt-4 text-[20px] font-medium tracking-tight text-gc-ink">{c.title}</DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-2 text-[14px] leading-relaxed text-gc-ink-muted">{c.text}</DialogPrimitive.Description>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link
              to={c.to}
              onClick={() => onOpenChange(false)}
              className={
                reason === "verify_id"
                  ? "verify-cta inline-flex h-10 items-center justify-center gap-1.5 rounded-full px-5 text-[14px] font-medium transition-opacity hover:opacity-90"
                  : "inline-flex h-10 items-center justify-center rounded-full bg-foreground px-5 text-[14px] font-medium text-background transition-opacity hover:opacity-90"
              }
            >
              {reason === "verify_id" && <ShieldCheck className="h-4 w-4" aria-hidden="true" />}
              {c.cta}
            </Link>
            <DialogPrimitive.Close className="inline-flex h-10 items-center justify-center rounded-full bg-gc-pill px-5 text-[14px] font-medium text-foreground transition hover:brightness-95">
              Not now
            </DialogPrimitive.Close>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
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
  const [open, setOpen] = React.useState(false);
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
          else setOpen(true);
        }}
      >
        {buyLabel}
        {children}
      </button>
      <BuyBlockedDialog open={open} onOpenChange={setOpen} reason={gate && gate.reason !== "ok" ? gate.reason : "apply"} />
    </>
  );
}
