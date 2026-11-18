import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { readSessionUser } from "@/lib/session-user";

type PlanRow = { plan_id: string; status: string; is_trial: boolean | null; trial_ends_at: string | null; current_period_end: string | null } | null;
// Several parts of a page ask for the plan at once; share one lookup for a few seconds.
let shared: { userId: string; at: number; promise: Promise<PlanRow> } | null = null;
function loadPlanRow(userId: string): Promise<PlanRow> {
  if (shared && shared.userId === userId && Date.now() - shared.at < 5000) return shared.promise;
  const promise = Promise.resolve(
    supabase
      .from("user_subscriptions")
      .select("plan_id, status, is_trial, trial_ends_at, current_period_end")
      .eq("user_id", userId)
      .maybeSingle(),
  ).then(({ data }) => (data as PlanRow) ?? null);
  shared = { userId, at: Date.now(), promise };
  return promise;
}

export function useCurrentPlan() {
  const [plan, setPlan] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data: u } = await readSessionUser();
      if (!u.user) {
        return;
      }
      const data = await loadPlanRow(u.user.id);
      if (!mounted) return;
      const expiry = data?.trial_ends_at || data?.current_period_end;
      const trialValid = !data?.is_trial || (Boolean(expiry) && new Date(expiry as string).getTime() > Date.now());
      // Signed-in accounts without a running paid plan or trial are on Free (null means signed out).
      if (data && (data.status === "active" || data.status === "trialing") && trialValid) setPlan(data.plan_id);
      else setPlan("free");
    };
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return plan;
}
