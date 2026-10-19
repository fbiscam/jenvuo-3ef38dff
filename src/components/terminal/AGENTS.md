# Terminal components

- The Terminal stays unzoomed but its top bar and menu drawer use `.jenvu-zoom-chrome` (same breakpoints as `.jenvu-zoom-dashboard`): keeps header/menu the same size on every dashboard page.
- Terminal panels live in `src/components/terminal/TerminalProPanels.tsx` (rail style in `rail-style.ts`) and get live data only via the chart's `onMarketUpdate`: never fetch or invent prices apart from the chart.
