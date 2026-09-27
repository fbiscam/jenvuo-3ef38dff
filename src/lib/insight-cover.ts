import bitcoinCover from "@/assets/insights/bitcoin-analysis-editorial.jpg";
import globalSessionsCover from "@/assets/insights/global-sessions-editorial.jpg";
import goldStructureCover from "@/assets/insights/gold-structure-editorial.jpg";
import smartMoneyCover from "@/assets/insights/smart-money-editorial.jpg";

const BITCOIN_TERMS = /bitcoin|btc|crypto/i;
const SESSION_TERMS = /london|frankfurt|new york|session|macro|global|forecast|outlook/i;
const SMART_MONEY_TERMS = /smart money|smc|ict|order block|fair value|liquidity|killzone/i;

export function fallbackInsightCover(title: string, category = ""): string {
  const subject = `${title} ${category}`;
  if (BITCOIN_TERMS.test(subject)) return bitcoinCover;
  if (SESSION_TERMS.test(subject)) return globalSessionsCover;
  if (SMART_MONEY_TERMS.test(subject)) return smartMoneyCover;
  return goldStructureCover;
}

export function insightCoverUrl(title: string, category: string, imageUrl?: string | null): string {
  if (!imageUrl || /images\.unsplash\.com|source\.unsplash\.com|\/insight-image\/[^?]+\.svg(?:\?|$)/i.test(imageUrl)) {
    return fallbackInsightCover(title, category);
  }
  return imageUrl;
}