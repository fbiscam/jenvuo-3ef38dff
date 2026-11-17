import { createFileRoute } from "@tanstack/react-router";
import { requestHost, robotsTxtForHost } from "@/lib/sitemap-hosts";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        new Response(robotsTxtForHost(requestHost(request)), {
          headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
        }),
    },
  },
});
