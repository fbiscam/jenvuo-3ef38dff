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

// Flat charge per real signal (BUY/SELL only). WAIT/no-trade scans are free.
export const SIGNAL_SCAN_CHARGE_USD = 0.20;
export const SIGNAL_SCAN_CHARGE_WITH_SENIOR_USD = 0.25;

// Pretty label for the AI model used, shown in billing history.
export function formatModelLabel(rawModel: string | null | undefined): string {
  if (!rawModel) return "—";
  const m = String(rawModel).toLowerCase();
  // Strip provider prefix (bmind/, openai/, nvapi/, google/, etc.)
  const bare = m.replace(/^(bmind|openai|nvapi|google|nvapi\/openai|nvapi\/deepseek-ai|bmind\/deepseek-ai)\//g, "").replace(/^deepseek-ai\//, "");
  if (bare.startsWith("gpt-5.5-pro")) return "ChatGPT 5.5 Pro";
  if (bare.startsWith("gpt-5.5")) return "ChatGPT 5.5";
  if (bare.startsWith("gpt-5.4-pro")) return "ChatGPT 5.4 Pro";
  if (bare.startsWith("gpt-5.4-mini")) return "ChatGPT 5.4 Mini";
  if (bare.startsWith("gpt-5.4-nano")) return "ChatGPT 5.4 Nano";
  if (bare.startsWith("gpt-5.4")) return "ChatGPT 5.4";
  if (bare.startsWith("gpt-5.2")) return "ChatGPT 5.2";
  if (bare.startsWith("gpt-5-mini")) return "ChatGPT 5 Mini";
  if (bare.startsWith("gpt-5-nano")) return "ChatGPT 5 Nano";
  if (bare.startsWith("gpt-5")) return "ChatGPT 5";
  if (bare.startsWith("gpt-oss-120b")) return "GPT-OSS 120B";
  if (bare.startsWith("deepseek-v4-pro")) return "DeepSeek V4 Pro";
  if (bare.startsWith("gemini-3.1-pro")) return "Gemini 3.1 Pro";
  if (bare.startsWith("gemini-3.5-flash")) return "Gemini 3.5 Flash";
  if (bare.startsWith("gemini-3-flash")) return "Gemini 3 Flash";
  if (bare.startsWith("gemini-2.5-pro")) return "Gemini 2.5 Pro";
  if (bare.startsWith("gemini-2.5-flash-lite")) return "Gemini 2.5 Flash Lite";
  if (bare.startsWith("gemini-2.5-flash")) return "Gemini 2.5 Flash";
  return bare.replace(/^gpt-/, "GPT ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// Pure logging — writes tokens & raw cost to ai_cost_log. Does NOT deduct
// from the user's wallet. Actual billing is a single flat charge per real
// signal, applied via chargeSignalScan() below.
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
    const rawCost = estimateCostUsd(params.model, promptTokens, completionTokens);

    await supabaseAdmin.from("ai_cost_log").insert({
      user_id: params.userId, plan_id, stage: params.stage, model: params.model,
      prompt_tokens: promptTokens, completion_tokens: completionTokens,
      total_tokens: totalTokens, cost_usd: rawCost,
    });
  } catch (e) {
    console.warn("logAiCost failed:", (e as Error)?.message ?? e);
  }
}

// Flat per-signal billing. Charges SIGNAL_SCAN_CHARGE_USD only if the
// analysis produced a real BUY or SELL. WAIT / no-trade returns are free.
export async function chargeSignalScan(params: {
  userId: string | null;
  direction: "BUY" | "SELL" | "WAIT" | string;
  model: string | null;
  seniorModel?: string | null;
  symbol?: string | null;
  scanId?: string | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  grade?: string | null;
  score?: number | null;
}): Promise<void> {
  if (!params.userId) return;
  const dir = String(params.direction || "").toUpperCase();
  if (dir !== "BUY" && dir !== "SELL") return;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const pTok = Math.max(0, params.promptTokens ?? 0);
    const cTok = Math.max(0, params.completionTokens ?? 0);
    const seniorRan = Boolean(params.seniorModel);
    const amount = seniorRan ? SIGNAL_SCAN_CHARGE_WITH_SENIOR_USD : SIGNAL_SCAN_CHARGE_USD;
    const meta: Record<string, unknown> = {
      model: params.model ?? null,
      model_label: params.model ? formatModelLabel(params.model) : null,
      senior_model: params.seniorModel ?? null,
      senior_model_label: params.seniorModel ? formatModelLabel(params.seniorModel) : null,
      stage: "signal",
      direction: dir,
      prompt_tokens: pTok,
      completion_tokens: cTok,
      grade: params.grade ?? null,
      score: params.score ?? null,
      senior_review: seniorRan,
      charge_usd: amount,
    };
    if (params.symbol) meta.symbol = params.symbol;
    if (params.scanId) meta.scanId = params.scanId;
    const { error } = await supabaseAdmin.rpc("spend_credits", {
      _user_id: params.userId,
      _amount: amount as any,
      _reason: "ai_scan",
      _metadata: meta as any,
    });
    if (error && !error.message?.includes("INSUFFICIENT_CREDITS")) {
      console.warn("chargeSignalScan spend_credits failed:", error.message);
    }
  } catch (e) {
    console.warn("chargeSignalScan failed:", (e as Error)?.message ?? e);
  }
}
