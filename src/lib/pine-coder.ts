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

export type CodeProblem = { line: number; level: "error" | "warning"; message: string };

/** Removes strings and comments so bracket checks ignore their contents. */
function stripLine(line: string): string {
  return line.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, '""').replace(/\/\/.*$/, "");
}

/** Quick editor checks (not a compiler): brackets, version header, entry points. */
export function lintScript(code: string, lang: CoderLang): CodeProblem[] {
  const out: CodeProblem[] = [];
  const lines = code.split("\n");
  const stack: { ch: string; line: number }[] = [];
  const pairs: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
  lines.forEach((raw, i) => {
    for (const ch of stripLine(raw)) {
      if (ch === "(" || ch === "[" || ch === "{") stack.push({ ch, line: i + 1 });
      else if (pairs[ch]) {
        const top = stack.pop();
        if (!top || top.ch !== pairs[ch]) out.push({ line: i + 1, level: "error", message: `Unexpected "${ch}"` });
      }
    }
  });
  for (const s of stack) out.push({ line: s.line, level: "error", message: `"${s.ch}" is never closed` });

  if (lang === "pine") {
    if (!/^\s*\/\/@version=\d+/m.test(code)) out.push({ line: 1, level: "warning", message: "Add //@version=6 on the first line" });
    if (!/\b(indicator|strategy|library)\s*\(/.test(code)) out.push({ line: 1, level: "error", message: "Script needs indicator(), strategy() or library()" });
    lines.forEach((l, i) => {
      if (/lookahead\s*=\s*barmerge\.lookahead_on/.test(l)) out.push({ line: i + 1, level: "warning", message: "lookahead_on can repaint in backtests" });
    });
    if (/strategy\.entry\s*\(/.test(code) && !/strategy\.exit\s*\(/.test(code)) out.push({ line: 1, level: "warning", message: "Strategy has entries but no strategy.exit stop loss" });
  } else {
    const isIndicator = /OnCalculate\s*\(/.test(code);
    if (!isIndicator && !/OnTick\s*\(/.test(code)) out.push({ line: 1, level: "error", message: "Expert Advisor needs OnTick()" });
    lines.forEach((l, i) => {
      if (/\btrade\.(Buy|Sell)\s*\(\s*[^,)]+\s*(,\s*[^,)]*){0,2}\)/.test(l)) out.push({ line: i + 1, level: "warning", message: "Order without a stop loss" });
    });
  }
  return out.sort((a, b) => a.line - b.line);
}

export type OutlineItem = { line: number; kind: "input" | "function" | "plot" | "order"; name: string };

/** Inputs, functions, plots and orders in the file, for the Outline panel. */
export function outlineScript(code: string, lang: CoderLang): OutlineItem[] {
  const items: OutlineItem[] = [];
  code.split("\n").forEach((l, i) => {
    const line = i + 1;
    let m: RegExpMatchArray | null;
    if (lang === "pine") {
      if ((m = l.match(/^\s*(?:var\s+)?(\w+)\s*=\s*input(?:\.\w+)?\s*\(/))) items.push({ line, kind: "input", name: m[1] });
      else if ((m = l.match(/^(\w+)\s*\([^)]*\)\s*=>/))) items.push({ line, kind: "function", name: m[1] });
      else if ((m = l.match(/^\s*(plot\w*)\s*\(/))) items.push({ line, kind: "plot", name: m[1] });
      else if ((m = l.match(/(strategy\.(?:entry|exit|close))\s*\(\s*"([^"]*)"/))) items.push({ line, kind: "order", name: `${m[1]} "${m[2]}"` });
    } else {
      if ((m = l.match(/^\s*input\s+\w+\s+(\w+)/))) items.push({ line, kind: "input", name: m[1] });
      else if ((m = l.match(/^\s*(?:int|void|double|bool|string|long|ulong|datetime)\s+(\w+)\s*\(/))) items.push({ line, kind: "function", name: m[1] });
      else if ((m = l.match(/\b(trade\.(?:Buy|Sell|PositionClose))\s*\(/))) items.push({ line, kind: "order", name: m[1] });
    }
  });
  return items;
}
