import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const CREDIT_COSTS = {
  voice_query: 0,
  signal: 1,
  ict_narration: 1,
  alert: 1,
} as const;

export type CreditAction = keyof typeof CREDIT_COSTS;

export type PlanFeatures = {
  journal: boolean;
  realtime_alerts: boolean;
  full_ict: boolean;
  scanner: boolean;
};

export type CreditState = {
  plan: { id: string; name: string; price_usd: number; monthly_credits: number };
  features: PlanFeatures;
  balance: number;
  allowance: number;
  periodResetsAt: string | null;
  recent: { id: string; delta: number; reason: string; balance_after: number; created_at: string }[];
};

export const getCreditState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CreditState> => {
    const { supabase, userId } = context;

    const [{ data: sub }, { data: bal }, { data: ledger }] = await Promise.all([
      supabase
        .from("user_subscriptions")
        .select("plan_id, plans:plan_id ( id, name, price_usd, monthly_credits, feature_journal, feature_realtime_alerts, feature_full_ict, feature_scanner )")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase.from("credit_balances").select("balance, monthly_allowance, period_resets_at").eq("user_id", userId).maybeSingle(),
      supabase.from("credit_ledger").select("id, delta, reason, balance_after, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(30),
    ]);

    const plan = (sub?.plans as any) ?? { id: "free", name: "Free", price_usd: 0, monthly_credits: 10, feature_journal: false, feature_realtime_alerts: false, feature_full_ict: false, feature_scanner: false };

    return {
      plan: { id: plan.id, name: plan.name, price_usd: Number(plan.price_usd ?? 0), monthly_credits: plan.monthly_credits },
      features: {
        journal: !!plan.feature_journal,
        realtime_alerts: !!plan.feature_realtime_alerts,
        full_ict: !!plan.feature_full_ict,
        scanner: !!plan.feature_scanner,
      },
      balance: bal?.balance ?? 0,
      allowance: bal?.monthly_allowance ?? plan.monthly_credits,
      periodResetsAt: bal?.period_resets_at ?? null,
      recent: ledger ?? [],
    };
  });

const spendSchema = z.object({
  action: z.enum(["voice_query", "signal", "ict_narration", "alert"]),
  metadata: z.record(z.unknown()).optional(),
});

export const spendCredits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => spendSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const amount = CREDIT_COSTS[data.action];
    const meta = (data.metadata ?? {}) as Record<string, unknown>;
    const scanId = typeof meta.scanId === "string" ? meta.scanId : null;
    const symbol = typeof meta.symbol === "string" ? meta.symbol : null;
    const caller = typeof meta.caller === "string" ? meta.caller : "credits.spend";

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Best-effort request context
    let userAgent: string | null = null;
    let requestIp: string | null = null;
    try {
      const mod: any = await import("@tanstack/react-start/server");
      const getRequestHeader = mod.getRequestHeader as ((n: string) => string | undefined) | undefined;
      if (getRequestHeader) {
        userAgent = getRequestHeader("user-agent") ?? null;
        requestIp =
          getRequestHeader("cf-connecting-ip") ??
          getRequestHeader("x-forwarded-for") ??
          null;
      }
    } catch {
      /* noop */
    }

    const { data: newBalance, error } = await supabaseAdmin.rpc("spend_credits", {
      _user_id: userId,
      _amount: amount,
      _reason: data.action,
      _metadata: meta as any,
    });

    if (error) {
      await supabaseAdmin.rpc("log_charge_audit", {
        _user_id: userId,
        _reason: data.action,
        _amount: 0,
        _balance_after: null,
        _source: "server_spend_failed",
        _caller: caller,
        _scan_id: scanId,
        _symbol: symbol,
        _user_agent: userAgent,
        _request_ip: requestIp,
        _metadata: { ...meta, error: error.message } as any,
      });
      if (error.message?.includes("INSUFFICIENT_CREDITS")) {
        throw new Error("INSUFFICIENT_CREDITS");
      }
      throw new Error(error.message);
    }

    await supabaseAdmin.rpc("log_charge_audit", {
      _user_id: userId,
      _reason: data.action,
      _amount: amount,
      _balance_after: newBalance as number,
      _source: "server_spend",
      _caller: caller,
      _scan_id: scanId,
      _symbol: symbol,
      _user_agent: userAgent,
      _request_ip: requestIp,
      _metadata: meta as any,
    });

    return { balance: newBalance as number, spent: amount };
  });
