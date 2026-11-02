// Chat page image generation. Signed-in users with API access only; the
// gateway's SSE stream is forwarded as-is so the page can show live previews.
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

async function userIdFrom(request: Request): Promise<string | null> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!token || !url || !key) return null;
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await sb.auth.getUser(token);
  return error || !data.user ? null : data.user.id;
}

export const Route = createFileRoute("/api/chat-image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const userId = await userIdFrom(request);
        if (!userId) return json({ error: { message: "Please sign in again to create images." } }, 401);

        const body = (await request.json().catch(() => ({}))) as { prompt?: unknown; stream?: unknown };
        const prompt = typeof body.prompt === "string" ? body.prompt.trim().slice(0, 4000) : "";
        if (!prompt) return json({ error: { message: "Describe the image you want." } }, 400);

        const { getExtensionEntitlement } = await import("@/lib/extension-billing.server");
        const entitlement = await getExtensionEntitlement(userId);
        if (!entitlement.allowed) {
          return json({ error: { message: String(entitlement.error || "Your plan doesn't include AI images.") } }, 403);
        }

        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) return json({ error: { message: "Image service isn't set up yet." } }, 500);
        const { generateImage, imageSettings } = await import("@/lib/image-gateway.server");
        const upstream = await generateImage({ ...imageSettings, apiKey }, prompt, body.stream !== false);
        return new Response(upstream.body, {
          status: upstream.status,
          headers: {
            "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
            "Cache-Control": "no-cache",
          },
        });
      },
    },
  },
});
