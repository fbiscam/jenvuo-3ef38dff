import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getStrategyAccess } from "@/lib/strategy-usage.functions";
import type { StrategyAccessReason } from "@/lib/strategy-access";

export type StrategyAccessState = { loading: boolean; allowed: boolean; reason: StrategyAccessReason | null };

/** Lock state for the chart strategies; they unlock with the plan or Pro trial. */
export function useStrategyAccess(): StrategyAccessState {
  const fetchAccess = useServerFn(getStrategyAccess);
  const [state, setState] = useState<StrategyAccessState>({ loading: true, allowed: false, reason: null });

  useEffect(() => {
    let cancelled = false;
    const run = () => {
      fetchAccess()
        .then((r) => !cancelled && setState({ loading: false, allowed: r.allowed, reason: r.reason }))
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

  return state;
}
