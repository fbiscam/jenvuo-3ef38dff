import { createServerFn } from "@tanstack/react-start";
import { callChat } from "./ai-gateway";

const MODELS = ["bmind/gpt-5.5", "bmind/gpt-5.2", "google/gemini-3.6-flash", "openai/gpt-5.4-mini"];

export type ScamVerdict = {
  score: number;
  verdict: "safe" | "suspicious" | "scam";
  summary: string;
  reasons: string[];
  advice: string[];
};

function coerce(raw: string): ScamVerdict {
  let parsed: any = {};
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(match ? match[0] : raw);
  } catch {
    parsed = {};
  }
  const score = Math.max(0, Math.min(100, Number(parsed.score) || 0));
  const verdict: ScamVerdict["verdict"] =
    parsed.verdict === "scam" || parsed.verdict === "suspicious" || parsed.verdict === "safe"
      ? parsed.verdict
      : score >= 70
      ? "scam"
      : score >= 35
      ? "suspicious"
      : "safe";
  return {
    score,
    verdict,
    summary: String(parsed.summary ?? "No summary returned."),
    reasons: Array.isArray(parsed.reasons) ? parsed.reasons.map(String).slice(0, 8) : [],
    advice: Array.isArray(parsed.advice) ? parsed.advice.map(String).slice(0, 6) : [],
  };
}

const SYSTEM = `You are a fraud & scam analyst. Judge the supplied artifact for scam / phishing / fraud risk.
Return STRICT JSON only:
{"score": 0-100 risk, "verdict": "safe"|"suspicious"|"scam", "summary": "one sentence", "reasons": ["..."], "advice": ["..."]}
Be concrete: cite the exact red flags (urgency, payment demands, lookalike domain, punycode, free mail sender, grammar, impossible returns, unverifiable identity).`;

export const analyzeScam = createServerFn({ method: "POST" })
  .inputValidator((data: { kind: "link" | "text" | "image"; value: string }) => data)
  .handler(async ({ data }) => {
    const kind = data.kind;
    const value = String(data.value ?? "").trim();
    if (!value) return { ok: false as const, error: "EMPTY" };
    if (kind === "image" && value.length > 6_000_000) return { ok: false as const, error: "TOO_LARGE" };
    if (kind !== "image" && value.length > 12_000) return { ok: false as const, error: "TOO_LARGE" };

    let userContent: any;
    if (kind === "link") {
      userContent = `Analyze this URL for scam risk. Consider domain shape, TLD, lookalike/typosquatting, path patterns, and known scam structures.\n\nURL: ${value}`;
    } else if (kind === "text") {
      userContent = `Analyze this message for scam / phishing risk.\n\n---\n${value}\n---`;
    } else {
      userContent = [
        { type: "text", text: "Analyze this image (screenshot, invoice, profile, or offer) for scam risk." },
        { type: "image_url", image_url: { url: value } },
      ];
    }

    try {
      const res = await callChat({
        models: MODELS,
        jsonMode: kind !== "image",
        maxTokens: 900,
        timeoutMs: 40_000,
        stage: `scam_${kind}`,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userContent as unknown as string },
        ],
      });
      return { ok: true as const, result: coerce(res.content), model: res.model };
    } catch (e) {
      return { ok: false as const, error: "AI_ERROR", message: e instanceof Error ? e.message : String(e) };
    }
  });
