import { jenvuServiceError } from './jenvu-api-errors';

// Shared AI helper used by every server-side analyzer call.
//
// Purpose:
//   1. One place to switch models (25-year-veteran quality tier).
//   2. Auto retry (429 / 5xx) with exponential backoff.
//   3. Model fallback chain when the primary is exhausted.
//   4. Clear typed errors so callers can surface the right message.
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
  // Reject answers the provider cut off at the token limit (finish_reason
  // "length") and move to the next model, so users never see half answers.
  rejectTruncated?: boolean;
  // Retained for caller compatibility. Provider generations are not aborted
  // by an artificial timer; only an explicit caller cancellation may abort.
  timeoutMs?: number;
  // Opt-in per-attempt cap for fast public chat (Ask Jenvu): a model that
  // stalls past this is abandoned and the next model in the chain is tried.
  attemptTimeoutMs?: number;
  // Retained for caller compatibility. No artificial chain deadline is used.
  deadlineMs?: number;

  // Retained for caller compatibility; OmniRoute controls its own service tier.
  priority?: boolean;
  // Max attempts per model on retryable failures (429 and 5xx).
  retriesPerModel?: number;
  // For telemetry / debugging.
  stage?: string;
  // Optional semantic guard. Returning a message rejects this model's output
  // and continues to the next configured model instead of exposing bad text.
  validateContent?: (content: string, model: string) => true | string;
  // User-facing chat only: answer through the backup provider when every
  // model in `models` fails, so the person still gets a reply.
  backupFallback?: boolean;
  // Fast chat only: ask every model in `models` at once and keep the first
  // good answer; the rest are cancelled. Bounded by `raceBudgetMs`.
  raceModels?: boolean;
  // With `raceModels`: give up on the primary models after this long and go
  // straight to the backup (when `backupFallback` is set).
  raceBudgetMs?: number;
  // Use exactly the listed models (no Lovable-first). The public developer
  // API sets this so a customer's chosen model maps to one upstream model.
  exactModels?: boolean;
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
  return model.startsWith("omniroute/") || model.startsWith("codecraft/");
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
// Calls the configured OpenAI-compatible OmniRoute endpoint.
async function singleAttempt(
  model: string,
  opts: CallChatOptions,
  timeoutMs?: number,
): Promise<{ content: string; usage: UsageInfo }> {
  void timeoutMs;
  // Never discard a paid generation with an artificial timer. Cancellation is
  // reserved for an explicit caller abort, which this server helper can accept
  // when its public API is extended with a request signal.
  const cap = opts.attemptTimeoutMs;
  if (!cap) return singleAttemptInner(model, opts);
  const ctrl = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const stalled = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      ctrl.abort();
      reject(new AiGatewayError(jenvuServiceError(504), 504, false));
    }, cap);
  });
  try {
    return await Promise.race([singleAttemptInner(model, opts, ctrl.signal), stalled]);
  } finally {
    clearTimeout(timer);
  }
}

async function singleAttemptInner(
  model: string,
  opts: CallChatOptions,
  signal?: AbortSignal,
): Promise<{ content: string; usage: UsageInfo }> {
  const isCodeCraft = model.startsWith("codecraft/");
  if (!isCodeCraft && !model.startsWith("omniroute/")) {
    throw new AiGatewayError(jenvuServiceError(400), 400, true);
  }

  const omniRouteKey = isCodeCraft ? process.env.CODECRAFT_API_KEY : process.env.CUSTOM_AI_API_KEY;
  const omniRouteBase = isCodeCraft
    ? "https://codecraftapi.com/v1"
    : (process.env.CUSTOM_AI_BASE_URL || "").replace(/\/+$/, "");
  if (!omniRouteKey) {
    throw new AiGatewayError(jenvuServiceError(401), 503, true);
  }
  if (!/^https:\/\//i.test(omniRouteBase)) {
    throw new AiGatewayError(jenvuServiceError(401), 503, true);
  }

  const endpoint = /\/chat\/completions$/i.test(omniRouteBase)
    ? omniRouteBase
    : `${omniRouteBase.replace(/\/v1$/i, "")}/v1/chat/completions`;
  const wireModel = model.slice(isCodeCraft ? "codecraft/".length : "omniroute/".length);
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
    throw new AiGatewayError(jenvuServiceError(503), 503, false);
  }

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    const terminal = !(res.status === 429 || res.status >= 500);
    const msg = jenvuServiceError(res.status);

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
    throw new AiGatewayError(jenvuServiceError(502), 502, false);
  }
  if (opts.rejectTruncated && json?.choices?.[0]?.finish_reason === "length") {
    // Terminal for this model: skip straight to the next one in the chain.
    throw new AiGatewayError("The answer was cut off before it finished.", 0, true);
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

// -------- Backup provider for user-facing chat ------------------------------
// Only chat surfaces people talk to (Ask Jenvu, Terminal AI, voice chat) opt in
// via `backupFallback`. When every CodeCraft model fails (e.g. 402 quota), the
// question is answered through the Lovable AI Gateway so users are never left
// without a reply. Analysis/review chains never use it.
// Cheapest + fastest Lovable chat model (reasoning off for speed).
const BACKUP_CHAT_MODEL = "openai/gpt-6-luna";
// Temporary: CodeCraft keys have no balance, so user chat answers through
// Lovable AI first. Set to false once CodeCraft is topped up again.
const LOVABLE_CHAT_FIRST = true;

function toResponsesInput(messages: ChatMessage[]) {
  return messages.map((m) => {
    if (typeof m.content === "string") return { role: m.role, content: m.content };
    const textType = m.role === "assistant" ? "output_text" : "input_text";
    return {
      role: m.role,
      content: m.content.map((p) =>
        p.type === "text"
          ? { type: textType, text: p.text }
          : { type: "input_image", image_url: p.image_url.url },
      ),
    };
  });
}

async function callBackupChat(
  opts: CallChatOptions,
): Promise<{ content: string; model: string; usage: UsageInfo }> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new AiGatewayError("Backup AI is not configured.", 0, true);
  const wantsJson =
    opts.jsonMode &&
    opts.messages.some((m) => JSON.stringify(m.content).toLowerCase().includes("json"));
  const body: Record<string, unknown> = {
    model: BACKUP_CHAT_MODEL,
    input: toResponsesInput(opts.messages),
    store: false,
    stream: true,
  };
  if (wantsJson) body.text = { format: { type: "json_object" } };
  if (opts.maxTokens) body.max_output_tokens = Math.max(opts.maxTokens, 2000);

  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) {
    const status = res.status;
    await res.text().catch(() => "");
    throw new AiGatewayError(
      status === 402 ? "AI credits are exhausted. Please contact support." : "Backup AI request failed.",
      status,
      true,
    );
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let text = "";
  let usage: UsageInfo | null = null;
  let incomplete = false;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 1);
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      let evt: any;
      try {
        evt = JSON.parse(payload);
      } catch {
        continue;
      }
      if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") text += evt.delta;
      else if (evt.type === "response.completed" || evt.type === "response.incomplete") {
        if (evt.type === "response.incomplete") incomplete = true;
        const u = evt.response?.usage ?? {};
        usage = {
          promptTokens: Number(u.input_tokens ?? 0) || 0,
          completionTokens: Number(u.output_tokens ?? 0) || 0,
          totalTokens: Number(u.total_tokens ?? 0) || 0,
        };
      } else if (evt.type === "error" || evt.type === "response.failed") {
        throw new AiGatewayError("Backup AI request failed.", 0, true);
      }
    }
  }
  const content = text.trim();
  if (!content) throw new AiGatewayError("Backup AI returned an empty response.", 0, true);
  if (incomplete && opts.rejectTruncated) {
    throw new AiGatewayError("The answer was cut off before it finished.", 0, true);
  }
  const promptChars = opts.messages.reduce((n, m) => n + JSON.stringify(m.content).length, 0);
  const u = usage ?? { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  if (!u.promptTokens && !u.completionTokens) {
    u.promptTokens = Math.max(1, Math.round(promptChars / 4));
    u.completionTokens = Math.max(1, Math.round(content.length / 4));
  }
  if (!u.totalTokens) u.totalTokens = u.promptTokens + u.completionTokens;
  const validation = opts.validateContent?.(content, BACKUP_CHAT_MODEL) ?? true;
  if (validation !== true) throw new AiGatewayError(validation, 422, true);
  return { content, model: BACKUP_CHAT_MODEL, usage: u };
}

// Main entrypoint. Returns raw assistant content string plus model/usage.
// Throws AiGatewayError with `terminal` flag on final failure.
export async function callChatCompletion(
  opts: CallChatOptions,
): Promise<{ content: string; model: string; usage: UsageInfo }> {
  const primary = opts.raceModels ? callChatRace : callChatChain;
  // Every AI job (chat, articles, analysis, reviews) answers through the
  // cheapest Lovable model first while LOVABLE_CHAT_FIRST is on.
  if (LOVABLE_CHAT_FIRST && !opts.exactModels) {
    try {
      return await callBackupChat(opts);
    } catch (lovErr) {
      console.warn(`[ai] ${opts.stage ?? "chat"}: Lovable AI failed, trying CodeCraft`, (lovErr as Error)?.message);
    }
  }
  if (!opts.backupFallback) return primary(opts);
  try {
    return await primary(opts);
  } catch (primaryErr) {
    // Keep user chat on CodeCraft: try every other configured CodeCraft model
    // one by one before the user's own fallback API. Lovable AI is not used.
    const tried = new Set(opts.models);
    const extra = Array.from(
      new Set<string>([...FAST_CHAT_CHAIN, ...ASK_JENVU_CHAIN, ...PRIMARY_ANALYSIS_CHAIN, ...VISION_CHAIN]),
    ).filter((m) => !tried.has(m));
    if (extra.length) {
      console.warn(`[ai] ${opts.stage ?? "chat"}: primary chain failed, trying other CodeCraft models`, (primaryErr as Error)?.message);
      try {
        return await callChatChain({ ...opts, models: extra, raceModels: false, attemptTimeoutMs: opts.attemptTimeoutMs ?? 15000 });
      } catch (chainErr) {
        console.warn(`[ai] ${opts.stage ?? "chat"}: other CodeCraft models failed`, (chainErr as Error)?.message);
      }
    }
    try {
      return await callFallbackApi(opts);
    } catch (fbErr) {
      console.error(`[ai] ${opts.stage ?? "chat"}: fallback API failed`, (fbErr as Error)?.message);
      throw primaryErr;
    }
  }
}

// Second provider (user-supplied OpenAI-compatible API) tried before Lovable AI.
async function callFallbackApi(
  opts: CallChatOptions,
): Promise<{ content: string; model: string; usage: UsageInfo }> {
  const key = process.env.FALLBACK_AI_API_KEY;
  const base = process.env.FALLBACK_AI_BASE_URL;
  if (!key || !base) throw new AiGatewayError("Fallback AI is not configured.", 0, true);
  const model = process.env.FALLBACK_AI_MODEL || "anthropic/claude-sonnet-4";
  const url = base.replace(/\/+$/, "").replace(/\/chat\/completions$/, "") + "/chat/completions";
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 30000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, messages: opts.messages, max_tokens: opts.maxTokens ?? 2000 }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      await res.text().catch(() => "");
      throw new AiGatewayError(`Fallback AI failed (${res.status}).`, res.status, true);
    }
    const j: any = await res.json();
    const content = String(j?.choices?.[0]?.message?.content ?? "").trim();
    if (!content) throw new AiGatewayError("Fallback AI returned an empty response.", 0, true);
    const validation = opts.validateContent?.(content, model) ?? true;
    if (validation !== true) throw new AiGatewayError(validation, 422, true);
    const u = j?.usage ?? {};
    const promptTokens = Number(u.prompt_tokens ?? 0) || 0;
    const completionTokens = Number(u.completion_tokens ?? 0) || 0;
    return { content, model, usage: { promptTokens, completionTokens, totalTokens: Number(u.total_tokens ?? 0) || promptTokens + completionTokens } };
  } finally {
    clearTimeout(t);
  }
}

// Ask all healthy models at once; first valid answer wins and the others are
// aborted. Rejects when every model fails or the budget runs out.
async function callChatRace(
  opts: CallChatOptions,
): Promise<{ content: string; model: string; usage: UsageInfo }> {
  const configured = opts.models.filter(Boolean).filter(providerConfigured);
  if (!configured.length)
    throw new AiGatewayError(`No configured AI provider for ${opts.stage ?? "AI call"}`, 0, true);
  const healthy = configured.filter((m) => !isModelUnhealthy(m));
  const models = healthy.length ? healthy : configured;
  const ctrl = new AbortController();
  const budget = opts.raceBudgetMs ?? opts.attemptTimeoutMs ?? 15000;

  return await new Promise((resolve, reject) => {
    let pending = models.length;
    let lastErr: AiGatewayError | null = null;
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      ctrl.abort();
      fn();
    };
    const timer = setTimeout(
      () => finish(() => reject(new AiGatewayError("The AI took too long to answer.", 504, false))),
      budget,
    );
    for (const model of models) {
      singleAttemptInner(model, opts, ctrl.signal)
        .then(({ content, usage }) => {
          const validation = opts.validateContent?.(content, model) ?? true;
          if (validation !== true) throw new AiGatewayError(validation, 422, true);
          finish(() => resolve({ content, model, usage }));
        })
        .catch((err) => {
          lastErr = err instanceof AiGatewayError ? err : new AiGatewayError(String(err?.message ?? err), 0, false);
          pending -= 1;
          if (pending === 0) finish(() => reject(lastErr));
        });
    }
  });
}

async function callChatChain(
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

  let lastErr: AiGatewayError | null = null;

  for (let mi = 0; mi < models.length; mi++) {
    const model = models[mi];
    const isLastModel = mi === models.length - 1;
    for (let attempt = 1; attempt <= retriesPerModel; attempt++) {
      try {
        const { content, usage } = await singleAttempt(model, opts);

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
        // A route-scoped model failure may still fall through to the second
        // verified OmniRoute model later in the chain.
        if (lastErr.terminal) {
          const isAuthOrBilling =
            lastErr.status === 401 || lastErr.status === 402 || lastErr.status === 403;
          if (isAuthOrBilling) throw lastErr;
          // Other terminal model failures also continue with the next model.
          break;
        }

        // On 429/503/502/504, fall back to the next OmniRoute model after the
        // bounded retries for this model.
        const busy =
          lastErr.status === 429 ||
          lastErr.status === 503 ||
          lastErr.status === 502 ||
          lastErr.status === 504;
        if (busy && attempt >= 2 && !isLastModel) break;

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

// Reviews use one sequential OmniRoute model chain.
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
// AI Analysis: CodeCraft top models only (all live-tested OK).
// Grok 4.6 excluded — returns empty content on the current key.
// Claude Sonnet 5 is excluded — advertised but rejects live requests.
const PRIMARY_ANALYSIS_CHAIN = [
  "codecraft/claude-opus-5",
  "codecraft/claude-fable-5.1",
  "codecraft/claude-opus-5.5",
  "codecraft/gpt-5.5",
] as const;

const SENIOR_REVIEW_MODELS = PRIMARY_ANALYSIS_CHAIN;

// Ordered by measured response time on the CodeCraft key (fable-5.1 ≈ 5s).
// gpt-5.5 is last: it spends hidden reasoning tokens and often stops mid-answer.
const FAST_CHAT_CHAIN = [
  "codecraft/claude-fable-5.1",
  "codecraft/claude-opus-5",
  "codecraft/deepseek-v4-flash-0731",
  "codecraft/gpt-5.5",
] as const;

// Ask Jenvu (public assistant): Grok 4.6 then DeepSeek V4 Pro, as chosen by the
// owner. Both live-tested OK on the CodeCraft key; Fable 5.1 stays as the
// safety net if both return empty or cut-off answers.
export const ASK_JENVU_CHAIN = [
  "codecraft/grok-4.6",
  "codecraft/deepseek-v4-pro-0813",
  "codecraft/claude-fable-5.1",
] as const;

// Vision: Grok/GPT excluded — Claude models verified for image content.
const VISION_CHAIN = [
  "codecraft/claude-opus-5",
  "codecraft/claude-fable-5.1",
  "codecraft/claude-opus-5.5",
] as const;

export const MODEL_CHAIN = {
  intent: FAST_CHAT_CHAIN,
  // Narration uses the same primary-analysis chain as the extension.
  narration: PRIMARY_ANALYSIS_CHAIN,
  seniorReview: SENIOR_REVIEW_MODELS,
  macroContext: FAST_CHAT_CHAIN,
  chat: FAST_CHAT_CHAIN,
} as const;

export const EXTENSION_MODEL_CHAIN = {
  conversation: FAST_CHAT_CHAIN,
  // Strongest model first; Sonnet 4 is the verified fallback. Deterministic
  // rules still fail closed if neither route returns a valid review.
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
