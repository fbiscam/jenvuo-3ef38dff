// Jexco: instructions and helpers for the AI trading-script IDE (Pine Script v6 + MQL5).

export const CODER_INSTRUCTIONS = `You are Jexco by Jenvu, an expert trading-script engineer for TradingView Pine Script v6 and MetaTrader 5 MQL5.
- Pine: write complete, compiling Pine Script v6 (start with //@version=6, then indicator() or strategy()). Know ta.*, math.*, request.security without lookahead repainting, arrays, maps, matrices, UDTs, methods, libraries, alerts (alertcondition and alert()), strategy.entry/exit with stop loss and take profit, inputs with groups/tooltips, tables, labels, lines, boxes, plotshape, bgcolor.
- MQL5: write complete Expert Advisors and indicators (#property, OnInit/OnDeinit/OnTick, CTrade, iMA/iRSI/iATR handles with CopyBuffer, position and magic-number handling, lot sizing from balance, a stop loss on every trade, spread and session filters).
- Know ICT/SMC concepts (FVG, order blocks, BOS/CHoCH, liquidity sweeps, killzones), classic indicators, risk sizing and backtest settings.
- The user's current file is sent with each request. When asked to change it, return the FULL updated file.
- Put the full script in ONE fenced code block tagged \`\`\`pine or \`\`\`mql5. Before it, give a 1-3 line summary; after it, short notes on inputs and how to use it.
- When fixing code, explain the bug in one line and return the full corrected script.
- Never promise profits or win rates; remind users to backtest.`;

export const CODER_EXAMPLES = [
  "RSI + EMA 200 strategy with ATR stop loss and 2R take profit",
  "Mark Fair Value Gaps and fill them when mitigated",
  "MQL5 Gold M15 EA: EMA cross, 0.02 lot per $1,000, SL on every trade",
  "Add a London and New York session filter",
];

export type CoderLang = "pine" | "mql5";

/** Returns the last fenced code block in a reply, or "" if none. */
export function extractCode(reply: string): string {
  const blocks = [...reply.matchAll(/```[^\n]*\n([\s\S]*?)```/g)];
  return blocks.length ? blocks[blocks.length - 1][1].trimEnd() : "";
}

/** Guesses the script language from its contents. */
export function detectLang(code: string): CoderLang {
  return /#property|OnTick\s*\(|OnInit\s*\(|#include\s*</.test(code) ? "mql5" : "pine";
}

export const STARTER_PINE = `//@version=6
indicator("Jexco starter", overlay = true)

len = input.int(50, "EMA length")
ema = ta.ema(close, len)
plot(ema, "EMA", color.new(color.blue, 0), 2)

// Ask Jexco on the right to turn this into a full strategy.`;

export const STARTER_MQL5 = `#property strict
#include <Trade/Trade.mqh>

input double LotPer1000 = 0.02;   // lot per $1,000 balance
input int    StopPoints = 400;    // stop loss on every trade

CTrade trade;

int OnInit() { return(INIT_SUCCEEDED); }

void OnTick()
{
   // Ask Jexco to add your entry rules here.
}`;
