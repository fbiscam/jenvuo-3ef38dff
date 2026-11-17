import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { getTerminalAccess } from "@/lib/terminal-access.functions";
import { BANNER_PRIORITY, useBannerSlot } from "@/lib/banner-slot";

export type TerminalAccessState = {
  loading: boolean;
  allowed: boolean;
  reason: string | null;
  idDeadline: string | null;
  idSubmitted: boolean;
  trialEndsAt: string | null;
};

const INITIAL: TerminalAccessState = { loading: true, allowed: false, reason: null, idDeadline: null, idSubmitted: false, trialEndsAt: null };

/** Terminal access state for the signed-in user (the Terminal is open to everyone; reason drives notices). */
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
      title={`Verify your ID · ${formatLeft(left)} left`}
      text={`Send it by ${when}. Your Founding plan starts once it is approved.`}
      action="Verify ID now"
    />
  );
}

/**
 * One ID-verification notice: a slim strip in the dashboard's top notice spot (where the
 * 2FA reminder shows), no box or border, green pill button. Shares the one-notice slot so
 * it never stacks with the 2FA / announcement strips.
 */
export function VerifyNotice({ tone = "info", title, text, action }: { tone?: "info" | "warn" | "error"; title: string; text: string; action: string }) {
  const active = useBannerSlot("verifyId", BANNER_PRIORITY.verify, true);
  if (!active) return null;
  const dot = tone === "error" ? "bg-destructive" : tone === "warn" ? "bg-gc-amber" : "bg-gc-green";
  return (
    <section className="verify-notice grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 bg-transparent py-1.5 pl-3.5 pr-4 sm:gap-x-4 sm:pl-5 md:pr-5">
      <span className="relative flex h-4 w-4 shrink-0 items-center justify-center">
        <ShieldAlert className="h-4 w-4 text-gc-ink-muted" aria-hidden="true" />
        <span className={`absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden="true" />
      </span>
      <p className="min-w-0 line-clamp-2 text-[12px] leading-snug text-gc-ink sm:line-clamp-none sm:truncate sm:text-[12.5px]">
        <span className="font-medium">{title}</span>
        <span className="text-gc-ink-muted"> — {text}</span>
      </p>
      <Link
        to="/dashboard/documents"
        className="verify-cta inline-flex h-7 shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-full px-3 text-[12px] font-medium transition-opacity hover:opacity-90"
      >
        <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
        {action}
      </Link>
    </section>
  );
}

/** Whether the Founding ID-deadline notice is showing (then the general banner is hidden). */
export function showsIdDeadline(access: TerminalAccessState): boolean {
  return !access.loading && access.reason === "id_required" && !!access.idDeadline;
}

/** Small banner while the Pro free trial is running. */
export function TerminalTrialNotice({ access }: { access: TerminalAccessState }) {
  if (access.loading || !access.allowed || access.reason !== "trial" || !access.trialEndsAt) return null;
  const left = Date.parse(access.trialEndsAt) - Date.now();
  return (
    <div className="mb-3 flex flex-col gap-3 rounded-md border border-gc-line bg-gc-blue-soft px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm text-gc-ink">
        <strong>Free Terminal trial:</strong> {formatLeft(left)} left (until {new Date(access.trialEndsAt).toLocaleDateString()}). Upgrade to keep the paid strategies after that.
      </span>
      <Link to="/pricing" className="inline-flex shrink-0 items-center justify-center rounded-full bg-gc-blue px-4 py-2 text-xs font-semibold text-gc-on-blue hover:bg-gc-blue-hover">
        Upgrade
      </Link>
    </div>
  );
}

