# Fix chart direction colors and Inside Bar labels

## Changes
- Restore directional FVG styling: bullish gaps remain green; bearish gaps use the chart’s bearish red fill, border, and label color.
- Restore Inside Bar script markers by adding their `IB` marker shapes back to the chart series while retaining yellow candle highlighting.
- Add focused regression coverage for both behaviors where the current chart test structure supports it.
- Record both fixes in the roadmap.

## Verification
- Run the relevant chart tests and TypeScript check.
- Open the authenticated Terminal and confirm bearish FVG styling and Inside Bar labels render when matching data is present.
- Check the latest build status, then resolve both Project monitoring findings.

## Technical details
- Keep the existing canvas renderer and script marker pipeline; only correct the directional style branch and remove the erroneous Inside Bar skip.
- Leave `src/lib/utils.ts` unchanged because its current `cn` function already returns a string and the reported line 8 does not exist.
