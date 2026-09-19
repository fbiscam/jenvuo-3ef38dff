// Shared OmniRoute AI helper used by every server-side analyzer call.
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

export type ChatContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string; detail?: "low" | "high" | "auto" } };

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string | ChatContentPart[];
};

export type CallChatOptions = {
  // Ordered list: try [0] first; if it exhausts retries, try [1]; etc.
  models: string[];
  messages: ChatMessage[];
  // Force JSON response mode (uses response_format: json_object).
  jsonMode?: boolean;
  maxTokens?: number;
  // Retained for caller compatibility. Provider generations are not aborted
  // by an artificial timer; only an explicit caller cancellation may abort.
  timeoutMs?: number;
  // Retained for caller compatibility. No artificial chain deadline is used.
  deadlineMs?: number;

  // If true and the model supports priority tier, request fast mode.
  priority?: boolean;
  // Max attempts per model on retryable failures (429, 5xx, timeout).
  retriesPerModel?: number;
  // For telemetry / debugging.
  stage?: string;
  // Optional semantic guard. Returning a message rejects this model's output
  // and continues to the next configured model instead of exposing bad text.
  validateContent?: (content: string, model: string) => true | string;
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

function providerConfigured(model: string): boolean {
  // OmniRoute is the sole inference provider. Credential validation happens
  // inside the request attempt so a missing deployment binding is reported
  // accurately instead of being mistaken for an empty model chain.
  return model.startsWith("omniroute/");
}

// -------- Per-worker model health cache -----------------------------------
// When a model returns "model_not_found" (503/404) or a hard upstream error
// (500 "do_request_failed", ngrok offline), we mark it unhealthy for a TTL
// so the next chain-walk skips it instead of paying its full timeout.
const modelUnhealthyUntil = new Map<string, number>();
export function markModelUnhealthy(model: string, ttlMs: number): void {
  modelUnhealthyUntil.set(model, Date.now() + ttlMs);
}
export function isModelUnhealthy(model: string): boolean {
  const until = modelUnhealthyUntil.get(model);
  if (!until) return false;
  if (until < Date.now()) {
    modelUnhealthyUntil.delete(model);
    return false;
  }
  return true;
}

export type UsageInfo = { promptTokens: number; completionTokens: number; totalTokens: number };

// -------- OmniRoute request adapter -----------------------------------------
// Browser Use exposes these hosted models through asynchronous agent runs,
// rather than an OpenAI-compatible chat-completions endpoint. Translate the
// conversation into a self-contained task, upload any chart images, and poll
// the bounded run until it reaches a terminal state.
async function singleAttempt(
  model: string,
  opts: CallChatOptions,
  timeoutMs?: number,
): Promise<{ content: string; usage: UsageInfo }> {
  void timeoutMs;
  // Never discard a paid generation with an artificial timer. Cancellation is
  // reserved for an explicit caller abort, which this server helper can accept
  // when its public API is extended with a request signal.
  return singleAttemptInner(model, opts);
}

async function singleAttemptInner(
  model: string,
  opts: CallChatOptions,
  signal?: AbortSignal,
): Promise<{ content: string; usage: UsageInfo }> {
  if (!model.startsWith("omniroute/")) {
    throw new AiGatewayError(`Only OmniRoute models are allowed: ${model}`, 400, true);
  }

  const omniRouteKey = process.env.CUSTOM_AI_API_KEY;
  const omniRouteBase = (process.env.CUSTOM_AI_BASE_URL || "").replace(/\/+$/, "");
  if (!omniRouteKey) {
    throw new AiGatewayError("OmniRoute API key is missing on the published server.", 0, true);
  }
  if (!/^https:\/\//i.test(omniRouteBase)) {
    throw new AiGatewayError("OmniRoute server address is missing on the published server.", 0, true);
  }

  const endpoint = /\/chat\/completions$/i.test(omniRouteBase)
    ? omniRouteBase
    : `${omniRouteBase.replace(/\/v1$/i, "")}/v1/chat/completions`;
  const wireModel = model.slice("omniroute/".length);
  const body: Record<string, unknown> = {
    model: wireModel,
    messages: opts.messages,
    temperature: 0,
  };
  if (opts.jsonMode) body.response_format = { type: "json_object" };
  if (opts.maxTokens) body.max_tokens = opts.maxTokens;

  let res: Response;
  try {
    res = await fetch(endpoint, {
      ...(signal ? { signal } : {}),
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${omniRouteKey}`,
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new AiGatewayError("OmniRoute could not be reached. Please retry in a moment.", 0, false);
  }

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    const terminal = !(res.status === 429 || res.status >= 500);
    let msg: string;
    if (res.status === 429 || res.status >= 500) msg = "OmniRoute is busy. Please retry in a moment.";
    else if (res.status === 402) msg = "OmniRoute credits are exhausted. Please contact support.";
    else if (res.status === 401) msg = "OmniRoute API key was rejected. Please contact support.";
    else if (res.status === 403) msg = "OmniRoute access is blocked. Please contact support.";
    else if (res.status === 400) msg = "OmniRoute rejected the analysis request. Please contact support.";
    else if (res.status === 404) msg = "The selected OmniRoute model is unavailable.";
    else msg = "OmniRoute request failed. Please retry in a moment.";

    const retryAfter = res.headers.get("retry-after");
    const retryAfterMs = retryAfter
      ? Number.isFinite(+retryAfter)
        ? +retryAfter * 1000
        : Math.max(0, Date.parse(retryAfter) - Date.now())
      : 0;
    const error = new AiGatewayError(msg, res.status, terminal);
    (error as AiGatewayError & { retryAfterMs?: number }).retryAfterMs =
      Number.isFinite(retryAfterMs) && retryAfterMs > 0 ? Math.min(retryAfterMs, 8000) : 0;

    const detail = txt.toLowerCase();
    if (res.status === 404 || detail.includes("model_not_found") || detail.includes("no available channel")) {
      markModelUnhealthy(model, 15 * 60 * 1000);
    } else if (res.status >= 500 && /upstream error|do_request_failed|endpoint.*offline|err_ngrok/.test(detail)) {
      markModelUnhealthy(model, 5 * 60 * 1000);
    }
    throw error;
  }

  const json: any = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new AiGatewayError("OmniRoute returned an empty response.", 0, false);
  }
  const usageRaw = json?.usage ?? {};
  let promptTokens = Number(usageRaw.prompt_tokens ?? usageRaw.promptTokens ?? 0) || 0;
  let completionTokens = Number(usageRaw.completion_tokens ?? usageRaw.completionTokens ?? 0) || 0;
  let totalTokens = Number(usageRaw.total_tokens ?? usageRaw.totalTokens ?? 0) || 0;
  if (promptTokens === 0 && completionTokens === 0) {
    const promptChars = opts.messages.reduce(
      (count, message) => count + (typeof message.content === "string" ? message.content.length : JSON.stringify(message.content).length),
      0,
    );
    promptTokens = Math.max(1, Math.round(promptChars / 4));
    completionTokens = Math.max(1, Math.round(content.length / 4));
  }
  if (totalTokens === 0) totalTokens = promptTokens + completionTokens;
  return { content: content.trim(), usage: { promptTokens, completionTokens, totalTokens } };
}

// Main entrypoint. Returns raw assistant content string plus model/usage.
// Throws AiGatewayError with `terminal` flag on final failure.
export async function callChatCompletion(
  opts: CallChatOptions,
): Promise<{ content: string; model: string; usage: UsageInfo }> {
  const retriesPerModel = Math.max(1, opts.retriesPerModel ?? 3);
  const configured = opts.models.filter(Boolean).filter(providerConfigured);
  if (!configured.length)
    throw new AiGatewayError(`No configured AI provider for ${opts.stage ?? "AI call"}`, 0, true);
  // Skip models that recently returned model_not_found or hard upstream errors.
  // If every candidate is cooling, fall back to the original list so we still
  // attempt (in case the outage cleared).
  const healthy = configured.filter((m) => !isModelUnhealthy(m));
  const models = healthy.length ? healthy : configured;

  // Wall-clock budget for the whole chain walk, so a stalled provider cannot
  // consume the caller's entire request.
  const startedAt = Date.now();
  const chainDeadline = Math.max(10_000, opts.deadlineMs ?? 180_000);
  const remaining = () => chainDeadline - (Date.now() - startedAt);

  let lastErr: AiGatewayError | null = null;
  let attemptedModels = 0;

  for (let mi = 0; mi < models.length; mi++) {
    const model = models[mi];
    const isLastModel = mi === models.length - 1;
    attemptedModels++;
    for (let attempt = 1; attempt <= retriesPerModel; attempt++) {
      if (remaining() <= 0) {
        lastErr =
          lastErr ?? new AiGatewayError("AI analysis timed out. Please try again.", 0, false);
        break;
      }
      try {
        const perAttempt = Math.min(
          Math.max(5_000, opts.timeoutMs ?? 90_000),
          Math.max(5_000, remaining()),
        );
        const { content, usage } = await singleAttempt(model, opts, perAttempt);

        const validation = opts.validateContent?.(content, model) ?? true;
        if (validation !== true) {
          lastErr = new AiGatewayError(validation, 422, true);
          break;
        }

        return { content, model, usage };
      } catch (err) {
        lastErr =
          err instanceof AiGatewayError
            ? err
            : new AiGatewayError(String((err as any)?.message ?? err), 0, false);

        // Terminal errors must not be retried against the same provider.
        // A provider-scoped auth/billing failure may still fall through to a
        // separately configured provider later in the chain.
        if (lastErr.terminal) {
          const isAuthOrBilling =
            lastErr.status === 401 || lastErr.status === 402 || lastErr.status === 403;
          if (isAuthOrBilling && !isLastModel) break;
          if (isAuthOrBilling) throw lastErr;
          // Other terminal model failures also continue with the next model.
          break;
        }

        // On 429/503/502/504 or timeout (status 0), fall back to the next
        // provider immediately on the last retry attempt for this model.
        const busy =
          lastErr.status === 429 ||
          lastErr.status === 503 ||
          lastErr.status === 502 ||
          lastErr.status === 504;
        if (busy && attempt >= 2 && !isLastModel) break; // hop provider fast

        if (attempt === retriesPerModel) break;

        // Exponential backoff w/ jitter, honoring upstream Retry-After (capped).
        const retryAfterMs = (lastErr as any).retryAfterMs as number | undefined;
        const base =
          retryAfterMs && retryAfterMs > 0 ? retryAfterMs : 500 * Math.pow(2, attempt - 1);
        const jitter = Math.floor(Math.random() * 250);
        await sleep(Math.min(6000, base + jitter));
      }
    }
  }

  // Never expose the final provider's credential error as though the user's
  // Jenvu extension key were invalid. In a multi-provider chain it only means
  // every upstream route was unavailable, depleted, or rejected.
  if (
    attemptedModels > 1 &&
    lastErr &&
    (lastErr.status === 401 || lastErr.status === 402 || lastErr.status === 403)
  ) {
    throw new AiGatewayError(
      "AI analysis is temporarily unavailable. Please retry in a moment.",
      503,
      false,
    );
  }

  throw lastErr ?? new AiGatewayError("AI call failed with no error captured", 0, false);
}

// -------- JSON convenience wrapper with brace-repair -----------------------

export function tryParseJsonLoose(raw: string): any {
  const tryParse = (s: string) => {
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  };
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
const RATE_LIMIT_MAX = 30; // requests
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
  if (e.expiresAt < Date.now()) {
    planCache.delete(key);
    return null;
  }
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

// Senior review = SEQUENTIAL "best-available" chain.
// Ordered strongest → weakest. The runner tries #1 first; if that model is
// down / rate-limited / times out, it hops to the next best one that responds.
// Health cache: markModelUnhealthy() is called automatically on 404 /
// model_not_found / "upstream do_request_failed" / ngrok-offline, so the next
// chain-walk skips a known-dead endpoint instead of paying its timeout.
// TTLs: 15 min for "model_not_found" (not provisioned), 5 min for flaky
// upstream. If every candidate is cooling, we still try the whole chain.

// OmniRoute is the ONLY provider in use. Every chain below resolves through
// CUSTOM_AI_BASE_URL and uses only models re-verified live under load
// (5 concurrent requests each, all 5/5 OK):
//   kr/claude-sonnet-4.5 — strongest verified model; primary for analysis/chat
//   kr/claude-sonnet-4   — second-best verified fallback
// Sonnet 5 is advertised by /models but currently rejects live requests, so it
// is intentionally excluded until the upstream active catalog supports it.
const PRIMARY_ANALYSIS_CHAIN = [
  "omniroute/kr/claude-sonnet-4.5",
  "omniroute/kr/claude-sonnet-4",
] as const;

const SENIOR_REVIEW_MODELS = [
  "omniroute/kr/claude-sonnet-4.5",
  "omniroute/kr/claude-sonnet-4",
] as const;

const FAST_CHAT_CHAIN = [
  "omniroute/kr/claude-sonnet-4.5",
  "omniroute/kr/claude-sonnet-4",
] as const;

// Vision: GLM-5 is excluded — it does not accept image content.
const VISION_CHAIN = [
  "omniroute/kr/claude-sonnet-4.5",
  "omniroute/kr/claude-sonnet-4",
] as const;

export const MODEL_CHAIN = {
  intent: FAST_CHAT_CHAIN,
  // Auto-scan narration now runs the same primary-analysis chain as the
  // extension, followed by the same senior review.
  narration: PRIMARY_ANALYSIS_CHAIN,
  seniorReview: SENIOR_REVIEW_MODELS,
  macroContext: FAST_CHAT_CHAIN,
  chat: FAST_CHAT_CHAIN,
} as const;

export const EXTENSION_MODEL_CHAIN = {
  conversation: FAST_CHAT_CHAIN,
  // Extension analysis intentionally uses one strongest model. Deterministic
  // rules fail closed if this review is unavailable; no weaker model silently
  // changes the behavior of the same setup.
  // Strongest model first; the remaining verified routes are only used when
  // the primary one is down, so analysis never fails outright.
  reasoning: PRIMARY_ANALYSIS_CHAIN,
  vision: VISION_CHAIN,
  seniorReview: SENIOR_REVIEW_MODELS,
  // Alias retained for callers that identify the senior pass as review #2.
  secondReview: SENIOR_REVIEW_MODELS,
} as const;

export const MACRO_CONTEXT_CHAIN = FAST_CHAT_CHAIN;
export const SENIOR_REVIEW_CHAIN = SENIOR_REVIEW_MODELS;

export const DEEPSEEK_REVIEW_CHAIN = SENIOR_REVIEW_MODELS;

/** @deprecated legacy alias — use DEEPSEEK_REVIEW_CHAIN */
export const CROSS_CHECK_CHAIN = DEEPSEEK_REVIEW_CHAIN;
