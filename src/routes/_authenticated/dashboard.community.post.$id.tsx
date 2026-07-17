import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { getCommunityPost, createCommunityPost, type CommunityPostRow } from "@/lib/community.functions";
import { PostCard } from "./dashboard.community";
import { ArrowLeft, Loader2, ImagePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard/community/post/$id")({
  head: () => ({ meta: [{ title: "Post — Jenvu Community" }] }),
  component: PostDetail,
});

function PostDetail() {
  const { id } = Route.useParams();
  const load = useServerFn(getCommunityPost);
  const create = useServerFn(createCommunityPost);
  const [post, setPost] = useState<CommunityPostRow | null>(null);
  const [replies, setReplies] = useState<CommunityPostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const refresh = async () => {
    const r = await load({ data: { id } });
    setPost(r.post); setReplies(r.replies);
  };

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      const r = await load({ data: { id } });
      if (cancel) return;
      setPost(r.post); setReplies(r.replies); setLoading(false);
    })();
    return () => { cancel = true; };
  }, [id]);

  const submit = async () => {
    if (!reply.trim()) return;
    setBusy(true);
    try {
      await create({ data: { body: reply, parent_post_id: id } });
      setReply("");
      await refresh();
      toast.success("Reply sent");
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setBusy(false); }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-white"><Loader2 className="h-6 w-6 animate-spin text-zinc-400" /></div>;
  if (!post) return <div className="min-h-screen bg-white p-10 text-center text-zinc-500">Post not found.</div>;

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-2xl">
        <header className="sticky top-0 z-10 flex items-center gap-4 border-b border-zinc-100 bg-white/90 px-4 py-3 backdrop-blur">
          <button onClick={() => navigate({ to: "/dashboard/community" })} className="rounded-full p-2 hover:bg-zinc-100">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="text-base font-semibold text-zinc-900">Post</div>
        </header>

        <PostCard post={post} onChange={setPost} />

        <div className="border-y border-zinc-100 px-4 py-3">
          <textarea value={reply} onChange={(e) => setReply(e.target.value.slice(0, 500))}
            placeholder="Post your reply…" rows={2}
            className="w-full resize-none border-0 text-[15px] outline-none placeholder:text-zinc-400" />
          <div className="mt-2 flex items-center justify-between">
            <span className={cn("text-xs", reply.length > 480 ? "text-red-500" : "text-zinc-400")}>{reply.length}/500</span>
            <button onClick={submit} disabled={busy || !reply.trim()}
              className="rounded-full bg-zinc-900 px-5 py-1.5 text-sm font-medium text-white disabled:opacity-40">
              {busy ? "Posting…" : "Reply"}
            </button>
          </div>
        </div>

        {replies.length === 0 ? (
          <div className="p-10 text-center text-sm text-zinc-400">Be the first to reply.</div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {replies.map((r) => (
              <PostCard key={r.id} post={r} onChange={(np) => setReplies((prev) => prev.map((x) => x.id === np.id ? np : x))} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
