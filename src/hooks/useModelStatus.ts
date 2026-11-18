import { useEffect, useState } from "react";

export const MODEL_STATUS_EVERY_MS = 60_000;

// Every model card on a page uses this hook; they share one check instead of each fetching.
let last: { at: number; ids: Set<string> } | null = null;
let inflight: Promise<Set<string>> | null = null;

async function fetchLiveModels(): Promise<Set<string>> {
  if (last && Date.now() - last.at < MODEL_STATUS_EVERY_MS / 2) return last.ids;
  if (inflight) return inflight;
  inflight = (async () => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10_000);
    try {
      const res = await fetch("/api/public/v1/models", { cache: "no-store", signal: ctrl.signal });
      if (!res.ok) throw new Error(String(res.status));
      const body = (await res.json()) as { data?: { id?: string }[] };
      const ids = new Set((body.data ?? []).map((m) => m.id).filter((id): id is string => !!id));
      last = { at: Date.now(), ids };
      return ids;
    } catch {
      return new Set<string>();
    } finally {
      clearTimeout(t);
      inflight = null;
    }
  })();
  return inflight;
}

/**
 * Checks the public model list every minute. A model is "online" when the API
 * currently serves it; if the check fails, every model shows "offline".
 * Returns null until the first check finishes.
 */
export function useModelStatus(): Set<string> | null {
  const [live, setLive] = useState<Set<string> | null>(() => last?.ids ?? null);
  useEffect(() => {
    let alive = true;
    const check = async () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      const ids = await fetchLiveModels();
      if (alive) setLive(ids);
    };
    void check();
    const id = setInterval(check, MODEL_STATUS_EVERY_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);
  return live;
}
