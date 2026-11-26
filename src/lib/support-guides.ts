/** Short Support page guides that homepage links jump to (support page #id). Titles ≤ 4 words, text ≤ 3 lines. */
export type SupportGuide = { id: string; title: string; text: string };

export const SUPPORT_GUIDES: SupportGuide[] = [
  { id: "gold-terminal", title: "Non-repainting gold Terminal", text: "Swing labels, BOS and CHoCH lock in once a candle closes, so the chart history you see never redraws." },
  { id: "fair-value-gaps", title: "Fair value gaps", text: "An FVG is a gap price leaves across three candles. Strong zones are paired with FVGs and kept until clearly broken." },
  { id: "fakeout-filters", title: "Sweep fakeout filters", text: "Tiny pokes are ignored. A sweep needs a reclaim and a reversal within two candles; late or failed sweeps are marked." },
  { id: "ai-desk", title: "Jenvu AI desk", text: "Ask about the chart in plain words. The AI answers only that question and says WAIT when the evidence is weak." },
  { id: "ai-models", title: "Top-tier AI models", text: "Chat with text, screenshots or voice. The models read the same chart data you see in the Terminal." },
  { id: "rvol", title: "RVOL spike colours", text: "Each volume bar is compared with the 20-candle average. Bright colours mark spikes; the buy/sell split is an estimate." },
  { id: "api-keys", title: "API keys", text: "Create a key in your dashboard and use Jenvu models in your own apps and bots at $3 per million tokens." },
  { id: "browser-extension", title: "Browser extension", text: "Add the Jenvu side panel to TradingView so it can read your chart. Install it from the Download page." },
];
