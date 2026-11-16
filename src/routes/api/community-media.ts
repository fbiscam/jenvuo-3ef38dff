// Serves community profile photos and post media. Every load re-checks that the viewer
// and owner haven't blocked each other (and that the post still exists), so a block
// takes effect immediately instead of after a storage link expires.
import { createFileRoute } from "@tanstack/react-router";

const notFound = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });

export const Route = createFileRoute("/api/community-media")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { readCommunityMediaToken } = await import("@/lib/community-media-token.server");
        const t = new URL(request.url).searchParams.get("t") ?? "";
        const tok = await readCommunityMediaToken(t).catch(() => null);
        if (!tok) return notFound();

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        if (tok.v !== tok.o) {
          const { data: blocks, error } = await supabaseAdmin
            .from("community_blocks")
            .select("blocker_id")
            .or(`and(blocker_id.eq.${tok.v},blocked_id.eq.${tok.o}),and(blocker_id.eq.${tok.o},blocked_id.eq.${tok.v})`)
            .limit(1);
          if (error || (blocks && blocks.length)) return notFound();
        }
        if (tok.b === "community-media") {
          const { data: post } = await supabaseAdmin
            .from("community_posts")
            .select("id")
            .eq("author_id", tok.o)
            .is("deleted_at", null)
            .contains("media_urls", [tok.p])
            .limit(1)
            .maybeSingle();
          if (!post) return notFound();
        } else {
          const { data: prof } = await supabaseAdmin.from("profiles").select("avatar_url").eq("id", tok.o).maybeSingle();
          if (prof?.avatar_url !== tok.p) return notFound();
        }

        const { data: file, error } = await supabaseAdmin.storage.from(tok.b).download(tok.p);
        if (error || !file) return notFound();
        return new Response(file.stream(), {
          status: 200,
          headers: {
            "Content-Type": file.type || "application/octet-stream",
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
          },
        });
      },
    },
  },
});
