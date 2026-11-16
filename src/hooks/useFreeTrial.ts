import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useCredits } from "@/hooks/useCredits";

/**
 * Self-claim banner for the free trial. The trial ($30 credit + 14 days Pro, see
 * free-trial.ts) now starts automatically on sign-up, server-side, so this banner stays
 * off and the database refuses self-claims.
 */
export const FREE_TRIAL_OPEN = false;

export function useFreeTrial() {
  const { user } = useAuthUser();
  const { refresh } = useCredits();
  const queryClient = useQueryClient();
  const [starting, setStarting] = useState(false);
  const key = ["free-trial-eligible", user?.id];

  const { data: eligible = false, isLoading } = useQuery({
    queryKey: key,
    enabled: FREE_TRIAL_OPEN && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("free_trial_eligible");
      if (error) throw error;
      return data === true;
    },
  });

  const start = async () => {
    setStarting(true);
    const { error } = await supabase.rpc("claim_free_trial");
    setStarting(false);
    if (error) {
      toast.error(error.message || "Could not start your free trial. Please try again.");
      return false;
    }
    queryClient.setQueryData(key, false);
    void refresh();
    toast.success("Your free trial has started: $30 credit and 14 days of Pro.");
    return true;
  };

  return { user, eligible, loading: isLoading, starting, start };
}
