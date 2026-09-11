import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type CancelPlanResult = {
  ok: boolean;
  error?: string;
  previous_plan?: string;
  credits_removed?: number;
};

export const cancelMyPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CancelPlanResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("cancel_user_plan", {
      _user_id: context.userId,
    });

    if (error) throw new Error(error.message);

    const result = data as CancelPlanResult | null;
    if (!result?.ok) {
      return { ok: false, error: result?.error ?? "PLAN_CANCELLATION_FAILED" };
    }

    return result;
  });