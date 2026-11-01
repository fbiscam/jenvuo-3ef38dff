import { useEffect, useState } from "react";

export const MODEL_STATUS_EVERY_MS = 60_000;

/**
 * Checks the public model list every minute. A model is "online" when the API
 * currently serves it; if the check fails, every model shows "offline".
 * Returns null until the first check finishes.
 */
export function useModelStatus(): Set<string> | null {
  const [live, setLive] = useState<Set<string> | null>(null);
  useEffect(() => {
    let alive = true;
    const check = async () => {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 10_000);
      try {
        const res = await fetch("/api/public/v1/models", { cache: "no-store", signal: ctrl.signal });
        if (!res.ok) throw new Error(String(res.status));
        const body = (await res.json()) as { data?: { id?: string }[] };
        const ids = new Set((body.data ?? []).map((m) => m.id).filter((id): id is string => !!id));
        if (alive) setLive(ids);
      } catch {
        if (alive) setLive(new Set());
      } finally {
        clearTimeout(t);
      }
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
