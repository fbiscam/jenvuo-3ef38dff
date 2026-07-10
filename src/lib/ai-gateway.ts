// Shared Lovable AI Gateway helper used by every server-side analyzer call.
//
// Purpose:
//   1. One place to switch models (25-year-veteran quality tier).
//   2. Auto retry (429 / 5xx / timeout) with exponential backoff.
//   3. Model fallback chain when the primary is exhausted.
//   4. Priority-tier ("fast mode") only for models that support it.
//   5. Clear typed errors so callers can surface the right message.
//
// This module has NO Supabase / Node-only imports, so it can be top-level
// imported from *.functions.ts without leaking a server-only surface.

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

// Models that support the OpenAI priority serving tier (fast mode).
// Anything else must not send service_tier: "priority".
const PRIORITY_TIER_MODELS = new Set([
  "openai/gpt-5",
  "openai/gpt-5-mini",
  "openai/gpt-5.2",
  "openai/gpt-5.4",
  "openai/gpt-5.4-mini",
  "openai/gpt-5.5",
]);

export type CallChatOptions = {
  // Ordered list: try [0] first; if it exhausts retries, try [1]; etc.
  models: string[];
  messages: ChatMessage[];
  // Force JSON response mode (uses response_format: json_object).
  jsonMode?: boolean;
  maxTokens?: number;
  // Milliseconds per attempt. Defaults to 25000.
  timeoutMs?: number;
  // If true and the model supports priority tier, request fast mode.
  priority?: boolean;
  // Max attempts per model on retryable failures (429, 5xx, timeout).
  retriesPerModel?: number;
  // For telemetry / debugging.
  stage?: string;
};

export class AiGatewayError extends Error {
  status: number;
  terminal: boolean;
  constructor(message: string, status: number, terminal: boolean) {
    super(message);
    this.status = status;
    this.terminal = terminal;
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export type UsageInfo = { promptTokens: number; completionTokens: number; totalTokens: number };

async function singleAttempt(
  model: string,
  opts: CallChatOptions,
  apiKey: string,
  timeoutMs: number,
): Promise<{ content: string; usage: UsageInfo }> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  // Route by prefix:
  //   `blackboxai/*` → Blackbox API
  //   `nvapi/*`      → NVIDIA Integrate API (strip prefix to get real model id)
  //   else           → Lovable AI Gateway
  const isBlackbox = model.startsWith("blackboxai/");
  const isNvidia = model.startsWith("nvapi/");
  const blackboxKey = process.env.BLACKBOX_API_KEY;
  const nvidiaKey = process.env.NVIDIA_API_KEY;

  const endpoint = isBlackbox
    ? "https://api.blackbox.ai/v1/chat/completions"
    : isNvidia
    ? "https://integrate.api.nvidia.com/v1/chat/completions"
    : "https://ai.gateway.lovable.dev/v1/chat/completions";

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (isBlackbox) {
    if (!blackboxKey) throw new AiGatewayError("BLACKBOX_API_KEY missing on server", 0, true);
    headers["Authorization"] = `Bearer ${blackboxKey}`;
  } else if (isNvidia) {
    if (!nvidiaKey) throw new AiGatewayError("NVIDIA_API_KEY missing on server", 0, true);
    headers["Authorization"] = `Bearer ${nvidiaKey}`;
  } else {
    headers["Lovable-API-Key"] = apiKey;
  }

  // Strip `nvapi/` prefix to expose the real NVIDIA model id (e.g. `deepseek-ai/deepseek-v4-pro`).
  const wireModel = isNvidia ? model.slice("nvapi/".length) : model;

  const body: Record<string, unknown> = {
    model: wireModel,
    messages: opts.messages,
  };
  // Neither Blackbox nor NVIDIA reliably support json_object response_format — rely on system prompt.
  if (opts.jsonMode && !isBlackbox && !isNvidia) body.response_format = { type: "json_object" };
  if (opts.maxTokens) {
    if (!isBlackbox && !isNvidia && model.startsWith("openai/gpt-5")) {
      body.max_completion_tokens = opts.maxTokens;
    } else {
      body.max_tokens = opts.maxTokens;
    }
  }
  if (!isBlackbox && !isNvidia && opts.priority && PRIORITY_TIER_MODELS.has(model)) {
    body.service_tier = "priority";
  }


  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err: any) {
    clearTimeout(t);
    if (err?.name === "AbortError") {
      throw new AiGatewayError(`Timeout after ${timeoutMs}ms`, 0, false);
    }
    throw new AiGatewayError(`Network error: ${err?.message ?? err}`, 0, false);
  }
  clearTimeout(t);

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    // Blackbox/NVIDIA: treat 400/403 as non-terminal so we fallback to the next model.
    const terminal = (isBlackbox || isNvidia)
      ? !(res.status === 429 || res.status >= 500 || res.status === 403 || res.status === 400)
      : !(res.status === 429 || res.status >= 500);
    let msg: string;
    if (res.status === 429) msg = "AI is rate-limited right now. Please retry in a moment.";
    else if (res.status === 402) msg = "AI credits exhausted. Please top up your workspace.";
    else if (res.status === 401) msg = "AI key rejected. Please contact support.";
    else if (res.status === 400) msg = `AI request rejected: ${txt.slice(0, 200)}`;
    else msg = `AI error ${res.status}: ${txt.slice(0, 200)}`;
    throw new AiGatewayError(msg, res.status, terminal);
  }

  const json: any = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.length) {
    throw new AiGatewayError("AI returned empty response.", 0, false);
  }
  const u = json?.usage ?? {};
  const usage: UsageInfo = {
    promptTokens: Number(u.prompt_tokens ?? u.promptTokens ?? 0) || 0,
    completionTokens: Number(u.completion_tokens ?? u.completionTokens ?? 0) || 0,
    totalTokens: Number(u.total_tokens ?? u.totalTokens ?? 0) || 0,
  };
  return { content, usage };
}


// Main entrypoint. Returns raw assistant content string plus model/usage.
// Throws AiGatewayError with `terminal` flag on final failure.
export async function callChatCompletion(opts: CallChatOptions): Promise<{ content: string; model: string; usage: UsageInfo }> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new AiGatewayError("LOVABLE_API_KEY missing on server", 0, true);


  const timeoutMs = opts.timeoutMs ?? 25000;
  const retriesPerModel = Math.max(1, opts.retriesPerModel ?? 3);
  const models = opts.models.filter(Boolean);
  if (!models.length) throw new AiGatewayError("No models configured", 0, true);

  let lastErr: AiGatewayError | null = null;

  for (const model of models) {
    for (let attempt = 1; attempt <= retriesPerModel; attempt++) {
      try {
        const { content, usage } = await singleAttempt(model, opts, apiKey, timeoutMs);
        return { content, model, usage };
      } catch (err) {
        lastErr = err instanceof AiGatewayError
          ? err
          : new AiGatewayError(String((err as any)?.message ?? err), 0, false);

        if (lastErr.terminal) throw lastErr;
        if (attempt === retriesPerModel) break;
        await sleep(500 * Math.pow(2, attempt - 1));
      }
    }
  }

  throw lastErr ?? new AiGatewayError("AI call failed with no error captured", 0, false);
}

// -------- JSON convenience wrapper with brace-repair -----------------------

export function tryParseJsonLoose(raw: string): any {
  const tryParse = (s: string) => { try { return JSON.parse(s); } catch { return null; } };
  const clean = (s: string) =>
    s
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .replace(/[\x00-\x1F\x7F]/g, " ")
      .replace(/,\s*([}\]])/g, "$1");

  let parsed = tryParse(raw);
  if (parsed) return parsed;

  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) return {};
  parsed = tryParse(m[0]) ?? tryParse(clean(m[0]));
  if (parsed) return parsed;

  // Auto-close unbalanced brackets.
  let s = clean(m[0]);
  const opens = (s.match(/\{/g) || []).length - (s.match(/\}/g) || []).length;
  const opensA = (s.match(/\[/g) || []).length - (s.match(/\]/g) || []).length;
  s = s.replace(/,\s*$/, "") + "]".repeat(Math.max(0, opensA)) + "}".repeat(Math.max(0, opens));
  return tryParse(s) ?? {};
}

// -------- Per-user soft rate limit (in-memory, per worker) -----------------

type Bucket = { count: number; resetAt: number };
const rateBuckets = new Map<string, Bucket>();
const RATE_LIMIT_MAX = 30;         // requests
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // per hour

export function checkAnalyzeRateLimit(userId: string): { allowed: boolean; retryInSec: number } {
  const now = Date.now();
  const b = rateBuckets.get(userId);
  if (!b || b.resetAt < now) {
    rateBuckets.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, retryInSec: 0 };
  }
  if (b.count >= RATE_LIMIT_MAX) {
    return { allowed: false, retryInSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) };
  }
  b.count++;
  return { allowed: true, retryInSec: 0 };
}

// -------- Per-symbol short-lived plan cache (in-memory, per worker) --------

type CacheEntry<T> = { value: T; expiresAt: number };
const planCache = new Map<string, CacheEntry<unknown>>();
const PLAN_CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes

export function getCachedPlan<T>(key: string): T | null {
  const e = planCache.get(key);
  if (!e) return null;
  if (e.expiresAt < Date.now()) { planCache.delete(key); return null; }
  return e.value as T;
}

export function setCachedPlan<T>(key: string, value: T, ttlMs: number = PLAN_CACHE_TTL_MS): void {
  planCache.set(key, { value, expiresAt: Date.now() + ttlMs });
  // Light eviction: cap at 200 entries.
  if (planCache.size > 200) {
    const oldestKey = planCache.keys().next().value;
    if (oldestKey) planCache.delete(oldestKey);
  }
}

// -------- Model chains (single source of truth) ----------------------------

export const MODEL_CHAIN = {
  // Voice / intent detection — cheap, fast classifier.
  intent: ["google/gemini-3.1-flash-lite", "google/gemini-3-flash-preview"],

  // Chart narration — deep ICT/SMC reasoning.
  // Primary: NVIDIA DeepSeek V4 Pro (top-tier reasoning + math for SL/TP/RR).
  // Fallback: NVIDIA DeepSeek V4 Flash → Lovable Gateway GPT-5.4.
  narration: [
    "nvapi/deepseek-ai/deepseek-v4-pro",
    "nvapi/deepseek-ai/deepseek-v4-flash",
    "openai/gpt-5.4",
  ],

  // Senior 25-year-trader review (A / A+ verdict) — finance-tuned primary.
  // Primary: Palmyra-Fin (SEC/finance-tuned). Fallback: DeepSeek V4 Pro → GPT-5.5.
  seniorReview: [
    "nvapi/writer/palmyra-fin-70b-32k",
    "nvapi/deepseek-ai/deepseek-v4-pro",
    "openai/gpt-5.5",
  ],

  // Conversational chat around signals — free-tier Gemini models.
  chat: ["google/gemini-3.1-flash-lite", "google/gemini-3-flash-preview", "google/gemini-2.5-flash-lite"],
} as const;
