# Terminal UI rules

- Terminal dashboard cards share live quotes and technicals through `src/components/terminal/terminal-market.tsx`: one cache, so the top cards and Market Watch never show different prices.
- The Overview/Seasonals tabs read gold history (COMEX futures, daily 10y + monthly max) and headlines (Google News RSS) through `src/lib/terminal-overview.functions.ts`, fetched one after another with an in-memory cache; maths lives in `src/lib/chart/gold-history.ts` (tested): parallel bursts get rate-limited by the price source.
