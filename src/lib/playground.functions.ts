// Dashboard Chat playground: lets a signed-in user try any Jenvu API model.
// Same plan, balance, daily-limit and $3/1M-token billing as the public API.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildPlaygroundMessages, clampMaxTokens, sanitizePlaygroundImages, type PlaygroundTurn } from "@/lib/playground";

export const playgroundChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => {
    const obj = (d ?? {}) as { model?: unknown; turns?: unknown; instructions?: unknown; maxTokens?: unknown; images?: unknown };
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
    };
  })
  .handler(async ({ data, context }) => {
    const { resolvePublicModel, gatewayChainFor } = await import("@/lib/public-api-models");
    const { jenvuServiceError } = await import("@/lib/jenvu-api-errors");
    const modelId = resolvePublicModel(data.model);
    if (!modelId) return { ok: false as const, error: "That model isn't available." };
    const messages = buildPlaygroundMessages(data.turns, data.instructions, data.images);
    if (!messages.length || data.turns[data.turns.length - 1]?.role !== "user") {
      return { ok: false as const, error: "Type a message first." };
    }

    const { getExtensionEntitlement, chargeExtensionUsage } = await import("@/lib/extension-billing.server");
    const entitlement = await getExtensionEntitlement(context.userId);
    if (!entitlement.allowed) {
      return { ok: false as const, error: String(entitlement.error || "Your plan doesn't include API models.") };
    }

    const { callChatCompletion, AiGatewayError } = await import("@/lib/ai-gateway");
    const requestId = `chatcmpl-${crypto.randomUUID()}`;
    const started = Date.now();
    try {
      const result = await callChatCompletion({
        models: gatewayChainFor(modelId),
        messages,
        maxTokens: data.maxTokens,
        stage: "public-api-chat",
        exactModels: true,
      });
      const charge = await chargeExtensionUsage({
        userId: context.userId,
        keyId: "playground",
        keyName: "Chat playground",
        requestId,
        action: "playground.chat",
        calls: [{ model: result.model, usage: result.usage, stage: "public-api-chat" }],
      }).catch(() => null);
      return {
        ok: true as const,
        content: result.content,
        model: modelId,
        usage: result.usage,
        cost: charge?.charged ?? 0,
        ms: Date.now() - started,
      };
    } catch (err) {
      const status = err instanceof AiGatewayError && err.status >= 400 ? err.status : 503;
      return { ok: false as const, error: jenvuServiceError(status) };
    }
  });
