import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getCreditState, spendCredits, CREDIT_COSTS, type CreditAction } from "@/lib/credits.functions";
import { useAuthUser } from "./useAuthUser";
import { supabase } from "@/integrations/supabase/client";
import { applyPromoSnapshot } from "@/lib/promo-activation";
import type { CreditState } from "@/lib/credits.functions";

const CREDIT_SNAPSHOT_PREFIX = "jenvu:page-cache:credit-state:";

/** Last credit state saved in this browser for this user (same per-user snapshot idea as `page-cache.ts`). */
function readCreditSnapshot(key: string | null): any {
  if (!key || typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

export function useCredits() {
  const { user, loading: authLoading } = useAuthUser();
  const queryClient = useQueryClient();
  const fetchState = useServerFn(getCreditState);
  const spendFn = useServerFn(spendCredits);

  const snapshotKey = user?.id ? `${CREDIT_SNAPSHOT_PREFIX}${user.id}` : null;
  const query = useQuery({
    queryKey: ["credit-state", user?.id],
    queryFn: () => fetchState(),
    enabled: !authLoading && !!user,
    retry: 2,
    staleTime: 15_000,
    // Paint the last known balance/plan at once; the fresh copy replaces it a moment later.
    placeholderData: () => readCreditSnapshot(snapshotKey),
  });

  useEffect(() => {
    if (!snapshotKey || !query.data || query.isPlaceholderData) return;
    try {
      window.localStorage.setItem(snapshotKey, JSON.stringify(query.data));
    } catch {
      /* storage full or blocked */
    }
  }, [snapshotKey, query.data, query.isPlaceholderData]);

  // Another open tab can redeem a gift while this tab's cached query is still fresh.
  // Re-read from the server instead of trusting browser-written account data.
  useEffect(() => {
    if (!snapshotKey || !user?.id) return;
    const onStorage = (event: StorageEvent) => {
      if (event.key === snapshotKey) {
        void queryClient.invalidateQueries({ queryKey: ["credit-state", user.id] });
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [snapshotKey, user?.id, queryClient]);

  // Realtime: refresh whenever wallet, ledger, or subscription changes for this user
  useEffect(() => {
    if (!user?.id) return;
    const invalidate = () =>
      queryClient.invalidateQueries({ queryKey: ["credit-state", user.id] });
    // Unique channel name per mount to avoid supabase-js returning a
    // stale, already-subscribed channel (React StrictMode double-invoke).
    const channelName = `credit-state-${user.id}-${Math.random().toString(36).slice(2)}`;
    const ch = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "credit_ledger", filter: `user_id=eq.${user.id}` },
        invalidate,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "credit_balances", filter: `user_id=eq.${user.id}` },
        invalidate,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_subscriptions", filter: `user_id=eq.${user.id}` },
        invalidate,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id, queryClient]);

  const waitingForFirstCreditState = !!user && !query.data && (query.isPending || query.isFetching);

  async function spend(action: CreditAction, metadata?: Record<string, unknown>): Promise<boolean> {
    try {
      const res: any = await spendFn({ data: { action, metadata } });
      if (res && res.ok === false) {
        if (res.error === "DOCUMENTS_REQUIRED") {
          toast.error("Documents required", {
            description: "Please submit your document to continue using the features.",
            action: { label: "Submit documents", onClick: () => (window.location.href = "/dashboard/documents") },
          });
        } else if (res.error === "INSUFFICIENT_CREDITS") {
          toast.error("Low balance", {
            description: `You need at least $${(res.minRequired ?? 0.2).toFixed(2)} to run a signal scan. Add funds to continue.`,
            action: { label: "Add funds", onClick: () => (window.location.href = "/dashboard/billing") },
          });
        } else {
          // Never fail silently — an unknown rejection code used to abort the
          // scan with no message at all on the affected account.
          toast.error("Scan blocked", {
            description: String(res.error ?? "Account check failed. Please try again or contact support."),
          });
        }
        return false;
      }

      const uid = user?.id ?? "self";
      queryClient.setQueryData(["credit-state", uid], (prev: any) =>
        prev ? { ...prev, balance: res.balance } : prev,
      );
      queryClient.invalidateQueries({ queryKey: ["credit-state", uid] });
      return true;
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      if (msg.toLowerCase().includes("unauthorized")) {
        toast.error("Please sign in to continue.");
      } else {
        toast.error("Couldn't spend credits", { description: e?.message ?? "Try again." });
      }
      return false;
    }
  }

  return {
    // Treat as loading until we actually have plan/features data,
    // so gated pages don't flash the free-user overlay for Pro/Elite users on refresh.
    isLoading: authLoading || waitingForFirstCreditState,
    isError: query.isError,
    state: query.data,
    balance: query.data?.balance ?? 0,
    allowance: query.data?.allowance ?? 0,
    plan: query.data?.plan,
    features: query.data?.features ?? { journal: false, realtime_alerts: false, full_ict: false, scanner: false },
    spend,
    costs: CREDIT_COSTS,
    refresh: () => queryClient.invalidateQueries({ queryKey: ["credit-state", user?.id] }),
    applySnapshot: async (state: CreditState) => {
      if (!user?.id) return;
      await applyPromoSnapshot(queryClient, user.id, state);
    },
  };
}
