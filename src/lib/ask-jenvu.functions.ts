import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(4000),
      }),
    )
    .min(1)
    .max(20),
});

export type AskJenvuResult =
  | { ok: true; text: string; followUps: string[]; showSales: boolean }
  | { ok: false; error: string };

const SYSTEM = (knowledge: string) => `You are "Ask Jenvu", the friendly assistant on the Jenvu website.
Answer questions about Jenvu using the knowledge below. You may also answer general questions (trading concepts, gold markets, ICT/SMC terms, general knowledge) briefly and accurately.
Rules:
- Answer only what was asked. Be concise and clear; use short paragraphs, **bold** labels and bullet lists in Markdown when helpful.
- For Jenvu facts, rely only on the knowledge below. If something is not covered, say you're not sure and suggest contacting support@jenvu.com.
- Never promise profits, never state a fixed win rate, never give personal financial advice. Never claim to be human, and never name the underlying AI model or company behind you — you are simply the Jenvu assistant.
- For a greeting like "hi", welcome the user to Jenvu, introduce yourself as the Jenvu assistant and list 3 things you can help with.
After your answer, on new lines, output exactly:
<<FOLLOWUPS>> question one | question two | question three
<<SALES>> yes   (only if the user greets you, asks about pricing, plans, buying, business use, the Founding Program, or talking to a person; otherwise write no)

KNOWLEDGE:
${knowledge}`;

export const askJenvu = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }): Promise<AskJenvuResult> => {
    const { callChatCompletion, checkAnalyzeRateLimit, MODEL_CHAIN, AiGatewayError } = await import("@/lib/ai-gateway");
    const { getJenvuKnowledge } = await import("@/lib/ask-jenvu-knowledge.server");
    const { getRequestHeader } = await import("@tanstack/react-start/server");

    const ip =
      getRequestHeader("cf-connecting-ip") ||
      getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ||
      "anon";
    const rl = checkAnalyzeRateLimit(`ask-jenvu:${ip}`);
    if (!rl.allowed) return { ok: false, error: `You're asking quickly. Please wait ${rl.retryInSec}s and try again.` };

    const history = data.messages.slice(-12);
    if (history[history.length - 1].role !== "user") return { ok: false, error: "Please type a question." };

    try {
      const { content } = await callChatCompletion({
        models: [...MODEL_CHAIN.intent],
        messages: [{ role: "system", content: SYSTEM(getJenvuKnowledge()) }, ...history],
        maxTokens: 3000,
        retriesPerModel: 2,
        stage: "ask-jenvu",
      });
      return parse(content);
    } catch (e) {
      const msg = e instanceof AiGatewayError ? e.message : "Something went wrong.";
      console.error("[ask-jenvu]", msg);
      return { ok: false, error: "Ask Jenvu couldn't answer right now. Please try again in a moment." };
    }
  });

function parse(raw: string): AskJenvuResult {
  let text = raw;
  let followUps: string[] = [];
  let showSales = false;
  const f = text.match(/<<FOLLOWUPS>>([^\n]*)/i);
  if (f) {
    followUps = f[1].split("|").map((s) => s.trim().replace(/^[-*\d.\s]+/, "")).filter((s) => s.length > 2).slice(0, 3);
  }
  const s = text.match(/<<SALES>>\s*(\w+)/i);
  if (s) showSales = s[1].toLowerCase().startsWith("y");
  text = text.replace(/<<FOLLOWUPS>>[^\n]*/gi, "").replace(/<<SALES>>[^\n]*/gi, "").trim();
  return { ok: true, text, followUps, showSales };
}
