// How-to guide for the Terminal's Jenvu SMC tools and indicators.
// One source: the Help Center article (help-content.ts) and the Terminal AI prompt
// (gold-analysis.functions.ts) both read from here, so answers match the docs.

export type ToolGuide = { name: string; what: string; how: string };

export const SMC_TOOL_GUIDES: ToolGuide[] = [
  { name: "Swing structure", what: "Labels each confirmed swing high/low as HH, HL, LH or LL.", how: "HH + HL = bullish structure, LH + LL = bearish. Read it on 4H/1H first for bias, then trade in that direction on lower timeframes." },
  { name: "Buyer / seller pressure", what: "Shows the % of buyers vs sellers at each swing, from closed candles only.", how: "Above 55% on the reversal side supports the turn; balanced readings mean wait. Pressure never creates Entry/SL/TP." },
  { name: "Swing price action", what: "A tag on fresh highs/lows when a real reversal pattern printed (pin rejection, engulfing or strong reversal) and one side controls at least 60%.", how: "Shows only on 1H, 2H, 4H and 1D, and only after the next 3 candles have closed and the move held. Fewer tags is normal: weak or indecision swings are hidden on purpose." },
  { name: "Fresh sweep (1H–1D)", what: "Marks when a fresh high/low wicked past the previous 10 candles' extreme and closed back inside.", how: "Only strong sweeps show: rejection wick at least 1.5x the body, a displacement move within 2 candles, and no close back past the swept level for 5 candles. Use it as liquidity taken before a reversal, then wait for structure to confirm." },
  { name: "BOS / CHoCH", what: "BOS = break of structure in the trend direction; CHoCH = change of character, the first break against it.", how: "Only candle closes count, wicks do not. A CHoCH after a sweep is an early reversal warning; a BOS confirms continuation." },
  { name: "Zone + FVG strategy", what: "Draws the newest supply or demand zone that has its own fair value gap (FVG) printed within 5 candles of the swing.", how: "Works on 1M to 1D. Zones form only from confirmed swings with strength 70 or more. Mark the zone on 4H/1H, refine on 15M, wait for price to return and react on 5M/15M. A candle close through the zone or a wick to its stop removes it." },
  { name: "Previous zones & FVG", what: "Faded boxes of the last 10 zones that are no longer live (15M and higher).", how: "Use it to review how past zones played out. They never carry trade levels." },
  { name: "Liquidity sweeps", what: "Equal highs/lows (EQH/EQL) liquidity pools and the NEXT SWEEP target.", how: "A pool is drawn as swept only when the sweep held and scored 80 or more. Untaken pools are where price often runs next." },
  { name: "Liquidity", what: "Nearest buy-side (above highs) and sell-side (below lows) liquidity pools.", how: "Use them as targets or as places to expect a sweep before a reversal." },
  { name: "Fresh FVG", what: "The newest unfilled bullish or bearish fair value gap (3-candle imbalance).", how: "Price often returns to fill part of the gap. A close beyond its far edge removes it." },
  { name: "Order blocks", what: "Strict demand/supply blocks: the last opposite candle before a strong move.", how: "Best when they line up with a sweep, an FVG and the higher-timeframe bias." },
];

export const INDICATOR_GUIDES: ToolGuide[] = [
  { name: "Volume / Volume (RVOL + Spike)", what: "Feed volume per candle; RVOL compares it with the last 20 candles (1.5x = High, 2.5x = Ultra).", how: "Spikes at a zone or sweep add weight. Gold trades over the counter, so volume is a feed estimate, not real central order flow." },
  { name: "EMA 20 / 50 / 200, SMA 20", what: "Moving averages of price.", how: "Price above a rising 50/200 favours buys, below a falling one favours sells. EMA 20 shows short-term momentum." },
  { name: "Bollinger Bands", what: "20-bar average with bands 2 standard deviations away.", how: "Tight bands warn a big move is coming; tags of the outer band in a range can mean stretched price." },
  { name: "VWAP", what: "Volume-weighted average price for the session.", how: "Acts as a fair-value line: above it buyers lead, below it sellers lead." },
  { name: "RSI 14", what: "Momentum from 0 to 100.", how: "Above 70 is stretched up, below 30 stretched down. Divergence at a sweep or zone supports a reversal." },
  { name: "MACD 12/26/9", what: "Trend momentum from two EMAs and a signal line.", how: "Crosses and histogram turns confirm momentum shifts; use with structure, not alone." },
  { name: "Support & Resistance", what: "Key levels where price reacted before.", how: "Combine with zones and liquidity to find where price may stall or reverse." },
  { name: "ATR 14", what: "Average candle range (volatility).", how: "Use it to size stops so they sit outside normal noise." },
];

export const TOOLS_HOW_TO_OPEN = [
  "Open the Terminal from the dashboard menu.",
  "In the chart's left rail, the Indicators button opens the indicator list and the Jenvu SMC button opens the SMC tools. Switch each tool on or off; choices are saved.",
  "Pick a timeframe from the Timeframe button. Swing price action, Fresh sweep and Liquidity sweeps show only on 1H, 2H, 4H and 1D; their switches hide on other timeframes.",
  "Fresh sweep, Swing price action and the Zone + FVG strategy are included with a plan (Pro, Elite, Ultra, Founding or the Pro free trial). The Terminal is locked without a plan.",
];

export const TOOLS_WORKFLOW = [
  "4H / 1H: read Swing structure and BOS/CHoCH for the bias.",
  "1H–4H: look for a Fresh sweep or Liquidity sweep at a high/low.",
  "15M: find the Zone + FVG zone in the bias direction.",
  "5M / 15M: wait for price to return to the zone and react (price action, CHoCH) before entering.",
  "Size the stop with ATR and test on the demo account first. No tool guarantees a result.",
];

function lines(list: ToolGuide[]): string {
  return list.map((t) => `- ${t.name}: ${t.what} How to use: ${t.how}`).join("\n");
}

/** Compact text for AI prompts. */
export const CHART_TOOLS_GUIDE_TEXT = `JENVU TERMINAL TOOLS GUIDE (use when the user asks how to use SMC tools or indicators; explain step by step in the user's language):
Where to find them:
${TOOLS_HOW_TO_OPEN.map((s) => `- ${s}`).join("\n")}
SMC tools:
${lines(SMC_TOOL_GUIDES)}
Indicators:
${lines(INDICATOR_GUIDES)}
Suggested workflow:
${TOOLS_WORKFLOW.map((s, i) => `${i + 1}. ${s}`).join("\n")}
Signals are filtered strictly, so fewer marks is normal. Never promise profits or a fixed win rate.`;
