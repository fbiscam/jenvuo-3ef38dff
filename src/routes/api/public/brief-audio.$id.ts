import { createFileRoute } from "@tanstack/react-router";

// Public audio proxy for a brief. Streams the private storage object back so
// podcast clients and share pages can play the MP3 without signed URLs.
export const Route = createFileRoute("/api/public/brief-audio/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const rawId = params.id;
        // Support `<uuid>.mp3` for prettier URLs and podcast client compat.
        const id = rawId.replace(/\.mp3$/i, "");
        if (!/^[0-9a-f-]{36}$/i.test(id)) {
          return new Response("bad id", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: brief, error } = await supabaseAdmin
          .from("killzone_briefs")
          .select("audio_path, is_public")
          .eq("id", id)
          .maybeSingle();

        if (error || !brief || !brief.is_public || !brief.audio_path) {
          return new Response("not found", { status: 404 });
        }

        const dl = await supabaseAdmin.storage.from("briefs").download(brief.audio_path);
        if (dl.error || !dl.data) {
          return new Response("audio missing", { status: 404 });
        }

        const buf = await dl.data.arrayBuffer();
        return new Response(buf, {
          headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "public, max-age=3600, s-maxage=86400",
            "Content-Length": String(buf.byteLength),
            "Accept-Ranges": "bytes",
          },
        });
      },
    },
  },
});
