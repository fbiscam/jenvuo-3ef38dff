import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { CreditState } from "./credits.functions";
import { matchActualAiModels, type AiCostLogRow, type MatchedAiModels } from "./credits-model-match";

/** Read the authoritative account snapshot using the authenticated caller client. */
export async function readCreditState(supabase: SupabaseClient<Database>, userId: string): Promise<CreditState> {
    // Apply an elapsed trial immediately when the user returns, rather than
    // waiting for the scheduled sweep. Paid/top-up accounts are not touched.
    await supabase.rpc("expire_my_pro_trial" as any);

    const [{ data: sub }, { data: bal }, { data: ledger }, { data: positiveLedger }, { data: promoRedemptions }] = await Promise.all([
      supabase
        .from("user_subscriptions")
        .select("plan_id, status, is_trial, trial_ends_at, current_period_end, renewal_due_at")
        .eq("user_id", userId)
        .maybeSingle(),

      supabase.from("credit_balances").select("balance, monthly_allowance, period_resets_at").eq("user_id", userId).maybeSingle(),
      supabase.from("credit_ledger")
        .select("id, delta, reason, balance_after, created_at, model, stage, prompt_tokens, completion_tokens, raw_cost_usd, metadata")
        .eq("user_id", userId).order("created_at", { ascending: false }).limit(60),
      supabase.from("credit_ledger")
        .select("id, delta, reason, created_at, metadata")
        .eq("user_id", userId).gt("delta", 0).order("created_at", { ascending: false }).limit(100),
      supabase.from("promo_redemptions")
        .select("id, code, bonus_usd, pay_amount_usd, created_at")
        .eq("user_id", userId).order("created_at", { ascending: false }).limit(100),
    ]);

    // Fetch plan row separately to avoid PostgREST embed edge-cases
    // (array vs object, null on join). Falls back to Free defaults.
    const subscriptionActive = sub?.status === "active" || sub?.status === "trialing";
    const planId = subscriptionActive ? ((sub?.plan_id as string | null) ?? "free") : "free";
    const { data: planRow } = await supabase
      .from("plans")
      .select("id, name, price_usd, wallet_usd, monthly_credits, feature_journal, feature_realtime_alerts, feature_full_ict, feature_scanner")
      .eq("id", planId)
      .maybeSingle();

    const ledgerRows = ledger ?? [];
    let actualModelMatches = new Map<string, MatchedAiModels>();
    if (ledgerRows.length > 0) {
      const times = ledgerRows.map((r: any) => new Date(r.created_at).getTime()).filter(Number.isFinite);
      if (times.length > 0) {
        const from = new Date(Math.min(...times) - 10 * 60_000).toISOString();
        const to = new Date(Math.max(...times) + 60_000).toISOString();
        const { data: aiLogs } = await supabase
          .from("ai_cost_log")
          .select("id, created_at, stage, model, prompt_tokens, completion_tokens")
          .eq("user_id", userId)
          .gte("created_at", from)
          .lte("created_at", to)
          .order("created_at", { ascending: true });
        actualModelMatches = matchActualAiModels(ledgerRows, (aiLogs ?? []) as AiCostLogRow[]);
      }
    }

    const basePlan = (planRow as any) ?? { id: "free", name: "Free", price_usd: 0, wallet_usd: 2.00, feature_journal: false, feature_realtime_alerts: false, feature_full_ict: false, feature_scanner: false };
    // Display name always follows the plan id, so a stale DB label can never
    // show "Elite" for an Ultra account again.
    const PLAN_LABELS: Record<string, string> = { free: "Free", pro: "Pro", elite: "Elite", ultra: "Ultra" };
    const plan = { ...basePlan, name: PLAN_LABELS[String(basePlan.id ?? planId)] ?? basePlan.name };
    const { getPlanCapabilities } = await import("@/lib/plan-entitlements");
    const capabilities = getPlanCapabilities(planId);
    const walletUsd = Number(plan.wallet_usd ?? 0);

    const trialEndsAt = (sub as any)?.trial_ends_at as string | null | undefined;
    const trialActive = !!(sub as any)?.is_trial && !!trialEndsAt && new Date(trialEndsAt).getTime() > Date.now();
    const trial = {
      active: trialActive,
      endsAt: trialActive && trialEndsAt ? trialEndsAt : null,
      daysLeft: trialActive && trialEndsAt
        ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86_400_000))
        : 0,
    };

    return {
      trial,
      plan: { id: plan.id, name: plan.name, price_usd: Number(plan.price_usd ?? 0), wallet_usd: walletUsd },

      features: {
        journal: !!plan.feature_journal,
        realtime_alerts: !!plan.feature_realtime_alerts,
        full_ict: !!plan.feature_full_ict,
        scanner: capabilities.multiPairScanner,
      },
      balance: Number(bal?.balance ?? 0),
      allowance: Number(bal?.monthly_allowance ?? walletUsd),
      periodResetsAt: bal?.period_resets_at ?? null,
      nextBillingDate:
        planId !== "free" && !(sub as any)?.is_trial
          ? (((sub as any)?.renewal_due_at as string | null) ?? ((sub as any)?.current_period_end as string | null) ?? null)
          : null,
      grants: (positiveLedger ?? [])
        .filter((r: any) => !["promo_bonus", "topup_crypto", "refund"].includes(String(r.reason)))
        .map((r: any) => ({
          id: r.id,
          amount: Number(r.delta),
          reason: String(r.reason),
          createdAt: r.created_at,
        })),
      promotions: (promoRedemptions ?? []).map((r: any) => ({
        id: r.id,
        code: r.code,
        bonusUsd: Number(r.bonus_usd ?? 0),
        payAmountUsd: Number(r.pay_amount_usd ?? 0),
        createdAt: r.created_at,
      })),
      recent: ledgerRows.map((r: any) => {
        const meta = (r.metadata ?? {}) as Record<string, any>;
        const actual = actualModelMatches.get(r.id);
        const actualPrimary = actual?.primary?.model ?? null;
        const seniorsArr = actual?.seniors ?? (actual?.senior ? [actual.senior] : []);
        const actualSenior = seniorsArr.length ? seniorsArr.map((s) => s.model).filter(Boolean).join(",") : null;
        const seniorPromptTokens = seniorsArr.reduce((n, s) => n + (s.prompt_tokens ?? 0), 0);
        const seniorCompletionTokens = seniorsArr.reduce((n, s) => n + (s.completion_tokens ?? 0), 0);
        const enrichedMeta = {
          ...meta,
          ...(actualPrimary ? {
            actual_model: actualPrimary,
            actual_model_stage: actual?.primary?.stage ?? null,
            actual_prompt_tokens: actual?.primary?.prompt_tokens ?? null,
            actual_completion_tokens: actual?.primary?.completion_tokens ?? null,
          } : {}),
          ...(actualSenior ? {
            actual_senior_model: actualSenior,
            actual_senior_model_stage: seniorsArr[0]?.stage ?? null,
            actual_senior_prompt_tokens: seniorPromptTokens || null,
            actual_senior_completion_tokens: seniorCompletionTokens || null,
          } : {}),
        };
        return {
          id: r.id, delta: Number(r.delta), reason: r.reason, balance_after: Number(r.balance_after),
          created_at: r.created_at,
          model: actualPrimary ?? r.model ?? meta.model ?? null,
          stage: r.stage ?? meta.stage ?? null,
          prompt_tokens: actual?.primary?.prompt_tokens ?? r.prompt_tokens ?? meta.prompt_tokens ?? null,
          completion_tokens: actual?.primary?.completion_tokens ?? r.completion_tokens ?? meta.completion_tokens ?? null,
          raw_cost_usd: r.raw_cost_usd == null ? (meta.raw_cost_usd == null ? null : Number(meta.raw_cost_usd)) : Number(r.raw_cost_usd),
          metadata: enrichedMeta,
        };
      }),
    };
}
