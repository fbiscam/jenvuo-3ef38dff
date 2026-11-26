/** Which of the 3 traded pairs a calendar event can move (pure, tested). */
export const NEWS_PAIRS = ["XAUUSD", "EURUSD", "BTCUSD"] as const;
export type NewsPair = (typeof NEWS_PAIRS)[number];
export type NewsImpactLevel = "High" | "Medium" | "Low";

export function impactLevel(raw: string): NewsImpactLevel | null {
  if (/high/i.test(raw)) return "High";
  if (/medium/i.test(raw)) return "Medium";
  if (/low/i.test(raw)) return "Low";
  return null; // holidays / non-economic rows
}

/** EUR/USD: every EUR + USD release. Gold: USD/XAU + high-impact CNY/EUR. BTC: USD macro + any high-impact event. */
export function pairsFor(country: string, impact: NewsImpactLevel): NewsPair[] {
  const c = country.toUpperCase();
  const out: NewsPair[] = [];
  if (c === "USD" || c === "XAU" || (impact === "High" && (c === "CNY" || c === "EUR"))) out.push("XAUUSD");
  if (c === "EUR" || c === "USD") out.push("EURUSD");
  if (c === "USD" || impact === "High") out.push("BTCUSD");
  return out;
}
