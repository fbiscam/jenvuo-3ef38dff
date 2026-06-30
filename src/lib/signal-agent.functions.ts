import { createServerFn } from "@tanstack/react-start";

export type AgentContext = {
  symbol?: string;
  bias?: string;
  direction?: string;
  entry?: number;
  sl?: number;
  tp?: number;
  rr?: number;
  setupGrade?: string;
  setupScore?: number;
  session?: string;
  killzone?: string;
  confluences?: string[];
  keyLevels?: { label: string; price: number; kind?: string }[];
  currentPrice?: number;
};

export const askSignalAgent = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as { question: string; context?: AgentContext })
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI gateway not configured.");

    const ctx = data.context ?? {};
    const ctxStr = `
INSTRUMENT: ${ctx.symbol ?? "—"}
CURRENT PRICE: ${ctx.currentPrice ?? "—"}
HTF BIAS: ${ctx.bias ?? "—"}
SETUP: ${ctx.setupGrade ?? "—"} (score ${ctx.setupScore ?? "—"}/100)
TRADE: ${ctx.direction ?? "WAIT"} entry=${ctx.entry ?? "—"} sl=${ctx.sl ?? "—"} tp=${ctx.tp ?? "—"} rr=${ctx.rr ?? "—"}
SESSION: ${ctx.session ?? "—"} · KILLZONE: ${ctx.killzone ?? "—"}
CONFLUENCES: ${(ctx.confluences ?? []).join(" · ") || "—"}
KEY LEVELS: ${(ctx.keyLevels ?? []).map(k => `${k.label}=${k.price}`).join(" · ") || "—"}
`.trim();

    const system = `You are Jenvu — an elite 25-year institutional trader. The user is looking at a live signal desk. Answer their question in 2-4 short sentences. Use ICT / SMC vocabulary precisely (FVG, OB, BOS, CHoCH, liquidity sweep, OTE, premium/discount). Be specific to the context provided. Never invent prices that contradict the provided context. No disclaimers.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-lite",
        messages: [
          { role: "system", content: system },
          { role: "user", content: `CONTEXT:\n${ctxStr}\n\nQUESTION: ${data.question}` },
        ],
      }),
    });
    if (!res.ok) {
      const txt = await res.text();
      if (res.status === 429) throw new Error("Rate limit. Try again in a moment.");
      if (res.status === 402) throw new Error("AI credits exhausted.");
      throw new Error(`AI error ${res.status}: ${txt.slice(0, 160)}`);
    }
    const json: any = await res.json();
    const reply = String(json?.choices?.[0]?.message?.content ?? "").trim() || "No response.";
    return { reply };
  });
