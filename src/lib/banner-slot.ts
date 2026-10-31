import { useEffect, useSyncExternalStore } from "react";

/**
 * One top-of-dashboard notice at a time. Each banner says whether it wants to
 * show; only the wanting banner with the lowest priority number is rendered.
 */
const wanting = new Map<string, number>();
const listeners = new Set<() => void>();
let snapshot = "";

function emit() {
  snapshot = pickBanner([...wanting.entries()]) ?? "";
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

/** Priorities: security/unread notice, then site announcement, free trial, 2FA. */
export const BANNER_PRIORITY = { notice: 1, announcement: 2, trial: 3, twoFactor: 4 } as const;
