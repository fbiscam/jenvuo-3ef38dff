import { createFileRoute } from "@tanstack/react-router";

// Public read-only proxy for insight cover images stored in the private
// `insight-images` bucket, so <img src> works without signed URLs.
// If storage can't be read here (e.g. the preview server has no admin key),
// send the browser to the published copy instead of failing with a 500.
const LIVE_ORIGIN = "https://jenvu.com";

export const Route = createFileRoute("/api/public/insight-image/$")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const path = (params as { _splat?: string })._splat ?? "";
        if (!path || path.includes("..") || path.length > 300) {
          return new Response("Not found", { status: 404 });
        }

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data, error } = await supabaseAdmin.storage.from("insight-images").download(path);
          if (error || !data) return new Response("Not found", { status: 404 });

          return new Response(await data.arrayBuffer(), {
            headers: {
              "Content-Type": data.type || "image/png",
              "Cache-Control": "public, max-age=31536000, immutable",
            },
          });
        } catch (err) {
          console.error(err);
          const host = new URL(request.url).hostname;
          const isLive = host === "jenvu.com" || host.endsWith(".jenvu.com") || (host.endsWith(".lovable.app") && !host.includes("preview"));
          if (isLive) return new Response("Image unavailable", { status: 503 });
          return Response.redirect(
            `${LIVE_ORIGIN}/api/public/insight-image/${path.split("/").map(encodeURIComponent).join("/")}`,
            302,
          );
        }
      },
    },
  },
});
