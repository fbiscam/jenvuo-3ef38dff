# Fix extension screen-analysis timeout

## Changes
- Keep the completed primary chart analysis available when the senior reviewer is temporarily unavailable.
- Shorten and separate the senior-review budget so it cannot consume the extension’s entire request window.
- Return an accurate review status and friendly retry note instead of failing the whole analysis.
- Update the extension status line to distinguish primary completion from senior-review failure.
- Rebuild the downloadable extension package and verify TypeScript, JavaScript syntax, and ZIP structure.

## Technical details
- Preserve mandatory-review safety by clearly labeling an unreviewed result and avoiding a false “reviewed” state.
- Do not change normal chat routing, plan access, billing rules, or unrelated AI providers.
