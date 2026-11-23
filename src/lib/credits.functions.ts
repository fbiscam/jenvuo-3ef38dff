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
  metadata?: Record<string, any> | null;
};

export type TrialInfo = { active: boolean; endsAt: string | null; daysLeft: number };

export type CreditGrant = {
  id: string;
  amount: number;
  reason: string;
  createdAt: string;
};

export type PromotionRedemption = {
  id: string;
  code: string;
  bonusUsd: number;
  payAmountUsd: number;
  createdAt: string;
};

export type CreditState = {
  plan: { id: string; name: string; price_usd: number; wallet_usd: number };
  features: PlanFeatures;
  balance: number;      // USD wallet balance
  allowance: number;    // monthly wallet allowance (USD)
  periodResetsAt: string | null;
  /** When the current paid plan is next due (paid, non-trial plans only). */
  nextBillingDate: string | null;
  trial: TrialInfo;
  recent: LedgerEntry[];
  grants: CreditGrant[];
  promotions: PromotionRedemption[];
};

export const getCreditState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CreditState> => {
    const { readCreditState } = await import("@/lib/credits-state.server");
    return readCreditState(context.supabase, context.userId);
  });

const spendSchema = z.object({
  action: z.enum(["voice_query", "signal", "ict_narration", "alert"]),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// USD-wallet system: pre-flight balance check only. Actual $ cost is deducted
// per-AI-call inside logAiCost() based on model tokens × plan markup.
// Minimum balance = $0.20 (flat charge per BUY/SELL signal). Anything lower
// blocks the scan up-front so the user isn't left mid-analysis with a
// half-charged wallet.
const MIN_BALANCE_USD = 0.20;

export const spendCredits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => spendSchema.parse(data))
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Close the exact-boundary gap between trial expiry and the scheduled job.
    await supabase.rpc("expire_my_pro_trial" as any);

    // Document gate: after 30 days from approval, unverified users must
    // submit identity documents before running any scan.
    const { data: authData } = await supabase.auth.getUser();
    const email = authData?.user?.email ?? null;
    if (email) {
      const { data: app } = await supabase
        .from("founding_applications")
        .select("status, document_status, approved_at")
        .ilike("email", email)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (app?.approved_at && app.document_status !== "verified") {
        const approvedMs = new Date(app.approved_at as string).getTime();
        const daysSince = (Date.now() - approvedMs) / 86_400_000;
        if (daysSince > 30) {
          return {
            balance: 0,
            spent: 0,
            ok: false as const,
            error: "DOCUMENTS_REQUIRED" as const,
            daysSinceApproval: Math.floor(daysSince),
          };
        }
      }
    }

    const { data: bal } = await supabase
      .from("credit_balances").select("balance").eq("user_id", userId).maybeSingle();
    const balance = Number(bal?.balance ?? 0);
    if (balance < MIN_BALANCE_USD) {
      return { balance, spent: 0, ok: false as const, error: "INSUFFICIENT_CREDITS" as const, minRequired: MIN_BALANCE_USD };
    }
    return { balance, spent: 0, ok: true as const };
  });
