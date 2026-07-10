// Server-only helper: compute approx $ cost from AI Gateway usage, log to
// public.ai_cost_log, AND deduct (cost × plan markup) from the user's USD
// wallet balance via spend_credits RPC. Fire-and-forget from the caller.

type Price = { in: number; out: number };

const MODEL_PRICING: Record<string, Price> = {
  // OpenAI direct
  "openai/gpt-5.5": { in: 1.25, out: 10.0 },
  "openai/gpt-5.5-pro": { in: 3.0, out: 15.0 },
  "openai/gpt-5.4": { in: 1.1, out: 8.8 },
  "openai/gpt-5.4-pro": { in: 3.0, out: 15.0 },
  "openai/gpt-5.4-mini": { in: 0.25, out: 2.0 },
  "openai/gpt-5.4-nano": { in: 0.05, out: 0.4 },
  "openai/gpt-5.2": { in: 1.1, out: 8.8 },
  "openai/gpt-5": { in: 1.25, out: 10.0 },
  "openai/gpt-5-mini": { in: 0.25, out: 2.0 },
  "openai/gpt-5-nano": { in: 0.05, out: 0.4 },
  // Bluesminds mirrors OpenAI list prices
  "bmind/gpt-5.5": { in: 1.25, out: 10.0 },
  "bmind/gpt-5.5-pro": { in: 3.0, out: 15.0 },
  "bmind/gpt-5.4": { in: 1.1, out: 8.8 },
  "bmind/gpt-5.4-pro": { in: 3.0, out: 15.0 },
  "bmind/gpt-5.4-mini": { in: 0.25, out: 2.0 },
  "bmind/deepseek-ai/deepseek-v4-pro": { in: 0.55, out: 2.19 },
  // NVIDIA integrate (free tier)
  "nvapi/deepseek-ai/deepseek-v4-pro": { in: 0, out: 0 },
  "nvapi/openai/gpt-oss-120b": { in: 0, out: 0 },
  // Google
  "google/gemini-2.5-pro": { in: 1.25, out: 10.0 },
  "google/gemini-2.5-flash": { in: 0.075, out: 0.3 },
  "google/gemini-2.5-flash-lite": { in: 0.04, out: 0.15 },
  "google/gemini-3-flash-preview": { in: 0.1, out: 0.4 },
  "google/gemini-3.1-pro-preview": { in: 1.5, out: 12.0 },
  "google/gemini-3.1-flash-lite": { in: 0.05, out: 0.2 },
  "google/gemini-3.5-flash": { in: 0.15, out: 0.6 },
};

export function estimateCostUsd(model: string, promptTokens: number, completionTokens: number): number {
  const p = MODEL_PRICING[model];
  if (!p) return 0;
  return (promptTokens / 1_000_000) * p.in + (completionTokens / 1_000_000) * p.out;
}

export async function logAiCost(params: {
  userId: string | null;
  stage: string;
  model: string;
  usage: { promptTokens: number; completionTokens: number; totalTokens?: number };
}): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let plan_id: string | null = null;
    let markup = 2.0;
    if (params.userId) {
      const { data } = await supabaseAdmin
        .from("user_subscriptions")
        .select("plan_id, plans:plan_id ( markup_multiplier )")
        .eq("user_id", params.userId)
        .maybeSingle();
      plan_id = (data?.plan_id as string | undefined) ?? null;
      const m = Number((data as any)?.plans?.markup_multiplier);
      if (Number.isFinite(m) && m > 0) markup = m;
    }

    const promptTokens = Math.max(0, params.usage.promptTokens | 0);
    const completionTokens = Math.max(0, params.usage.completionTokens | 0);
    const totalTokens = params.usage.totalTokens ?? promptTokens + completionTokens;
    const rawCost = estimateCostUsd(params.model, promptTokens, completionTokens);
    const chargeUsd = Number((rawCost * markup).toFixed(6));

    await supabaseAdmin.from("ai_cost_log").insert({
      user_id: params.userId, plan_id, stage: params.stage, model: params.model,
      prompt_tokens: promptTokens, completion_tokens: completionTokens,
      total_tokens: totalTokens, cost_usd: rawCost,
    });

    // Deduct from user's USD wallet (only if we know user + charge > 0).
    // spend_credits will clamp/error if insufficient; we swallow that so the
    // AI response is never blocked mid-flight — pre-flight check gated entry.
    if (params.userId && chargeUsd > 0) {
      const meta = {
        model: params.model,
        stage: params.stage,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        raw_cost_usd: rawCost,
        markup,
      };
      const { error } = await supabaseAdmin.rpc("spend_credits", {
        _user_id: params.userId,
        _amount: chargeUsd as any,
        _reason: "ai_scan",
        _metadata: meta as any,
      });
      if (error && !error.message?.includes("INSUFFICIENT_CREDITS")) {
        console.warn("spend_credits (ai_scan) failed:", error.message);
      }
    }
  } catch (e) {
    console.warn("logAiCost failed:", (e as Error)?.message ?? e);
  }
}
