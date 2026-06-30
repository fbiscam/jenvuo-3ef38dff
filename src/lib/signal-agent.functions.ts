import { createServerFn } from "@tanstack/react-start";
import { getSignalPlan, resolveInstrument, type SignalPlan } from "@/lib/gold-analysis.functions";

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

/* ------- symbol detection from natural language ------- */
const KNOWN_TOKENS = [
  // crypto
  "BTC","BITCOIN","ETH","ETHEREUM","SOL","SOLANA","XRP","RIPPLE","DOGE","BNB","ADA","AVAX","MATIC","DOT","LINK","TRX","LTC","SHIB","PEPE","TON","ARB","OP","SUI","APT","NEAR","ATOM","INJ","TIA","FIL","FTM","HBAR","UNI","AAVE","RNDR","WLD","SEI","JUP","ORDI","FET","ENA",
  // metals
  "XAUUSD","XAU","GOLD","XAGUSD","XAG","SILVER",
  // fx majors
  "EURUSD","GBPUSD","USDJPY","USDCHF","AUDUSD","NZDUSD","USDCAD","EURJPY","GBPJPY","EURGBP","AUDJPY","NZDJPY","EURAUD","GBPAUD","CHFJPY","CADJPY",
  // indices
  "NAS100","NDX","US100","SPX","SPX500","US500","DJI","US30","DAX","FTSE","N225","DXY","NASDAQ","SP500","DOW","DOWJONES",
  // oil
  "OIL","CRUDE","WTI","USOIL",
];

function detectSymbol(question: string): string | null {
  const q = ` ${question.toUpperCase()} `;
  // longest match first
  const sorted = [...KNOWN_TOKENS].sort((a, b) => b.length - a.length);
  for (const tok of sorted) {
    const re = new RegExp(`[^A-Z0-9]${tok}[^A-Z0-9]`);
    if (re.test(q)) return tok;
  }
  // generic 3+3 fx like EURJPY appearing without spaces
  const fx = question.toUpperCase().match(/\b([A-Z]{3})\/?([A-Z]{3})\b/);
  if (fx) return `${fx[1]}${fx[2]}`;
  // ticker-style $AAPL or AAPL stock
  const stock = question.toUpperCase().match(/\$([A-Z]{2,6})\b|\b([A-Z]{2,6})\s+(STOCK|SHARE|EQUITY)/);
  if (stock) return stock[1] || stock[2];
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
  .inputValidator((d: unknown) => d as { question: string; context?: AgentContext })
  .handler(async ({ data }) => {
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
          switchedPlan = await getSignalPlan({ data: { symbol: detected } });
          switchedDisplay = switchedPlan.instrument.display;
          contextStr = buildContextFromPlan(switchedPlan);
          isAnalysisIntent = true;
        } catch (e: any) {
          // Symbol couldn't be resolved or feed failed — let LLM still answer with a friendly note.
          contextStr += `\n\nNOTE: Live feed for ${detected} unavailable right now (${e?.message?.slice(0, 100) || "no data"}). Answer conceptually using ICT/SMC playbook for this asset class.`;
        }
      }
    }

    const system = `You are Jenvu — an elite institutional trader with 25+ years on bank/prop desks. You are a master of EVERY liquid market: gold, FX majors, indices, crypto, equities, commodities. Expert-level in ICT (Inner Circle Trader) and SMC (Smart Money Concepts): BOS/CHOCH/MSS, premium/discount, OB/Breaker/Mitigation, FVG/IFVG/BPR, BSL/SSL liquidity, equal highs/lows, PDH/PDL, weekly/daily open, OTE 62-79%, killzones (London 07-10 GMT, NY AM 12-15 GMT), Power of Three.

NEVER refuse a market. NEVER say "I can only analyze gold". If the user asks about BTC, ETH, EURUSD, NAS100, AAPL, oil — analyze it like a senior desk trader walking a junior through the chart.

When the user wants an analysis / setup / signal, deliver a full A+ institutional breakdown in this order (concise, numbered, no fluff, in ENGLISH only — no Hindi/Urdu):
1) HTF bias & structure (trend, last BOS/CHoCH, what side liquidity sits)
2) Liquidity map (PDH/PDL, equal highs/lows, sweep targets)
3) Point of Interest (OB / FVG / breaker) with exact price zone
4) Entry trigger (what confirmation you need — sweep + CHoCH on LTF, etc.)
5) Stop loss placement & logic (beyond which structure)
6) Take-profit ladder with R:R (TP1 nearest liquidity, TP2 opposing range)
7) Invalidation & risk note (news, killzone, what kills the idea)

For casual questions (greeting, "why this bias?", "explain FVG"), answer naturally in 2-4 sentences using ICT/SMC vocabulary.

Use the LIVE prices and levels from the context. Be specific, decisive, pro. No disclaimers. IMPORTANT: Reply in PLAIN TEXT only — never use markdown formatting. No asterisks (*, **, ***), no hashes (#, ##, ###), no backticks, no underscores for emphasis, no bullet dashes. Use simple numbered lines like "1) ..." and plain sentences. Keep it clean so it reads naturally when spoken aloud.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-lite",
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
