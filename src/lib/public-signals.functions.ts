import { createServerFn } from "@tanstack/react-start";

export type PublicSignalRow = {
  pair: string;
  direction: "long" | "short" | string;
  grade: string | null;
  confidence: number | null;
  rr: number | null;
  session: string | null;
  killzone: string | null;
  fired_at: string;
};

/**
 * Public read of the most recent alert-worthy signals for marketing surfaces
 * (homepage ticker, trust widgets). Returns sanitized DTOs only — never user
 * IDs, entries, SL/TP, or rationale text.
 */
export const getPublicRecentSignals = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicSignalRow[]> => {
    // Only signed-in callers, read with their own token so the paid-only
    // row rules apply; visitors and non-paying accounts get an empty list.
    const { getRequestHeader } = await import("@tanstack/react-start/server");
    const header = getRequestHeader("authorization") ?? "";
    const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!token || !url || !key) return [];
    const { createClient } = await import("@supabase/supabase-js");
    const db = createClient(url, key, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });
    const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const { data, error } = await db
      .from("signal_alerts")
      .select("pair,direction,grade,confidence,rr,session,killzone,fired_at")
      .gte("fired_at", since)
      .order("fired_at", { ascending: false })
      .limit(20);
    if (error) return [];
    return (data ?? []) as PublicSignalRow[];
  },
);
