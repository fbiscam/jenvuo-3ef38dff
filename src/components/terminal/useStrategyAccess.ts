import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { tickStrategyUsage } from "@/lib/strategy-usage.functions";
import type { StrategyAccessReason } from "@/lib/strategy-access";

export type StrategyAccessState = { loading: boolean; allowed: boolean; reason: StrategyAccessReason | null };

/**
 * Lock state for the paid chart strategies. While `inUse` is true (a covered
 * switch is on and the tab is visible) the server takes $0.10 once per hour.
 */
export function useStrategyAccess(inUse: boolean): StrategyAccessState {
  const tick = useServerFn(tickStrategyUsage);
  const [state, setState] = useState<StrategyAccessState>({ loading: true, allowed: false, reason: null });
  const inUseRef = useRef(inUse);
  inUseRef.current = inUse;

  useEffect(() => {
    let cancelled = false;
    const run = () => {
      const charge = inUseRef.current && document.visibilityState === "visible";
      tick({ data: { charge } })
        .then((r) => !cancelled && setState({ loading: false, allowed: r.allowed, reason: r.reason }))
        // A failed check keeps the last known state instead of flipping the lock.
        .catch(() => !cancelled && setState((s) => ({ ...s, loading: false })));
    };
    run();
    // Re-check every 5 minutes; a new hour is charged on the first check inside it.
    const t = window.setInterval(run, 5 * 60_000);
    const onVis = () => document.visibilityState === "visible" && run();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [tick, inUse]);

  return state;
}
