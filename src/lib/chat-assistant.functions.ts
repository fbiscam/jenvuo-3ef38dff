import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callChatCompletion, EXTENSION_MODEL_CHAIN, type ChatContentPart } from "@/lib/ai-gateway";

export type AssistantModelChoice = "auto" | "reasoning" | "claude" | "fast" | "vision";

export const ASSISTANT_MODELS: Array<{ id: AssistantModelChoice; label: string; hint: string }> = [
  { id: "auto", label: "Auto", hint: "Picks the best model for each message" },
  { id: "reasoning", label: "Jenvu Reasoning", hint: "Deep ICT/SMC analysis" },
  { id: "claude", label: "Claude Opus", hint: "Senior-grade review quality" },
  { id: "fast", label: "Fast", hint: "Quick everyday answers" },
  { id: "vision", label: "Vision", hint: "Reads charts and screenshots" },
];

type IncomingMessage = { role: "user" | "assistant"; text: string };

type Input = {
  messages: IncomingMessage[];
  model?: AssistantModelChoice;
  image?: string | null;
};

const SYSTEM_PROMPT =
  "You are Jenvu AI, a helpful general-purpose assistant that also specialises in XAU/USD (gold) ICT/SMC market analysis. " +
  "Answer naturally and conversationally in the user's language (English/Urdu/Roman Urdu). " +
  "Only produce a structured trade plan (verdict, bias, entry/POI, stop, TP1, TP2, RR, invalidation, evidence, risks) when the user asks for market analysis or attaches a chart. " +
  "Jenvu only analyses XAU/USD; politely decline analysis for other instruments. Never promise profit or accuracy.";

const ANALYSIS_INTENT =
  /\b(analy[sz]|signal|setup|trade|entry|exit|buy|sell|long|short|bias|tp\d?|sl|stop\s*loss|target|rr|risk|chart|candle|structure|bos|choch|fvg|order\s*block|liquidity|premium|discount|support|resistance|trend|xau|gold)\b/i;

function validImage(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!/^data:image\/(?:png|jpeg|webp);base64,/i.test(value)) return null;
  return value.length <= 4_500_000 ? value : null;
}

function chainFor(choice: AssistantModelChoice, hasImage: boolean, lastText: string): string[] {
  if (hasImage) return [...EXTENSION_MODEL_CHAIN.vision];
  switch (choice) {
    case "reasoning":
      return [...EXTENSION_MODEL_CHAIN.reasoning];
    case "claude":
      return [...EXTENSION_MODEL_CHAIN.seniorReview];
    case "fast":
      return [...EXTENSION_MODEL_CHAIN.conversation];
    case "vision":
      return [...EXTENSION_MODEL_CHAIN.vision];
    default:
      return ANALYSIS_INTENT.test(lastText)
        ? [...EXTENSION_MODEL_CHAIN.reasoning]
        : [...EXTENSION_MODEL_CHAIN.conversation];
  }
}

export const sendAssistantMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Input) => input)
  .handler(async ({ data, context }) => {
    const history = (data.messages || []).slice(-12).map((m) => ({
      role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: String(m.text || "").slice(0, 6000),
    }));
    const last = history[history.length - 1];
    if (!last || last.role !== "user" || !last.content.trim()) {
      throw new Error("Message is empty.");
    }

    const image = validImage(data.image);
    if (data.image && !image) {
      throw new Error("That image could not be read. Use a PNG, JPEG or WebP under 3 MB.");
    }

    const { getExtensionEntitlement, chargeExtensionUsage } = await import(
      "@/lib/extension-billing.server"
    );
    const entitlement = await getExtensionEntitlement(context.userId);
    if (!entitlement.allowed) throw new Error(entitlement.error || "AI chat is not available on your plan.");

    const choice = (data.model ?? "auto") as AssistantModelChoice;
    const models = chainFor(choice, Boolean(image), last.content);
    const analysis = Boolean(image) || ANALYSIS_INTENT.test(last.content);

    const userContent: string | ChatContentPart[] = image
      ? [
          { type: "text", text: last.content },
          { type: "image_url", image_url: { url: image, detail: "high" } },
        ]
      : last.content;

    const result = await callChatCompletion({
      models,
      stage: image ? "web-chat-vision" : "web-chat",
      maxTokens: analysis ? 900 : 500,
      timeoutMs: analysis ? 55_000 : 20_000,
      deadlineMs: analysis ? 75_000 : 30_000,
      retriesPerModel: 1,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...history.slice(0, -1),
        { role: "user", content: userContent },
      ],
    });

    const billing = await chargeExtensionUsage({
      userId: context.userId,
      keyId: "web-chat",
      keyName: "Jenvu Chat",
      requestId: crypto.randomUUID(),
      action: image ? "screen_analysis" : "chat",
      calls: [
        {
          model: result.model,
          usage: result.usage,
          stage: image ? "web-chat-vision" : "web-chat",
        },
      ],
    });
    if (!billing.ok) throw new Error(billing.error || "Usage could not be recorded.");

    return {
      text: result.content,
      model: result.model,
      charged: billing.charged,
      balance: billing.balance ?? null,
    };
  });
