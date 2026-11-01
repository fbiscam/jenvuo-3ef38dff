import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Download, FileCode2, Loader2 } from "lucide-react";
import { highlight } from "@/components/dashboard/CodeHighlight";
import type { CodeKind, ReplyFile } from "@/lib/chat-files";

// Realistic lines typed while the AI writes. Several variants per language so
// the animation is never the same twice in a row.
const SNIPPETS: Record<CodeKind, { file: string; lines: string[] }[]> = {
  mql5: [
    { file: "JXBot.mq5", lines: ["#property strict", "#include <Trade/Trade.mqh>", "CTrade trade;", "input double RiskPer1000 = 0.02;", "input int    FastEMA = 50;", "int OnInit() {", "  emaFast = iMA(_Symbol, PERIOD_M15, FastEMA, 0, MODE_EMA, PRICE_CLOSE);", "  return INIT_SUCCEEDED;", "}", "void OnTick() {", "  if (!NewBar()) return;", "  double sl = SwingLow(10) - 0.5 * Atr();", "  trade.Buy(LotSize(), _Symbol, Ask(), sl, TakeProfit(sl));", "}"] },
    { file: "GoldSweep.mq5", lines: ["#property description \"Gold liquidity sweep EA\"", "#include <Trade/PositionInfo.mqh>", "CPositionInfo pos;", "input int SweepLookback = 10;", "bool SweptLow() {", "  double low = iLow(_Symbol, PERIOD_M15, 1);", "  return low < LowestLow(SweepLookback) && Close(1) > LowestLow(SweepLookback);", "}", "double LotSize() {", "  return NormalizeDouble(AccountInfoDouble(ACCOUNT_BALANCE) / 1000 * 0.02, 2);", "}"] },
    { file: "FvgEntry.mq5", lines: ["input double MinGapAtr = 0.1;", "struct Fvg { double top; double bottom; datetime t; };", "bool FindBullFvg(Fvg &g) {", "  double h3 = iHigh(_Symbol, PERIOD_M15, 3);", "  double l1 = iLow(_Symbol, PERIOD_M15, 1);", "  if (l1 - h3 < MinGapAtr * Atr()) return false;", "  g.top = l1; g.bottom = h3;", "  return true;", "}"] },
  ],
  pine: [
    { file: "Strategy.pine", lines: ["//@version=6", "indicator(\"Jenvu FVG + Swings\", overlay = true)", "atr = ta.atr(14)", "bullGap = low > high[2] and (low - high[2]) > 0.1 * atr", "bearGap = high < low[2] and (low[2] - high) > 0.1 * atr", "if bullGap", "    box.new(bar_index - 2, low, bar_index, high[2], bgcolor = color.new(color.teal, 80))", "alertcondition(bullGap, \"Bullish FVG\", \"New bullish FVG on {{ticker}}\")"] },
    { file: "Sessions.pine", lines: ["//@version=6", "indicator(\"London / NY killzones\", overlay = true)", "london = time(timeframe.period, \"0700-1000\", \"UTC\")", "newYork = time(timeframe.period, \"1200-1500\", \"UTC\")", "bgcolor(not na(london) ? color.new(color.blue, 90) : na)", "bgcolor(not na(newYork) ? color.new(color.orange, 90) : na)"] },
    { file: "SwingBos.pine", lines: ["//@version=6", "strategy(\"Swing BOS\", overlay = true)", "ph = ta.pivothigh(high, 5, 5)", "pl = ta.pivotlow(low, 5, 5)", "var float lastHigh = na", "if not na(ph)", "    lastHigh := ph", "if ta.crossover(close, lastHigh)", "    strategy.entry(\"Long\", strategy.long)"] },
  ],
  python: [
    { file: "backtest.py", lines: ["import pandas as pd", "def ema(series, n):", "    return series.ewm(span=n, adjust=False).mean()", "df = pd.read_csv(\"xauusd_m15.csv\")", "df[\"fast\"] = ema(df[\"close\"], 50)", "df[\"slow\"] = ema(df[\"close\"], 200)", "signals = df[df[\"fast\"] > df[\"slow\"]]", "print(len(signals), \"trend candles\")"] },
    { file: "rsi.py", lines: ["def rsi(closes, n=14):", "    gains, losses = [], []", "    for a, b in zip(closes, closes[1:]):", "        gains.append(max(b - a, 0))", "        losses.append(max(a - b, 0))", "    avg_gain = sum(gains[-n:]) / n", "    return 100 - 100 / (1 + avg_gain / max(sum(losses[-n:]) / n, 1e-9))"] },
  ],
  web: [
    { file: "index.html", lines: ["<!doctype html>", "<html lang=\"en\">", "  <head><title>Gold dashboard</title></head>", "  <body>", "    <main id=\"app\"></main>", "    <script type=\"module\" src=\"./app.js\"></script>", "  </body>", "</html>"] },
  ],
  generic: [
    { file: "main.ts", lines: ["export function positionSize(balance: number, riskPer1000 = 0.02) {", "  return Math.round((balance / 1000) * riskPer1000 * 100) / 100;", "}", "const lots = positionSize(5000);", "console.log(`Lot size: ${lots}`);"] },
  ],
};

function useTyped(lines: string[], active: boolean) {
  const [n, setN] = useState(0);
  const total = lines.join("\n").length;
  useEffect(() => {
    setN(0);
    if (!active) return;
    const id = setInterval(() => setN((c) => (c >= total ? 0 : c + 3)), 28);
    return () => clearInterval(id);
  }, [lines, active, total]);
  return lines.join("\n").slice(0, n);
}

type Props = {
  files: ReplyFile[];
  busy: boolean;
  kind: CodeKind;
  seed: number;
  onDownload: (f: ReplyFile) => void;
};

/** Read-only code editor shown beside the chat while the AI builds code. */
export function ChatCodeStudio({ files, busy, kind, seed, onDownload }: Props) {
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);
  useEffect(() => setActive(0), [files]);
  const variants = SNIPPETS[kind];
  const snippet = variants[seed % variants.length];
  const showTyping = !files.length;
  const typed = useTyped(snippet.lines, showTyping);
  const file = files[Math.min(active, files.length - 1)];
  const code = showTyping ? typed : file?.code ?? "";
  const lines = useMemo(() => code.replace(/\n$/, "").split("\n"), [code]);

  const copy = async () => {
    if (!file) return;
    try {
      await navigator.clipboard.writeText(file.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="code-box flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl">
      <div className="flex items-center gap-1 border-b border-current/10 px-2 pt-2">
        <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
          {showTyping ? (
            <span className="inline-flex items-center gap-2 rounded-t-lg px-3 py-2 text-[13px] font-medium">
              <FileCode2 className="h-4 w-4 opacity-70" /> {snippet.file}
            </span>
          ) : (
            files.map((f, i) => (
              <button
                key={f.name}
                type="button"
                onClick={() => setActive(i)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-t-lg px-3 py-2 text-[13px] font-medium ${i === active ? "opacity-100" : "opacity-55 hover:opacity-90"}`}
                style={i === active ? { boxShadow: "inset 0 -2px 0 currentColor" } : undefined}
              >
                <FileCode2 className="h-4 w-4 opacity-70" /> {f.name}
              </button>
            ))
          )}
        </div>
        {!showTyping && file && (
          <div className="flex shrink-0 items-center gap-1 pb-1">
            <button type="button" onClick={() => void copy()} aria-label="Copy code" className="code-box-copy rounded-md p-1.5">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
            <button type="button" onClick={() => onDownload(file)} aria-label={`Download ${file.name}`} className="code-box-copy rounded-md p-1.5">
              <Download className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-auto py-3 font-mono text-[13.5px] leading-[1.7]">
        {lines.map((l, i) => (
          <div key={i} className="flex">
            <span className="w-12 shrink-0 select-none pr-4 text-right opacity-40">{i + 1}</span>
            <code className="whitespace-pre pr-6">
              {highlight(l)}
              {showTyping && i === lines.length - 1 && <span className="jx-caret ml-0.5 inline-block h-[1.05em] w-[7px] translate-y-[2px] bg-current" />}
            </code>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 border-t border-current/10 px-4 py-2 text-[12px] opacity-70">
        {showTyping || busy ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> {showTyping ? `Writing ${snippet.file.split(".").pop()?.toUpperCase()} code…` : `Updating ${file?.name}…`}
          </>
        ) : (
          <>
            {file?.lang.toUpperCase()} · {lines.length} lines · Ask the AI on the right to change anything
          </>
        )}
      </div>
    </div>
  );
}
