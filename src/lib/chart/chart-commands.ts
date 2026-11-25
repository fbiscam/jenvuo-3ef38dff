/**
 * Chart commands typed into Ask Jenvu ("add RSI", "remove MACD", "switch to 4H").
 * Pure parser — the Terminal applies the result to the live chart.
 */
export type ChartCommand =
  | { kind: "indicator"; id: string; on: boolean }
  | { kind: "timeframe"; key: string };

const INDICATOR_WORDS: Array<[RegExp, string]> = [
  [/\bema\s*200\b/, "ema200"],
  [/\bema\s*50\b/, "ema50"],
  [/\bema\s*20\b/, "ema20"],
  [/\bsma\s*20\b/, "sma20"],
  [/\b(rsi)\b/, "rsi"],
  [/\b(macd)\b/, "macd"],
  [/\b(bollinger|bb)\b/, "bb"],
  [/\b(vwap)\b/, "vwap"],
  [/\b(atr)\b/, "atr"],
  [/\b(rvol|relative volume)\b/, "rvol"],
  [/\bsupport\b|\bresistance\b|\bs\/r\b/, "sr"],
  [/\bvolume\b/, "volume"],
];

const ADD = /\b(add|show|enable|turn on|lagao|laga do|on karo|dikhao)\b/;
const REMOVE = /\b(remove|hide|disable|turn off|delete|hatao|hata do|band karo|off karo)\b/;
const TF = /\b(?:switch to|change to|timeframe|tf|go to|open|kar do|karo)?\s*(1|3|5|10|15|30|45)\s*(m|min|minute)s?\b|\b(1|2|3|4|6|12)\s*(h|hr|hour)s?\b|\b(1)\s*(d|day)\b|\bdaily\b/;

export function parseChartCommands(text: string, timeframeKeys: readonly string[]): ChartCommand[] {
  const t = ` ${text.toLowerCase()} `;
  const out: ChartCommand[] = [];
  const add = ADD.test(t);
  const remove = REMOVE.test(t);
  if (add !== remove) {
    let rest = t;
    for (const [re, id] of INDICATOR_WORDS) {
      if (re.test(rest)) {
        out.push({ kind: "indicator", id, on: add });
        rest = rest.replace(re, " ");
      }
    }
  }
  const wantsTf = /\b(switch|change|timeframe|tf|go to|chart)\b|kar do|karo|par le/.test(t);
  const m = wantsTf ? t.match(TF) : null;
  if (m) {
    let key = "";
    if (m[1]) key = `${m[1]}m`;
    else if (m[3]) key = `${m[3]}h`;
    else key = "1d";
    if (timeframeKeys.includes(key)) out.push({ kind: "timeframe", key });
  }
  return out;
}
