# TradingView-style Demo Trading

## What will be added
- Add a Demo Trading control inside the Terminal with a clearly labelled virtual balance.
- Let users open demo Buy or Sell positions on live XAU/USD, choose quantity, and see entry price, current price, unrealized P&L, and equity.
- Let users close individual positions, close all positions, and reset the demo account after confirmation.
- Keep demo positions and balance saved in the browser so they remain after refresh, without affecting real funds or the existing trade journal.
- Show open demo positions directly on the chart with distinct entry lines and compact profit/loss status.

## Safety and behavior
- Use live chart price for fills and ongoing P&L.
- Keep the feature explicitly marked as demo trading; it will never place a real order.
- Default new demo accounts to a $100,000 virtual balance.
- Validate quantity and prevent orders that exceed available virtual buying power.

## Technical details
- Add a focused local demo-account state module with deterministic balance, equity, realized P&L, and position calculations.
- Connect the chart's current live price to the demo panel and chart overlays.
- Use existing Jenvu controls, colors, and responsive Terminal patterns.
- Resolve the reported `utils.ts` diagnostic against current source, then run targeted TypeScript and interaction checks on desktop and mobile.
