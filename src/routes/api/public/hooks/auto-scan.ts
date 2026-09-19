import { createFileRoute } from "@tanstack/react-router";

// Automated scanning/broadcasting is retired.
// The Live Signals page was removed, so no scheduled or manual broadcast scan
// runs any more. Analysis is on-demand only (extension + dashboard requests).
export const Route = createFileRoute("/api/public/hooks/auto-scan")({
  server: {
    handlers: {
      POST: async () =>
        new Response(
          JSON.stringify({ ok: true, disabled: true, reason: "automated_scanning_retired" }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      GET: async () =>
        new Response(
          JSON.stringify({ ok: true, disabled: true, reason: "automated_scanning_retired" }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    },
  },
});
