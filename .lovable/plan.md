# Daily BluesMinds articles

## What will change
- Keep the existing Insights system and publish at most one new article every 24 hours.
- Test the model IDs currently returned by BluesMinds, choose the strongest reliable text model, and use it first for article writing.
- Generate a unique cover image before publishing; do not publish an article without a valid image.
- Submit each published article to IndexNow and include it in the existing sitemap automatically.
- Keep Google submission enabled when a Google Search Console connection becomes available; currently no accessible connection is linked.

## Reliability and safety
- Replace the duplicate morning/evening schedules with one daily run.
- Add a persisted job state with a single-run lease, completed-item tracking, bounded one-article batches, and paused/error status.
- Stop automated generation on provider billing or authorization failures; retry only temporary rate-limit/server failures on a later run.
- Record the model, image result, publishing result, and indexing result for each run.

## Technical details
- Update the existing `/api/public/hooks/generate-insight` route instead of creating another generator.
- Add a small database table for article-job status and run history, secured for backend-only access.
- Remove artificial AI request timers from this scheduled article path so completed generations are not discarded.
- Preserve the existing public Insights pages, SEO metadata, canonical URLs, and sitemap behavior.
- Clear the stale TypeScript cache and verify the project after implementation.
