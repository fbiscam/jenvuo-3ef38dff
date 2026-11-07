// Dashboard Chat playground: lets a signed-in user try any Jenvu API model.
// Same plan, balance, daily-limit and $3/1M-token billing as the public API.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PLAYGROUND_DEFAULT_MODEL, buildPlaygroundMessages, clampMaxTokens, sanitizePlaygroundImages, type PlaygroundTurn } from "@/lib/playground";

export const playgroundChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => {
    const obj = (d ?? {}) as { model?: unknown; turns?: unknown; instructions?: unknown; maxTokens?: unknown; images?: unknown; jobId?: unknown };
    const turns: PlaygroundTurn[] = Array.isArray(obj.turns)
      ? obj.turns
          .map((t) => t as { role?: unknown; content?: unknown })
          .filter((t) => (t.role === "user" || t.role === "assistant") && typeof t.content === "string")
          .map((t) => ({ role: t.role as PlaygroundTurn["role"], content: String(t.content) }))
      : [];
    return {
      model: typeof obj.model === "string" ? obj.model : "",
      turns,
      instructions: typeof obj.instructions === "string" ? obj.instructions : "",
      maxTokens: clampMaxTokens(obj.maxTokens),
      images: sanitizePlaygroundImages(obj.images),
      jobId: typeof obj.jobId === "string" && UUID_RE.test(obj.jobId) ? obj.jobId : null,
    };
  })
  .handler(async ({ data, context }) => {
    const { idActionBlock } = await import("@/lib/id-gate.server");
    const idBlocked = await idActionBlock(context.userId);
    if (idBlocked) return { ok: false as const, error: idBlocked };
    if (!data.jobId) return runPlaygroundChat(data, context.userId, async () => true);
    // The reply keeps being written (and saved) even if the user leaves the page or closes the site.
    const jobId = data.jobId;
    const { error } = await context.supabase.from("chat_jobs").insert({ id: jobId, user_id: context.userId, status: "running" });
    if (error) return runPlaygroundChat(data, context.userId, async () => true);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const stillWanted = async () => {
      const { data: row } = await supabaseAdmin.from("chat_jobs").select("status").eq("id", jobId).maybeSingle();
      return row?.status !== "stopped";
    };
    const { keepAlive } = await import("@/lib/keep-alive.server");
    return keepAlive(
      (async () => {
        const res = await runPlaygroundChat(data, context.userId, stillWanted).catch(() => ({
          ok: false as const,
          error: "The model couldn't answer. Please try again.",
        }));
        await supabaseAdmin
          .from("chat_jobs")
          .update({ status: res.ok ? "done" : "error", result: res as never, updated_at: new Date().toISOString() })
          .eq("id", jobId)
          .eq("status", "running");
        return res;
      })(),
    );
  });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Reads a background reply (after the user came back to Chat). */
export const getChatJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ({ id: String((d as { id?: unknown })?.id ?? "") }))
  .handler(async ({ data, context }) => {
    if (!UUID_RE.test(data.id)) return { status: "missing" as const, result: null };
    const { data: row } = await context.supabase.from("chat_jobs").select("status, result, created_at").eq("id", data.id).maybeSingle();
    if (!row) return { status: "missing" as const, result: null };
    return { status: row.status as "running" | "done" | "error" | "stopped", result: row.result as PlaygroundResult | null, createdAt: row.created_at };
  });

/** Stop button: the reply is dropped and not charged. */
export const stopChatJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ({ id: String((d as { id?: unknown })?.id ?? "") }))
  .handler(async ({ data, context }) => {
    if (!UUID_RE.test(data.id)) return { ok: false };
    await context.supabase.from("chat_jobs").update({ status: "stopped", updated_at: new Date().toISOString() }).eq("id", data.id).eq("status", "running");
    return { ok: true };
  });

export type PlaygroundResult = Awaited<ReturnType<typeof runPlaygroundChat>>;

async function runPlaygroundChat(
  data: { model: string; turns: PlaygroundTurn[]; instructions: string; maxTokens: number; images: string[] },
  userId: string,
  stillWanted: () => Promise<boolean>,
) {
    const { resolvePublicModel, gatewayChainFor, publicIdForRoute } = await import("@/lib/public-api-models");
    const { jenvuServiceError } = await import("@/lib/jenvu-api-errors");
    const modelId = resolvePublicModel(data.model || PLAYGROUND_DEFAULT_MODEL);
    if (!modelId) return { ok: false as const, error: "That model isn't available." };
    const messages = buildPlaygroundMessages(data.turns, data.instructions, data.images);
    if (!messages.length || data.turns[data.turns.length - 1]?.role !== "user") {
      return { ok: false as const, error: "Type a message first." };
    }

    const { getExtensionEntitlement, chargeExtensionUsage } = await import("@/lib/extension-billing.server");
    const entitlement = await getExtensionEntitlement(userId);
    if (!entitlement.allowed) {
      return { ok: false as const, error: String(entitlement.error || "Your plan doesn't include API models.") };
    }

    // Leads, website/SEO and web questions get real data (Google Maps, Firecrawl) first.
    const userTurns = data.turns.filter((t) => t.role === "user");
    const { liveDataFor } = await import("@/lib/chat-live-data.server");
    const live = await liveDataFor(userTurns[userTurns.length - 1]?.content ?? "", userTurns[userTurns.length - 2]?.content ?? "");
    if (live) messages.splice(messages.length - 1, 0, { role: "user", content: live.block });

    const { callChatCompletion, AiGatewayError } = await import("@/lib/ai-gateway");
    const requestId = `chatcmpl-${crypto.randomUUID()}`;
    const started = Date.now();
    try {
      const ask = (exactModels: boolean) =>
        callChatCompletion({
          models: gatewayChainFor(modelId, { viaLovable: true }),
          messages,
          maxTokens: data.maxTokens,
          stage: "public-api-chat",
          exactModels,
        });
      // The chosen model answers first (on Lovable AI or its own service); only if
      // every route for it is down does a backup answer — and the reply then
      // names the backup model, never the chosen one.
      const result = await ask(true).catch(async (err) => {
        console.warn("[playground] chosen model failed, using backup", (err as Error)?.message);
        return ask(false);
      });
      if (!(await stillWanted())) return { ok: false as const, error: "Stopped." };
      const charge = await chargeExtensionUsage({
        userId,
        keyId: "playground",
        keyName: "Chat playground",
        requestId,
        action: "playground.chat",
        calls: [{ model: result.model, usage: result.usage, stage: "public-api-chat" }],
      }).catch(() => null);
      return {
        ok: true as const,
        content: result.content,
        model: publicIdForRoute(result.model),
        chosen: modelId,
        usage: result.usage,
        cost: charge?.charged ?? 0,
        ms: Date.now() - started,
      };
    } catch (err) {
      const status = err instanceof AiGatewayError && err.status >= 400 ? err.status : 503;
      return { ok: false as const, error: jenvuServiceError(status) };
    }
}
