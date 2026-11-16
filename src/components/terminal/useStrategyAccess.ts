import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getStrategyAccess, tickStrategyUsage } from "@/lib/strategy-usage.functions";
import type { StrategyAccessReason } from "@/lib/strategy-access";
import type { StrategyTier } from "@/lib/free-plan";

export type StrategyAccessState = {
  loading: boolean;
  allowed: boolean;
  reason: StrategyAccessReason | null;
  tier: StrategyTier | null;
  /** Seconds of today's plan time left, null when the plan has no daily limit. */
  secondsLeft: number | null;
};

const TICK_MS = 60_000;

/**
 * Lock state for the paid chart indicators. While one of them is on and the tab is
 * visible, the server counts the time once a minute against the plan's daily hours.
 */
export function useStrategyAccess(inUse: boolean): StrategyAccessState {
  const fetchAccess = useServerFn(getStrategyAccess);
  const tick = useServerFn(tickStrategyUsage);
  const [state, setState] = useState<StrategyAccessState>({ loading: true, allowed: false, reason: null, tier: null, secondsLeft: null });
  const inUseRef = useRef(inUse);
  inUseRef.current = inUse;
  const limited = state.allowed && state.secondsLeft !== null;

  useEffect(() => {
    let cancelled = false;
    const apply = (r: Omit<StrategyAccessState, "loading">) =>
      !cancelled && setState({ loading: false, allowed: r.allowed, reason: r.reason, tier: r.tier, secondsLeft: r.secondsLeft });
    const run = () => {
      fetchAccess()
        .then(apply)
        // A failed check keeps the last known state instead of flipping the lock.
        .catch(() => !cancelled && setState((s) => ({ ...s, loading: false })));
    };
    run();
    const t = window.setInterval(run, 5 * 60_000);
    const onVis = () => document.visibilityState === "visible" && run();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [fetchAccess]);

  // Count time only on plans with a daily limit, while an indicator is on and visible.
  useEffect(() => {
    if (!limited || !inUse) return;
    let cancelled = false;
    const send = () => {
      if (document.visibilityState !== "visible" || !inUseRef.current) return;
      tick()
        .then((r) => !cancelled && setState({ loading: false, allowed: r.allowed, reason: r.reason, tier: r.tier, secondsLeft: r.secondsLeft }))
        .catch(() => {});
    };
    send();
    const t = window.setInterval(send, TICK_MS);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [limited, inUse, tick]);

  return state;
}
