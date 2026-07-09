// Server-only helper: compute approx $ cost from Lovable AI Gateway usage
// and log it to public.ai_cost_log. Fire-and-forget from the caller.
//
// Prices are USD per 1M tokens (input / output). These are approximations
// based on published upstream provider list prices — adjust here as pricing
// changes. If a model is unknown we log with cost_usd = 0 (still useful for
// scan volume tracking).

type Price = { in: number; out: number };

const MODEL_PRICING: Record<string, Price> = {
  // OpenAI (approximate list prices, USD / 1M tokens)
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

  // Google (approximate list prices, USD / 1M tokens)
  "google/gemini-2.5-pro": { in: 1.25, out: 10.0 },
  "google/gemini-2.5-flash": { in: 0.075, out: 0.3 },
  "google/gemini-2.5-flash-lite": { in: 0.04, out: 0.15 },
  "google/gemini-3-flash-preview": { in: 0.1, out: 0.4 },
  "google/gemini-3.1-pro-preview": { in: 1.5, out: 12.0 },
  "google/gemini-3.1-flash-lite": { in: 0.05, out: 0.2 },
  "google/gemini-3.5-flash": { in: 0.15, out: 0.6 },
};

export function estimateCostUsd(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
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
    if (params.userId) {
      const { data } = await supabaseAdmin
        .from("user_subscriptions")
        .select("plan_id")
        .eq("user_id", params.userId)
        .maybeSingle();
      plan_id = (data?.plan_id as string | undefined) ?? null;
    }

    const promptTokens = Math.max(0, params.usage.promptTokens | 0);
    const completionTokens = Math.max(0, params.usage.completionTokens | 0);
    const totalTokens = params.usage.totalTokens ?? promptTokens + completionTokens;
    const cost = estimateCostUsd(params.model, promptTokens, completionTokens);

    await supabaseAdmin.from("ai_cost_log").insert({
      user_id: params.userId,
      plan_id,
      stage: params.stage,
      model: params.model,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: totalTokens,
      cost_usd: cost,
    });
  } catch (e) {
    // Never let cost logging break the user request.
    console.warn("logAiCost failed:", (e as Error)?.message ?? e);
  }
}
