import { useEffect, useSyncExternalStore } from "react";

/**
 * One top-of-dashboard notice at a time. Each banner says whether it wants to
 * show; only the wanting banner with the lowest priority number is rendered.
 */
const wanting = new Map<string, number>();
const listeners = new Set<() => void>();
let snapshot = "";

function emit() {
  let best: string | null = null;
  let bestP = Infinity;
  for (const [id, p] of wanting) if (p < bestP) { best = id; bestP = p; }
  snapshot = best ?? "";
  listeners.forEach((l) => l());
}

export function pickBanner(entries: [string, number][]): string | null {
  let best: string | null = null;
  let bestP = Infinity;
  for (const [id, p] of entries) if (p < bestP) { best = id; bestP = p; }
  return best;
}

export function useBannerSlot(id: string, priority: number, wants: boolean): boolean {
  useEffect(() => {
    if (wants) wanting.set(id, priority);
    else wanting.delete(id);
    emit();
    return () => {
      wanting.delete(id);
      emit();
    };
  }, [id, priority, wants]);
  const active = useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => snapshot,
    () => "",
  );
  return wants && active === id;
}

/** Priorities: security/unread notice first, then free trial, then 2FA. */
export const BANNER_PRIORITY = { notice: 1, trial: 2, twoFactor: 3 } as const;
