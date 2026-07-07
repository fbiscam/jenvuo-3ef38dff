import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getCreditState, spendCredits, CREDIT_COSTS, type CreditAction } from "@/lib/credits.functions";
import { useAuthUser } from "./useAuthUser";

export function useCredits() {
  const { user } = useAuthUser();
  const queryClient = useQueryClient();
  const fetchState = useServerFn(getCreditState);
  const spendFn = useServerFn(spendCredits);

  const query = useQuery({
    queryKey: ["credit-state", user?.id],
    queryFn: () => fetchState(),
    enabled: !!user,
    staleTime: 15_000,
  });

  async function spend(action: CreditAction, metadata?: Record<string, unknown>): Promise<boolean> {
    try {
      const res = await spendFn({ data: { action, metadata } });
      const uid = user?.id ?? "self";
      queryClient.setQueryData(["credit-state", uid], (prev: any) =>
        prev ? { ...prev, balance: res.balance } : prev,
      );
      queryClient.invalidateQueries({ queryKey: ["credit-state", uid] });
      return true;
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      if (msg.includes("INSUFFICIENT_CREDITS")) {
        toast.error("Out of credits", {
          description: "Upgrade your plan or buy a top-up pack.",
          action: { label: "Upgrade", onClick: () => (window.location.href = "/pricing") },
        });
      } else if (msg.toLowerCase().includes("unauthorized")) {
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
    isLoading: !user || query.isLoading || query.isFetching || !query.data,
    state: query.data,
    balance: query.data?.balance ?? 0,
    allowance: query.data?.allowance ?? 0,
    plan: query.data?.plan,
    features: query.data?.features ?? { journal: false, realtime_alerts: false, full_ict: false, scanner: false },
    spend,
    costs: CREDIT_COSTS,
    refresh: () => queryClient.invalidateQueries({ queryKey: ["credit-state", user?.id] }),
  };
}
