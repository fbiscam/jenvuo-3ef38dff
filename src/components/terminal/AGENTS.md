# Terminal UI rules

- Terminal dashboard cards share live quotes and technicals through `src/components/terminal/terminal-market.tsx`: one cache, so the top cards and Market Watch never show different prices.
- The main chart offers Line (area) or Candles, remembered per browser; the old Overview area chart under it was folded into this switch. The Seasonals tab reads gold history (COMEX futures, daily 10y + monthly max) and headlines (Google News RSS) through `src/lib/terminal-overview.functions.ts`, fetched one after another with an in-memory cache; maths lives in `src/lib/chart/gold-history.ts` (tested): parallel bursts get rate-limited by the price source.
