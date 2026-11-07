import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Lock, ShieldAlert, ShieldCheck } from "lucide-react";
import { getTerminalAccess } from "@/lib/terminal-access.functions";

export type TerminalAccessState = {
  loading: boolean;
  allowed: boolean;
  reason: string | null;
  idDeadline: string | null;
  idSubmitted: boolean;
  trialEndsAt: string | null;
};

const INITIAL: TerminalAccessState = { loading: true, allowed: false, reason: null, idDeadline: null, idSubmitted: false, trialEndsAt: null };

/** Terminal access for the signed-in user (approved Founding members and admins). */
export function useTerminalAccess(userId: string | null | undefined): TerminalAccessState {
  const fetchAccess = useServerFn(getTerminalAccess);
  const [state, setState] = useState<TerminalAccessState>(INITIAL);
  useEffect(() => {
    if (!userId) {
      setState(INITIAL);
      return;
    }
    let cancelled = false;
    const load = () =>
      fetchAccess()
        .then(
          (r) =>
            !cancelled &&
            setState({
              loading: false,
              allowed: Boolean(r?.allowed),
              reason: r?.reason ?? null,
              idDeadline: r?.idDeadline ?? null,
              idSubmitted: Boolean(r?.idSubmitted),
              trialEndsAt: r?.trialEndsAt ?? null,
            }),
        )
        // A failed poll (network blip, slow reply) must not lock out a user who
        // was already allowed — keep the previous state and try again next minute.
        .catch(() => !cancelled && setState((s) => ({ ...s, loading: false })));
    setState((s) => ({ ...s, loading: true }));
    load();
    // Re-check every minute so the lock applies as soon as the 2-day window ends.
    const t = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [userId, fetchAccess]);
  return state;
}

function formatLeft(ms: number) {
  if (ms <= 0) return "0m";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  return `${h}h ${m}m`;
}

/** Notice shown to approved Founding members who still need to verify their ID. */
export function IdVerificationDeadlineNotice({ access }: { access: TerminalAccessState }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  if (!showsIdDeadline(access) || !access.idDeadline) return null;
  const deadline = Date.parse(access.idDeadline);
  const left = deadline - now;
  const when = new Date(deadline).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  return (
    <VerifyNotice
      tone="warn"
      title="Verify your ID"
      text={`Send it by ${when} (${formatLeft(left)} left). The Terminal and JX Bot open once it is approved.`}
      action="Verify ID now"
    />
  );
}

/**
 * One themed ID-verification notice (rounded strip, small text, pill button). Both the
 * Founding 2-day deadline and the general "verify identity" banner use it.
 */
export function VerifyNotice({ tone = "info", title, text, action }: { tone?: "info" | "warn" | "error"; title: string; text: string; action: string }) {
  const dot = tone === "error" ? "bg-destructive" : tone === "warn" ? "bg-gc-amber" : "bg-gc-ink-muted";
  return (
    <div className="verify-notice mx-auto mb-5 flex w-full max-w-[930px] items-center gap-3.5 rounded-xl border border-gc-line bg-gc-surface px-4 py-3 max-sm:flex-wrap sm:gap-4 sm:px-5">
      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gc-line bg-background">
        <ShieldAlert className="h-4 w-4 text-gc-ink" aria-hidden="true" />
        <span className={`absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full ring-2 ring-gc-surface ${dot}`} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-medium leading-snug text-gc-ink">{title}</p>
        <p className="mt-0.5 text-[13px] leading-snug text-gc-ink-muted">{text}</p>
      </div>
      <Link
        to="/dashboard/documents"
        className="verify-cta inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full px-4 text-[13px] font-medium transition-opacity hover:opacity-90 max-sm:w-full"
      >
        <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
        {action}
      </Link>
    </div>
  );
}

/** Whether the Founding ID-deadline notice is showing (then the general banner is hidden). */
export function showsIdDeadline(access: TerminalAccessState): boolean {
  return !access.loading && !access.allowed && access.reason === "id_required" && !!access.idDeadline;
}

/** Small banner while the Pro free trial is running. */
export function TerminalTrialNotice({ access }: { access: TerminalAccessState }) {
  if (access.loading || !access.allowed || access.reason !== "trial" || !access.trialEndsAt) return null;
  const left = Date.parse(access.trialEndsAt) - Date.now();
  return (
    <div className="mb-3 flex flex-col gap-3 rounded-md border border-gc-line bg-gc-blue-soft px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm text-gc-ink">
        <strong>Free Terminal trial:</strong> {formatLeft(left)} left (until {new Date(access.trialEndsAt).toLocaleDateString()}). Upgrade to keep using the Terminal after that.
      </span>
      <Link to="/pricing" className="inline-flex shrink-0 items-center justify-center rounded-full bg-gc-blue px-4 py-2 text-xs font-semibold text-gc-on-blue hover:bg-gc-blue-hover">
        Upgrade
      </Link>
    </div>
  );
}

const LOCK_COPY: Record<string, { title: string; text: string; cta: string; to: "/dashboard/documents" | "/founding" | "/dashboard/pay" }> = {
  id_required: {
    title: "Verify your ID to open the Terminal",
    text: "Your Founding application is approved. Send your ID within 2 days; the Terminal and JX Bot open as soon as it is approved.",
    cta: "Verify ID now",
    to: "/dashboard/documents",
  },
  id_pending: {
    title: "Your ID is being reviewed",
    text: "Thanks, we have your documents. The Terminal and JX Bot open automatically once your ID is approved.",
    cta: "View documents",
    to: "/dashboard/documents",
  },
  id_overdue: {
    title: "Terminal is locked",
    text: "Your 2-day window to send your ID has ended. Send it now and the Terminal opens once it is approved.",
    cta: "Verify ID now",
    to: "/dashboard/documents",
  },
  founding_ended: {
    title: "Your Founding month has ended",
    text: "Your 30 days are over, so the Terminal, JX Bot and Founding credit are closed. Buy a plan to open them again; it starts once your payment is approved.",
    cta: "Buy a plan",
    to: "/dashboard/pay",
  },
  not_founding: {
    title: "Terminal is locked",
    text: "The Terminal is only for approved Founding Program members whose ID is verified.",
    cta: "Apply for Founding",
    to: "/founding",
  },
};

export function TerminalLocked({ reason }: { reason?: string | null }) {
  const copy = LOCK_COPY[reason || ""] ?? LOCK_COPY.not_founding;
  return (
    <div className="flex h-full w-full items-center justify-center bg-white px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100">
          <Lock className="h-5 w-5 text-zinc-700" />
        </div>
        <h1 className="mt-4 text-xl font-semibold text-zinc-900">{copy.title}</h1>
        <p className="mt-2 text-sm text-zinc-600">{copy.text}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Link
            to={copy.to}
            className={copy.to === "/dashboard/documents" ? "verify-cta inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold" : "inline-flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"}
          >
            {copy.cta}
          </Link>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export function TerminalChecking() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-white text-sm text-zinc-500">
      Checking access…
    </div>
  );
}
