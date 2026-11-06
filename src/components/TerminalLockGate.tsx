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
      text={`Submit it by ${when} (${formatLeft(left)} left) to keep the Terminal unlocked.`}
      action="Verify ID now"
    />
  );
}

/**
 * One themed ID-verification notice (rounded strip, small text, pill button). Both the
 * Founding 2-day deadline and the general "verify identity" banner use it.
 */
export function VerifyNotice({ tone = "info", title, text, action }: { tone?: "info" | "warn" | "error"; title: string; text: string; action: string }) {
  const dot = tone === "error" ? "bg-destructive" : tone === "warn" ? "bg-gc-warning" : "bg-gc-ink-muted";
  return (
    <div className="mb-4 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 rounded-full border border-gc-line bg-gc-surface py-1.5 pl-4 pr-1.5 max-sm:rounded-2xl">
      <span className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-background">
        <ShieldAlert className="h-3.5 w-3.5 text-gc-ink" aria-hidden="true" />
        <span className={`absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full ring-2 ring-gc-surface ${dot}`} aria-hidden="true" />
      </span>
      <p className="min-w-0 text-[12.5px] leading-snug text-gc-ink line-clamp-2 sm:line-clamp-none sm:truncate">
        <span className="font-medium">{title}</span>
        <span className="text-gc-ink-muted"> — {text}</span>
      </p>
      <Link
        to="/dashboard/documents"
        className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-gc-blue-deep px-3.5 text-[12.5px] font-medium text-gc-on-blue transition-opacity hover:opacity-90"
      >
        <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
        {action}
      </Link>
    </div>
  );
}

/** Whether the Founding ID-deadline notice is showing (then the general banner is hidden). */
export function showsIdDeadline(access: TerminalAccessState): boolean {
  return !access.loading && access.allowed && access.reason === "founding" && !!access.idDeadline;
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

export function TerminalLocked({ reason }: { reason?: string | null }) {
  const overdue = reason === "id_overdue";
  return (
    <div className="flex h-full w-full items-center justify-center bg-white px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100">
          <Lock className="h-5 w-5 text-zinc-700" />
        </div>
        <h1 className="mt-4 text-xl font-semibold text-zinc-900">Terminal is locked</h1>
        <p className="mt-2 text-sm text-zinc-600">
          {overdue
            ? "Your 2-day window to complete ID verification has ended. Submit your ID verification and the Terminal unlocks again automatically."
            : "The Terminal is reserved for approved Founding Program members, free of cost. Plans and credit cover JX Bot for MT5 and the Top AI Models; every other page stays open."}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Link
            to={overdue ? "/dashboard/documents" : "/founding"}
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            {overdue ? "Verify ID now" : "Apply for Founding"}
          </Link>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
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
