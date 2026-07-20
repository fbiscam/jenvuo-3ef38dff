import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { FactorWeightsByAsset } from "@/lib/analysis/engine";

async function requireAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export type WeightConfigRow = {
  id: string;
  version: number;
  status: "candidate" | "active" | "retired";
  created_by: "seed" | "grid_search" | "walk_forward" | "manual";
  notes: string | null;
  activated_at: string | null;
  retired_at: string | null;
  created_at: string;
  weights: FactorWeightsByAsset;
};

export const listWeightConfigs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("signal_weight_configs")
      .select("*")
      .order("version", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as WeightConfigRow[];
  });

export type TuningRunRow = {
  id: string;
  mode: "grid" | "walk_forward";
  symbol: string;
  range_start: string;
  range_end: string;
  combinations_tested: number;
  best_config_id: string | null;
  metrics: Record<string, unknown>;
  status: "running" | "completed" | "failed";
  started_at: string;
  finished_at: string | null;
};

export const listTuningRuns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("signal_weight_tuning_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    return (data ?? []) as TuningRunRow[];
  });

export const activateWeightConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { configId: string; forceManualOverride?: boolean }) => ({
    configId: String(input.configId),
    forceManualOverride: Boolean(input.forceManualOverride),
  }))
  .handler(async ({ context, data }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Fetch target
    const { data: target, error: tErr } = await supabaseAdmin
      .from("signal_weight_configs")
      .select("*")
      .eq("id", data.configId)
      .maybeSingle();
    if (tErr) throw new Error(tErr.message);
    if (!target) throw new Error("Config not found");
    if (target.status === "active") return { ok: true, message: "Already active" };

    // In Phase 1 we allow manual activation with a confirm. Phase 2 will add
    // the walk-forward guardrail; manual override remains for admins.
    // Retire current active
    await supabaseAdmin
      .from("signal_weight_configs")
      .update({ status: "retired", retired_at: new Date().toISOString() })
      .eq("status", "active");

    const { error: aErr } = await supabaseAdmin
      .from("signal_weight_configs")
      .update({ status: "active", activated_at: new Date().toISOString() })
      .eq("id", data.configId);
    if (aErr) throw new Error(aErr.message);

    const { invalidateActiveWeightsCache } = await import("@/lib/tuning/weights.server");
    invalidateActiveWeightsCache();
    return { ok: true, message: "Activated" };
  });

export const rollbackWeightConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: previous, error: pErr } = await supabaseAdmin
      .from("signal_weight_configs")
      .select("id, version, retired_at")
      .eq("status", "retired")
      .order("retired_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!previous) throw new Error("No previous config to roll back to");

    await supabaseAdmin
      .from("signal_weight_configs")
      .update({ status: "retired", retired_at: new Date().toISOString() })
      .eq("status", "active");
    const { error: aErr } = await supabaseAdmin
      .from("signal_weight_configs")
      .update({ status: "active", activated_at: new Date().toISOString(), retired_at: null })
      .eq("id", previous.id);
    if (aErr) throw new Error(aErr.message);

    const { invalidateActiveWeightsCache } = await import("@/lib/tuning/weights.server");
    invalidateActiveWeightsCache();
    return { ok: true, rolledBackTo: previous.version };
  });
