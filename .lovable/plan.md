# Upcoming Gold News in Terminal

## What will change
- Add a compact upcoming-news panel in the Terminal chart toolbar, immediately left of the candle countdown.
- Show the next future high-impact USD event relevant to XAU/USD, including event name, date, and time in New York (UTC−4).
- Keep the panel white and lightly transparent, with restrained borders and spacing aligned to the existing chart controls.
- Include clear loading, no-upcoming-news, and unavailable states without disturbing the chart.

## Technical details
- Reuse the existing Gold news server function rather than creating a second feed.
- Refresh periodically so the next event advances automatically after its release time.
- Format the displayed time explicitly as `America/New_York` and label it `UTC−4 New York` as requested.
- Keep the layout compact on smaller screens by truncating the event title while preserving the date/time.
- Verify the current TypeScript diagnostic; `src/lib/utils.ts` already returns a string and will only be changed if the current check reproduces the error.

## Verification
- Confirm the Terminal opens and the news panel is aligned left of the timer.
- Confirm future-event filtering and New York date/time formatting.
- Run the focused code check after implementation.
