import * as React from "react";
import { Check } from "lucide-react";

/**
 * Looping "bot being built" scene for the JX Bot page: the EA's rules are typed
 * out in colored code on a pure white canvas while the build steps tick off.
 * Illustration of the bot's published rules only — not the full source.
 */
const CODE = `// JX Bot — Gold (XAU/USD) M15 swing EA
#property strict
input double LotPer1000 = 0.02;   // lot per $1,000
input int    StopPips   = 90;     // stop loss on every trade

void OnTick()
{
   if(!NewClosedCandle(PERIOD_M15)) return;
   Swing s = ReadSwing(_Symbol, PERIOD_M15);

   if(s.HigherHigh && s.HigherLow && !HasOpenTrade())
      OpenTrade(ORDER_TYPE_BUY, s.Low);
   else if(s.LowerHigh && s.LowerLow && !HasOpenTrade())
      OpenTrade(ORDER_TYPE_SELL, s.High);
}

void OpenTrade(int type, double swing)
{
   double lot = LotPer1000 * AccountBalance() / 1000.0;
   double sl  = StopFrom(swing, StopPips);   // never without SL
   double tp  = TakeProfitFrom(sl, 2.0);
   Trade.PositionOpen(_Symbol, type, lot, Ask(), sl, tp);
}`;

const LINES = CODE.split("\n");

const STEPS = [
  { at: 4, label: "Risk settings" },
  { at: 9, label: "Read closed M15 candles" },
  { at: 14, label: "Swing rules: HH/HL buy, LH/LL sell" },
  { at: 21, label: "Stop loss + take profit on every order" },
  { at: LINES.length, label: "Compile JXBot.ex5" },
];

const KEYWORDS = /^(input|double|int|bool|void|if|else|return|true|false)\b/;
const RULES: [RegExp, string][] = [
  [/^\/\/[^\n]*/, "jxc-comment"],
  [/^#\w+/, "jxc-macro"],
  [/^"(?:\\.|[^"\\])*"/, "jxc-string"],
  [KEYWORDS, "jxc-keyword"],
  [/^\b(PERIOD_M15|ORDER_TYPE_BUY|ORDER_TYPE_SELL|_Symbol)\b/, "jxc-const"],
  [/^\d+(\.\d+)?/, "jxc-number"],
  [/^[A-Za-z_]\w*(?=\s*\()/, "jxc-func"],
  [/^\b[A-Z]\w*/, "jxc-type"],
];

function paint(line: string, key: number) {
  const out: React.ReactNode[] = [];
  let rest = line;
  let plain = "";
  let k = 0;
  while (rest.length) {
    let hit = false;
    for (const [re, cls] of RULES) {
      const m = re.exec(rest);
      if (m && m[0]) {
        if (plain) { out.push(plain); plain = ""; }
        out.push(<span key={`${key}-${k++}`} className={cls}>{m[0]}</span>);
        rest = rest.slice(m[0].length);
        hit = true;
        break;
      }
    }
    if (!hit) {
      const w = /^[A-Za-z_]\w*|^[\s\S]/.exec(rest)![0];
      plain += w;
      rest = rest.slice(w.length);
    }
  }
  if (plain) out.push(plain);
  return out;
}

const TOTAL = CODE.length;

export default function BotCodingPreview() {
  const [chars, setChars] = React.useState(0);

  React.useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setChars(TOTAL);
      return;
    }
    // Type ~3 characters every 28 ms, hold the finished file, then start over.
    const id = window.setInterval(() => {
      setChars((c) => (c >= TOTAL + 160 ? 0 : c + 3));
    }, 28);
    return () => window.clearInterval(id);
  }, []);

  const typed = CODE.slice(0, Math.min(chars, TOTAL));
  const typedLines = typed.split("\n");
  const lineCount = typedLines.length;
  const done = chars >= TOTAL;

  return (
    <div className="jx-code-scene mx-auto mt-16 w-full max-w-[980px] overflow-hidden rounded-[22px] text-left shadow-[0_30px_80px_-40px_rgba(0,0,0,0.22)]">
      <div className="flex items-center gap-2 px-5 pt-4 text-[12px]">
        <span className="rounded-md bg-[#f3f4f6] px-2.5 py-1 font-mono text-[#111827]">JXBot.mq5</span>
        <span className="font-mono text-[#9ca3af]">MetaEditor 5</span>
        <span className="ml-auto inline-flex items-center gap-1.5 font-mono text-[#6b7280]">
          <span className={`h-2 w-2 rounded-full ${done ? "bg-[#16a34a]" : "jx-pulse bg-[#f59e0b]"}`} />
          {done ? "0 errors, 0 warnings" : "Writing…"}
        </span>
      </div>

      <div className="grid gap-0 md:grid-cols-[1fr_250px]">
        <pre className="m-0 overflow-hidden px-5 pb-6 pt-4 font-mono text-[12px] leading-[1.7] text-[#1f2937] sm:text-[13px]" aria-label="JX Bot code being written">
          <code className="block min-h-[420px] sm:min-h-[460px]">
            {LINES.map((full, i) => {
              const visible = i < lineCount ? typedLines[i] : null;
              return (
                <div key={i} className="flex">
                  <span className="w-8 shrink-0 select-none pr-3 text-right text-[#c0c4cc]">{i + 1}</span>
                  <span className="whitespace-pre">
                    {visible !== null ? paint(visible, i) : <span className="invisible">{full || " "}</span>}
                    {i === lineCount - 1 && !done && <span className="jx-caret ml-px inline-block h-[1.05em] w-[2px] translate-y-[2px] bg-[#2563eb]" />}
                  </span>
                </div>
              );
            })}
          </code>
        </pre>

        <div className="hidden flex-col gap-2 px-5 pb-6 pt-4 md:flex">
          <span className="text-[12px] font-medium text-[#6b7280]">Build steps</span>
          {STEPS.map((s) => {
            const ok = lineCount > s.at || done;
            return (
              <div
                key={s.label}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] transition-all duration-500 ${ok ? "bg-[#f0fdf4] text-[#14532d]" : "bg-[#f9fafb] text-[#9ca3af]"}`}
              >
                <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ${ok ? "bg-[#16a34a] text-white" : "bg-[#e5e7eb]"}`}>
                  {ok && <Check className="h-3 w-3" strokeWidth={3} />}
                </span>
                {s.label}
              </div>
            );
          })}
          <div className="mt-auto rounded-xl bg-[#f9fafb] p-3 font-mono text-[11px] leading-relaxed text-[#6b7280]">
            <div>Symbol <span className="text-[#111827]">XAUUSD</span></div>
            <div>Timeframe <span className="text-[#111827]">M15</span></div>
            <div>Lot <span className="text-[#111827]">0.02 / $1,000</span></div>
            <div>Stop loss <span className="text-[#16a34a]">always on</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
