// OpenAI-compatible chat completions endpoint for Jenvu API keys.
// Usable from any client (curl, SDKs, other tools) — not just the extension.
// Auth: Authorization: Bearer jenvu_ext_...
// Limits: the account's plan daily token limit is enforced here, and every
// call is recorded so the dashboard/usage pages stay in sync.
import { createFileRoute } from "@tanstack/react-router";
import {
  authenticateExtensionRequest,
  extJson,
  EXT_CORS_HEADERS,
} from "@/lib/extension-auth.server";
import { callChatCompletion, EXTENSION_MODEL_CHAIN, AiGatewayError } from "@/lib/ai-gateway";
import type { ChatMessage } from "@/lib/ai-gateway";

const MODEL_ALIASES: Record<string, readonly string[]> = {
  "jenvu-fast": EXTENSION_MODEL_CHAIN.conversation,
  "jenvu-pro": EXTENSION_MODEL_CHAIN.reasoning,
  "jenvu-vision": EXTENSION_MODEL_CHAIN.vision,
};

function resolveChain(model: unknown): readonly string[] {
  const key = typeof model === "string" ? model.trim().toLowerCase() : "";
  return MODEL_ALIASES[key] ?? EXTENSION_MODEL_CHAIN.conversation;
}

function normalizeMessages(input: unknown): ChatMessage[] | null {
  if (!Array.isArray(input) || input.length === 0) return null;
  const out: ChatMessage[] = [];
  for (const raw of input.slice(0, 40)) {
    const msg = raw as { role?: unknown; content?: unknown };
    const role =
      msg.role === "system" || msg.role === "assistant" || msg.role === "user"
        ? msg.role
        : "user";
    if (typeof msg.content === "string") {
      out.push({ role, content: msg.content.slice(0, 40_000) });
    } else if (Array.isArray(msg.content)) {
      out.push({ role, content: msg.content as ChatMessage["content"] });
    } else {
      return null;
    }
  }
  return out;
}

export const Route = createFileRoute("/api/public/v1/chat/completions")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: EXT_CORS_HEADERS }),
      POST: async ({ request }) => {
        const auth = await authenticateExtensionRequest(request);
        if (!auth.ok) {
          return extJson({ error: { message: auth.error, type: "invalid_request_error" } }, auth.status);
        }

        const { getExtensionEntitlement, chargeExtensionUsage } = await import(
          "@/lib/extension-billing.server"
        );
        const entitlement = await getExtensionEntitlement(auth.userId);
        if (!entitlement.allowed) {
          return extJson(
            {
              error: {
                message: entitlement.error,
                type: entitlement.status === 429 ? "rate_limit_error" : "insufficient_quota",
                code:
                  entitlement.status === 429
                    ? "daily_token_limit_reached"
                    : entitlement.status === 402
                      ? "low_balance"
                      : "plan_required",
              },
              daily_token_limit: entitlement.dailyTokenLimit,
              tokens_used_today: entitlement.tokensUsedToday,
              tokens_remaining_today: entitlement.tokensRemainingToday,
            },
            entitlement.status,
          );
        }

        let body: any;
        try {
          body = await request.json();
        } catch {
          return extJson({ error: { message: "Invalid JSON body.", type: "invalid_request_error" } }, 400);
        }

        const messages = normalizeMessages(body?.messages);
        if (!messages) {
          return extJson(
            { error: { message: "`messages` must be a non-empty array.", type: "invalid_request_error" } },
            400,
          );
        }

        const maxTokens = Math.min(4000, Math.max(16, Number(body?.max_tokens ?? 1200) || 1200));
        const requestId = `chatcmpl-${crypto.randomUUID()}`;

        try {
          const result = await callChatCompletion({
            models: [...resolveChain(body?.model)],
            messages,
            maxTokens,
            stage: "public-api-chat",
            jsonMode: body?.response_format?.type === "json_object",
          });

          await chargeExtensionUsage({
            userId: auth.userId,
            keyId: auth.keyId,
            keyName: auth.name,
            requestId,
            action: "chat.completions",
            calls: [{ model: result.model, usage: result.usage, stage: "public-api-chat" }],
          }).catch(() => null);

          return extJson({
            id: requestId,
            object: "chat.completion",
            created: Math.floor(Date.now() / 1000),
            model: result.model,
            choices: [
              {
                index: 0,
                message: { role: "assistant", content: result.content },
                finish_reason: "stop",
              },
            ],
            usage: {
              prompt_tokens: result.usage.promptTokens,
              completion_tokens: result.usage.completionTokens,
              total_tokens: result.usage.totalTokens,
            },
            jenvu: {
              daily_token_limit: entitlement.dailyTokenLimit,
              tokens_used_today: entitlement.tokensUsedToday + result.usage.totalTokens,
              plan: entitlement.plan,
            },
          });
        } catch (err) {
          const status = err instanceof AiGatewayError && err.status >= 400 ? err.status : 503;
          return extJson(
            {
              error: {
                message:
                  err instanceof AiGatewayError
                    ? err.message
                    : "AI is temporarily unavailable. Please retry.",
                type: "api_error",
              },
            },
            status,
          );
        }
      },
    },
  },
});
