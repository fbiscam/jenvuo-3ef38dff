import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { callChatCompletion, MODEL_CHAIN } from "@/lib/ai-gateway";

const schema = z.object({
  interval: z.string(),
  price: z.number(),
  direction: z.string(),
  probability: z.number(),
  score: z.number(),
  quality: z.string(),
  regime: z.string(),
  agreement: z.number(),
  patterns: z.array(z.string()),
  indicators: z.record(z.string(), z.union([z.number(), z.null()])),
  levels: z.object({ support: z.number().nullable(), resistance: z.number().nullable() }),
  backtest: z.object({ accuracy: z.number(), tested: z.number() }),
  recentCloses: z.array(z.number()),
});

export type CandleAiReview = {
  verdict: "UP" | "DOWN" | "NEUTRAL";
  confidence: number;
  agreesWithEngine: boolean;
  reason: string;
  risk: string;
  model?: string;
  unavailable?: string;
};

const unavailable = (msg: string): CandleAiReview => ({
  verdict: "NEUTRAL",
  confidence: 0,
  agreesWithEngine: false,
  reason: msg,
  risk: "AI review is waqt available nahi — sirf engine signal use karein.",
  unavailable: msg,
});

export const reviewNextCandle = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }): Promise<CandleAiReview> => {
    const prompt = `Tum ek institutional XAU/USD (gold) intraday analyst ho — ICT / SMC playbook use karte ho.
Timeframe: ${data.interval}
Current price: ${data.price}
Engine prediction: ${data.direction} (${data.probability}% probability, score ${data.score.toFixed(2)}, quality ${data.quality})
Market regime: ${data.regime}, factor agreement: ${data.agreement.toFixed(0)}%
Detected candle patterns: ${data.patterns.join(", ") || "none"}
Indicators: ${Object.entries(data.indicators)
      .map(([k, v]) => `${k}=${v == null ? "n/a" : v}`)
      .join(", ")}
Support: ${data.levels.support ?? "n/a"} | Resistance: ${data.levels.resistance ?? "n/a"}
Rolling backtest: ${data.backtest.accuracy.toFixed(1)}% over ${data.backtest.tested} signals
Last closes: ${data.recentCloses.map((c) => c.toFixed(2)).join(", ")}

Independent second opinion do: agli candle UP, DOWN ya NEUTRAL? Sirf JSON return karo is shape me:
{"verdict":"UP|DOWN|NEUTRAL","confidence":0-100,"reason":"1-2 short lines (liquidity / structure based)","risk":"1 short line kis cheez se signal fail ho sakta hai"}`;

    try {
      const { content, model } = await callChatCompletion({
        models: [...MODEL_CHAIN.seniorReview],
        messages: [
          {
            role: "system",
            content:
              "Tum disciplined gold trading analyst ho. Sirf valid JSON output do, koi markdown ya extra text nahi. Overconfident na bano.",
          },
          { role: "user", content: prompt },
        ],
        jsonMode: true,
        timeoutMs: 25000,
        stage: "next-candle-review",
      });

      const parsed = safeJson(content);
      const verdictRaw = String(parsed?.["verdict"] ?? "NEUTRAL").toUpperCase();
      const verdict: CandleAiReview["verdict"] =
        verdictRaw === "UP" ? "UP" : verdictRaw === "DOWN" ? "DOWN" : "NEUTRAL";
      const confRaw = Number(parsed?.["confidence"]);
      const confidence = Number.isFinite(confRaw) ? Math.max(0, Math.min(100, Math.round(confRaw))) : 50;

      return {
        verdict,
        confidence,
        agreesWithEngine: verdict === data.direction.toUpperCase(),
        reason: String(parsed?.["reason"] ?? (content.slice(0, 220) || "AI ne reason nahi diya.")),
        risk: String(parsed?.["risk"] ?? "Volatility spike aur news events signal invalid kar sakte hain."),
        model,
      };
    } catch (err) {
      return unavailable((err as Error)?.message?.slice(0, 180) || "AI review fail ho gaya.");
    }
  });

function safeJson(text: string): Record<string, unknown> | null {
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      return JSON.parse(m[0]) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}
