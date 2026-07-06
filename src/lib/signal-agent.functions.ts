import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { computeSignalPlan, resolveInstrument, type SignalPlan } from "@/lib/gold-analysis.functions";
import { callChatCompletion, AiGatewayError, MODEL_CHAIN } from "@/lib/ai-gateway";

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

/* ------- symbol detection: XAU pairs only ------- */
const XAU_TOKENS: Array<{ re: RegExp; sym: string }> = [
  { re: /\b(XAUEUR|GOLD\s*EUR|GOLD\s*EURO)\b/, sym: "XAUEUR" },
  { re: /\b(XAUGBP|GOLD\s*GBP|GOLD\s*POUND)\b/, sym: "XAUGBP" },
  { re: /\b(XAUJPY|GOLD\s*JPY|GOLD\s*YEN)\b/, sym: "XAUJPY" },
  { re: /\b(XAUAUD|GOLD\s*AUD)\b/, sym: "XAUAUD" },
  { re: /\b(XAUCHF|GOLD\s*CHF|GOLD\s*FRANC)\b/, sym: "XAUCHF" },
  { re: /\b(XAUUSD|XAU|GOLD|BULLION)\b/, sym: "XAUUSD" },
];

function detectSymbol(question: string): string | null {
  const q = ` ${question.toUpperCase()} `;
  for (const t of XAU_TOKENS) if (t.re.test(q)) return t.sym;
  return null;
}


function buildContextFromPlan(plan: SignalPlan): string {
  const lvls = (plan.keyLevels || [])
    .slice(0, 8)
    .map((k) => `${k.label}=${k.price}`)
    .join(" · ");
  return `
INSTRUMENT: ${plan.instrument.display} (${plan.instrument.kind})
CURRENT PRICE: ${plan.currentPrice}
HTF BIAS: ${plan.htfBias}
SETUP: ${plan.setupGrade} (score ${plan.setupScore}/100, alignment ${plan.alignmentLabel} ${plan.alignmentScore}/100)
TRADE: ${plan.trade.direction} entry=${plan.trade.entry ?? "—"} sl=${plan.trade.sl ?? "—"} tp=${plan.trade.tp ?? "—"} rr=${plan.trade.rr?.toFixed?.(2) ?? plan.trade.rr ?? "—"} confidence=${plan.trade.confidence ?? "—"}%
SESSION: ${plan.session} · KILLZONE: ${plan.killzone}
CONFLUENCES: ${(plan.confluences ?? []).join(" · ") || "—"}
KEY LEVELS: ${lvls || "—"}
HTF NARRATIVE: ${plan.htfNarrative}
LTF NARRATIVE: ${plan.ltfNarrative}
NEWS RISK: ${plan.newsRisk?.severity ?? "low"} — ${plan.newsRisk?.warning ?? ""}
`.trim();
}

function buildContextFromCtx(ctx: AgentContext): string {
  return `
INSTRUMENT: ${ctx.symbol ?? "—"}
CURRENT PRICE: ${ctx.currentPrice ?? "—"}
HTF BIAS: ${ctx.bias ?? "—"}
SETUP: ${ctx.setupGrade ?? "—"} (score ${ctx.setupScore ?? "—"}/100)
TRADE: ${ctx.direction ?? "WAIT"} entry=${ctx.entry ?? "—"} sl=${ctx.sl ?? "—"} tp=${ctx.tp ?? "—"} rr=${ctx.rr ?? "—"}
SESSION: ${ctx.session ?? "—"} · KILLZONE: ${ctx.killzone ?? "—"}
CONFLUENCES: ${(ctx.confluences ?? []).join(" · ") || "—"}
KEY LEVELS: ${(ctx.keyLevels ?? []).map((k) => `${k.label}=${k.price}`).join(" · ") || "—"}
`.trim();
}

export const askSignalAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => d as { question: string; context?: AgentContext })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: spendErr } = await supabaseAdmin.rpc("spend_credits", {
      _user_id: context.userId, _amount: 1, _reason: "voice_query", _metadata: {} as any,
    });
    if (spendErr) throw new Error(spendErr.message?.includes("INSUFFICIENT_CREDITS") ? "INSUFFICIENT_CREDITS" : spendErr.message);
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI gateway not configured.");

    const ctx = data.context ?? {};
    const currentSym = (ctx.symbol ?? "").toUpperCase().replace(/[\s_\-/]/g, "");
    const detected = detectSymbol(data.question);

    let switchedPlan: SignalPlan | null = null;
    let switchedDisplay: string | null = null;
    let contextStr = buildContextFromCtx(ctx);
    let isAnalysisIntent = /\b(analy[sz]e|analysis|setup|signal|entry|trade|bias|prediction|forecast|target|levels?|setup|plan|view|outlook|short|long|buy|sell|breakdown)\b/i.test(data.question);

    if (detected) {
      const resolved = resolveInstrument(detected);
      const resolvedKey = resolved.key.split(":")[1] || resolved.raw;
      const isDifferent =
        !currentSym ||
        (!currentSym.includes(detected) && !detected.includes(currentSym) && !currentSym.includes(resolvedKey));

      // If user mentioned a different instrument OR explicitly asked for analysis on it, fetch its plan.
      if (isDifferent || isAnalysisIntent) {
        try {
          switchedPlan = await computeSignalPlan({ symbol: detected });
          switchedDisplay = switchedPlan.instrument.display;
          contextStr = buildContextFromPlan(switchedPlan);
          isAnalysisIntent = true;
        } catch (e: any) {
          // Symbol couldn't be resolved or feed failed — let LLM still answer with a friendly note.
          contextStr += `\n\nNOTE: Live feed for ${detected} unavailable right now (${e?.message?.slice(0, 100) || "no data"}). Answer conceptually using ICT/SMC playbook for this asset class.`;
        }
      }
    }

    const system = `You are Jenvu — a gold specialist with 25+ years on bullion desks (LBMA / COMEX / prop). You trade XAU exclusively: XAU/USD, XAU/EUR, XAU/GBP, XAU/JPY, XAU/AUD, XAU/CHF. You are an expert in ICT (Inner Circle Trader) and SMC (Smart Money Concepts): BOS/CHOCH/MSS, premium/discount, OB/Breaker/Mitigation, FVG/IFVG/BPR, BSL/SSL liquidity, equal highs/lows, PDH/PDL, weekly/daily open, OTE 62-79%, London fix (10:30 & 15:00 GMT), London Killzone (07-10 GMT), NY AM Killzone (12-15 GMT), Power of Three.

Deep gold context you always use: DXY inverse correlation (or the relevant USD-cross when trading XAU/EUR, XAU/GBP, XAU/JPY, XAU/AUD, XAU/CHF), real yields (10Y TIPS), central-bank buying flows, ETF flows (GLD/IAU), COMEX/COT positioning, geopolitical risk premium, gold seasonality, and news risk (NFP, CPI, FOMC, ECB, BoE, BoJ, RBA, SNB depending on the quote currency).

If the user asks about anything that is NOT a XAU pair (BTC, ETH, EURUSD, NAS100, AAPL, oil, silver, etc.), politely decline in one line: "Jenvu is a gold-only desk — I trade XAU/USD, XAU/EUR, XAU/GBP, XAU/JPY, XAU/AUD and XAU/CHF. Which gold pair should I look at?" — then stop.

When the user wants an analysis / setup / signal on a XAU pair, deliver a full A+ institutional breakdown in this order (concise, numbered, no fluff, in ENGLISH only — no Hindi/Urdu):
1) HTF bias & structure (trend, last BOS/CHoCH, what side liquidity sits)
2) Liquidity map (PDH/PDL, prior week H/L, Asia range, London H/L, daily/weekly open, round-number magnets)
3) Point of Interest (OB / FVG / breaker) with exact price zone
4) Entry trigger (what confirmation you need — sweep + CHoCH on LTF, etc.)
5) Stop loss placement & logic (beyond which structure)
6) Take-profit ladder with R:R (TP1 nearest liquidity, TP2 opposing range)
7) Invalidation & risk note (news, killzone, DXY / quote-currency confluence, what kills the idea)

For casual gold questions (greeting, "why this bias?", "explain FVG", "what moved gold today?"), answer naturally in 2-4 sentences using ICT/SMC vocabulary.

Use the LIVE prices and levels from the context. Be specific, decisive, pro. No disclaimers. IMPORTANT: Reply in PLAIN TEXT only — never use markdown formatting. No asterisks (*, **, ***), no hashes (#, ##, ###), no backticks, no underscores for emphasis, no bullet dashes. Use simple numbered lines like "1) ..." and plain sentences. Keep it clean so it reads naturally when spoken aloud.`;


    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: `${switchedDisplay ? `(User is asking about ${switchedDisplay} — use the live context below for that instrument.)\n\n` : ""}CONTEXT:\n${contextStr}\n\nQUESTION: ${data.question}`,
          },
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
    return { reply, switchedSymbol: switchedDisplay };
  });
