import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// LEGACY constant kept for import compatibility. All charges are now
// USD-based and deducted per-AI-call inside logAiCost().
export const CREDIT_COSTS = {
  voice_query: 0,
  signal: 0,
  ict_narration: 0,
  alert: 0,
} as const;

export type CreditAction = keyof typeof CREDIT_COSTS;

export type PlanFeatures = {
  journal: boolean;
  realtime_alerts: boolean;
  full_ict: boolean;
  scanner: boolean;
};

export type LedgerEntry = {
  id: string;
  delta: number;
  reason: string;
  balance_after: number;
  created_at: string;
  model?: string | null;
  stage?: string | null;
  prompt_tokens?: number | null;
  completion_tokens?: number | null;
  raw_cost_usd?: number | null;
};

export type CreditState = {
  plan: { id: string; name: string; price_usd: number; wallet_usd: number };
  features: PlanFeatures;
  balance: number;      // USD wallet balance
  allowance: number;    // monthly wallet allowance (USD)
  periodResetsAt: string | null;
  recent: LedgerEntry[];
};

export const getCreditState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CreditState> => {
    const { supabase, userId } = context;

    const [{ data: sub }, { data: bal }, { data: ledger }] = await Promise.all([
      supabase
        .from("user_subscriptions")
        .select("plan_id, plans:plan_id ( id, name, price_usd, wallet_usd, monthly_credits, feature_journal, feature_realtime_alerts, feature_full_ict, feature_scanner )")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase.from("credit_balances").select("balance, monthly_allowance, period_resets_at").eq("user_id", userId).maybeSingle(),
      supabase.from("credit_ledger")
        .select("id, delta, reason, balance_after, created_at, model, stage, prompt_tokens, completion_tokens, raw_cost_usd")
        .eq("user_id", userId).order("created_at", { ascending: false }).limit(60),
    ]);

    const plan = (sub?.plans as any) ?? { id: "free", name: "Free", price_usd: 0, wallet_usd: 0.30, feature_journal: false, feature_realtime_alerts: false, feature_full_ict: false, feature_scanner: false };
    const walletUsd = Number(plan.wallet_usd ?? 0);

    return {
      plan: { id: plan.id, name: plan.name, price_usd: Number(plan.price_usd ?? 0), wallet_usd: walletUsd },
      features: {
        journal: !!plan.feature_journal,
        realtime_alerts: !!plan.feature_realtime_alerts,
        full_ict: !!plan.feature_full_ict,
        scanner: !!plan.feature_scanner,
      },
      balance: Number(bal?.balance ?? 0),
      allowance: Number(bal?.monthly_allowance ?? walletUsd),
      periodResetsAt: bal?.period_resets_at ?? null,
      recent: (ledger ?? []).map((r: any) => ({
        id: r.id, delta: Number(r.delta), reason: r.reason, balance_after: Number(r.balance_after),
        created_at: r.created_at, model: r.model, stage: r.stage,
        prompt_tokens: r.prompt_tokens, completion_tokens: r.completion_tokens,
        raw_cost_usd: r.raw_cost_usd == null ? null : Number(r.raw_cost_usd),
      })),
    };
  });

const spendSchema = z.object({
  action: z.enum(["voice_query", "signal", "ict_narration", "alert"]),
  metadata: z.record(z.unknown()).optional(),
});

// USD-wallet system: pre-flight balance check only. Actual $ cost is deducted
// per-AI-call inside logAiCost() based on model tokens × plan markup.
// A tiny minimum-balance threshold blocks scans when wallet is effectively empty.
const MIN_BALANCE_USD = 0.01;

export const spendCredits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => spendSchema.parse(data))
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: bal } = await supabase
      .from("credit_balances").select("balance").eq("user_id", userId).maybeSingle();
    const balance = Number(bal?.balance ?? 0);
    if (balance < MIN_BALANCE_USD) throw new Error("INSUFFICIENT_CREDITS");
    return { balance, spent: 0 };
  });
