import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/tv-extension")({
  head: () => ({
    meta: [
      { title: "TradingView Marker Extension — Jenvu" },
      {
        name: "description",
        content:
          "Install the Jenvu TradingView Marker Chrome extension. Auto-open pairs, see the latest Entry / SL / TP overlay right on your TradingView chart.",
      },
      { property: "og:title", content: "TradingView Marker Extension — Jenvu" },
      {
        property: "og:description",
        content:
          "Chrome extension that overlays Jenvu's latest Entry / SL / TP on TradingView.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "TradingView Marker Extension — Jenvu" },
      {
        name: "twitter:description",
        content:
          "Chrome extension that overlays Jenvu's latest Entry / SL / TP on TradingView.",
      },
    ],
  }),
  component: TvExtensionPage,
});

function TvExtensionPage() {
  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="mb-8">
          <Link to="/dashboard" className="text-xs uppercase tracking-wider text-zinc-500 hover:text-zinc-900">
            ← Back to Dashboard
          </Link>
        </div>

        <h1 className="text-4xl font-semibold tracking-tight">TradingView Marker</h1>
        <p className="mt-3 text-zinc-600">
          A lightweight Chrome extension that overlays Jenvu's latest signal — Entry, Stop Loss, Take Profit —
          directly on your TradingView chart, with one-click pair switching.
        </p>

        <div className="mt-8 rounded-2xl border border-zinc-200 bg-zinc-50 p-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="text-xs uppercase tracking-wider text-zinc-500">Version</div>
              <div className="text-lg font-medium">Phase 1 · Overlay</div>
            </div>
            <a
              href="/jenvu-tv-marker.zip"
              download
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Download .zip
            </a>
          </div>
        </div>

        <h2 className="mt-12 text-lg font-semibold">Install (Chrome / Edge / Brave)</h2>
        <ol className="mt-4 space-y-3 text-sm text-zinc-700 list-decimal pl-5">
          <li>Download the <code className="rounded bg-zinc-100 px-1.5 py-0.5">.zip</code> above and unzip it.</li>
          <li>Open <code className="rounded bg-zinc-100 px-1.5 py-0.5">chrome://extensions</code> in your browser.</li>
          <li>Toggle <strong>Developer mode</strong> on (top-right).</li>
          <li>Click <strong>Load unpacked</strong> and select the unzipped folder.</li>
          <li>Pin the Jenvu icon and open any TradingView chart — the overlay appears automatically.</li>
        </ol>

        <h2 className="mt-12 text-lg font-semibold">What it does</h2>
        <ul className="mt-4 space-y-2 text-sm text-zinc-700 list-disc pl-5">
          <li>Click a pair in the popup to auto-open it on TradingView.</li>
          <li>Live overlay of Entry / SL / TP from the latest Jenvu signal.</li>
          <li>One-tap copy for each level.</li>
          <li>Auto-refresh — updates when a new signal broadcasts.</li>
        </ul>

        <p className="mt-10 text-xs text-zinc-500">
          Phase 2 (auto-drawing OB / FVG / liquidity zones directly on the chart) is in progress.
        </p>
      </div>
    </div>
  );
}
