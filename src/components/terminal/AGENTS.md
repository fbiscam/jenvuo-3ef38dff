# Terminal components

- The Terminal stays unzoomed but its top bar and menu drawer use `.jenvu-zoom-chrome` (same breakpoints as `.jenvu-zoom-dashboard`): keeps header/menu the same size on every dashboard page.
- Terminal panels live in `src/components/terminal/TerminalProPanels.tsx` (rail style in `rail-style.ts`) and get live data only via the chart's `onMarketUpdate`: never fetch or invent prices apart from the chart.
- The Terminal look comes from the `.terminal-modern` token scope in `src/styles.css` (page, top bar and chart popovers via `popoverClassName`) with the chart canvas theme set by `canvasTheme`: one place to retheme without hardcoded colours, and the menu drawer stays like other dashboard pages.
- Performance and Technicals numbers come from `src/lib/chart/market-stats.ts` (tested) using only loaded candles: the cards stay deterministic and never show windows the feed does not cover.
