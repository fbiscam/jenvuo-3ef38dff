import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import {
  listCommunityFeed,
  createCommunityPost,
  toggleLike,
  toggleRepost,
  toggleBookmark,
  recordImpression,
  getMyCommunityProfile,
  claimCommunityHandle,
  type CommunityPostRow,
} from "@/lib/community.functions";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { supabase } from "@/integrations/supabase/client";
import {
  Heart, MessageCircle, Repeat2, Bookmark, Share2, ImagePlus, Loader2, Search, Users, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/community")({
  head: () => ({
    meta: [
      { title: "Community — Jenvu" },
      { name: "description", content: "Share trades, ideas, and market takes with the Jenvu community." },
    ],
  }),
  component: CommunityFeedPage,
});

function CommunityFeedPage() {
  const load = useServerFn(listCommunityFeed);
  const me = useServerFn(getMyCommunityProfile);
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<CommunityPostRow[]>([]);
  const [tab, setTab] = useState<"for_you" | "following">("for_you");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      const [p, rows] = await Promise.all([me(), load({ data: { mode: tab } })]);
      if (cancel) return;
      setProfile(p);
      setPosts(rows);
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [tab]);

  useEffect(() => {
    const ch = supabase
      .channel("community-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "community_posts" }, () => {
        load({ data: { mode: tab } }).then(setPosts).catch(() => {});
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [tab]);

  if (!profile) return <ClaimHandleGate onClaimed={async () => setProfile(await me())} />;

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-6 md:grid-cols-[1fr_280px]">
        <main>
          <header className="sticky top-0 z-10 -mx-4 mb-4 border-b border-zinc-100 bg-white/90 px-4 py-3 backdrop-blur">
            <h1 className="mb-2 text-xl font-semibold tracking-tight text-zinc-900">Community</h1>
            <div className="flex gap-1 border-b border-zinc-100">
              {(["for_you", "following"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "-mb-px px-4 py-2 text-sm font-medium",
                    tab === t
                      ? "border-b-2 border-blue-600 text-zinc-900"
                      : "text-zinc-500 hover:text-zinc-800",
                  )}
                >
                  {t === "for_you" ? "For you" : "Following"}
                </button>
              ))}
            </div>
          </header>

          <Composer onPosted={async () => setPosts(await load({ data: { mode: tab } }))} />

          {loading ? (
            <div className="flex items-center justify-center py-10 text-zinc-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : posts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 p-10 text-center text-sm text-zinc-500">
              {tab === "following"
                ? "You're not following anyone yet. Explore For you and follow some traders."
                : "No posts yet. Be the first."}
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {posts.map((p) => (
                <PostCard key={p.id} post={p} onChange={(np) =>
                  setPosts((prev) => prev.map((x) => (x.id === np.id ? np : x)))
                } />
              ))}
            </div>
          )}
        </main>
        <aside className="hidden md:block">
          <RightRail profile={profile} />
        </aside>
      </div>
    </div>
  );
}

// ---------- Claim handle ----------
function ClaimHandleGate({ onClaimed }: { onClaimed: () => void }) {
  const claim = useServerFn(claimCommunityHandle);
  const [handle, setHandle] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      await claim({ data: { handle, display_name: name } });
      toast.success(`Claimed @${handle}`);
      onClaimed();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally { setBusy(false); }
  };
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="mb-2 flex items-center gap-2 text-blue-600">
          <Sparkles className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase tracking-widest">Jenvu Community</span>
        </div>
        <h1 className="mb-2 text-3xl font-semibold tracking-tight text-zinc-900">Claim your handle</h1>
        <p className="mb-6 text-sm text-zinc-500">Pick a unique @handle. This is permanent — you cannot change it later.</p>
        <label className="mb-1 block text-xs font-medium text-zinc-600">Handle</label>
        <div className="mb-4 flex overflow-hidden rounded-xl border border-zinc-200">
          <span className="flex items-center bg-zinc-50 px-3 text-sm text-zinc-500">@</span>
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
            placeholder="yourname"
            className="flex-1 border-0 px-3 py-2 text-sm outline-none"
            maxLength={20}
          />
        </div>
        <label className="mb-1 block text-xs font-medium text-zinc-600">Display name (optional)</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="mb-6 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none"
          maxLength={60}
        />
        <button
          onClick={submit}
          disabled={busy || handle.length < 3}
          className="w-full rounded-full bg-zinc-900 py-3 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? "Claiming…" : "Claim & enter community"}
        </button>
      </div>
    </div>
  );
}

// ---------- Composer ----------
function Composer({ onPosted, parentId }: { onPosted: () => void; parentId?: string }) {
  const create = useServerFn(createCommunityPost);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const submit = async () => {
    if (!body.trim() && files.length === 0) return;
    setBusy(true);
    try {
      const media: string[] = [];
      for (const f of files) {
        const { data: sess } = await supabase.auth.getUser();
        const uid = sess.user?.id;
        if (!uid) break;
        const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${f.name.replace(/[^a-zA-Z0-9._-]/g, "")}`;
        const { error } = await supabase.storage.from("community-media").upload(path, f, { contentType: f.type });
        if (!error) media.push(path);
      }
      await create({ data: { body, media_urls: media, parent_post_id: parentId ?? null } });
      setBody(""); setFiles([]);
      onPosted();
      toast.success(parentId ? "Reply sent" : "Posted");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="mb-4 rounded-2xl border border-zinc-100 bg-white p-4">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value.slice(0, 500))}
        placeholder={parentId ? "Post your reply…" : "What's the setup?"}
        rows={parentId ? 2 : 3}
        className="w-full resize-none border-0 text-[15px] leading-relaxed text-zinc-900 outline-none placeholder:text-zinc-400"
      />
      {files.length > 0 && (
        <div className="mt-2 flex gap-2">
          {files.map((f, i) => (
            <div key={i} className="relative">
              <img src={URL.createObjectURL(f)} alt="" className="h-16 w-16 rounded-lg object-cover" />
              <button onClick={() => setFiles(files.filter((_, j) => j !== i))}
                className="absolute -right-1 -top-1 rounded-full bg-zinc-900 px-1 text-[10px] text-white">×</button>
            </div>
          ))}
        </div>
      )}
      <div className="mt-3 flex items-center justify-between border-t border-zinc-50 pt-3">
        <div className="flex items-center gap-2">
          <input
            ref={fileRef} type="file" accept="image/*" multiple hidden
            onChange={(e) => setFiles([...(e.target.files || [])].slice(0, 4))}
          />
          <button onClick={() => fileRef.current?.click()} className="rounded-full p-2 text-blue-600 hover:bg-blue-50">
            <ImagePlus className="h-4 w-4" />
          </button>
          <span className={cn("text-xs", body.length > 480 ? "text-red-500" : "text-zinc-400")}>{body.length}/500</span>
        </div>
        <button
          onClick={submit}
          disabled={busy || (!body.trim() && files.length === 0)}
          className="rounded-full bg-zinc-900 px-5 py-1.5 text-sm font-medium text-white disabled:opacity-40"
        >
          {busy ? "Posting…" : parentId ? "Reply" : "Post"}
        </button>
      </div>
    </div>
  );
}

// ---------- Post card ----------
export function PostCard({ post, onChange, hideActions }: {
  post: CommunityPostRow;
  onChange?: (p: CommunityPostRow) => void;
  hideActions?: boolean;
}) {
  const like = useServerFn(toggleLike);
  const rp = useServerFn(toggleRepost);
  const bm = useServerFn(toggleBookmark);
  const imp = useServerFn(recordImpression);
  const cardRef = useRef<HTMLDivElement>(null);
  const seen = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!cardRef.current || seen.current) return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting && !seen.current) {
          seen.current = true;
          imp({ data: { post_id: post.id } }).catch(() => {});
          io.disconnect();
        }
      }
    }, { threshold: 0.6 });
    io.observe(cardRef.current);
    return () => io.disconnect();
  }, [post.id]);

  const doLike = async () => {
    const wasLiked = post.liked_by_me;
    onChange?.({ ...post, liked_by_me: !wasLiked, like_count: post.like_count + (wasLiked ? -1 : 1) });
    try { await like({ data: { post_id: post.id, liked: wasLiked } }); } catch { onChange?.(post); }
  };
  const doRepost = async () => {
    const on = post.reposted_by_me;
    onChange?.({ ...post, reposted_by_me: !on, repost_count: post.repost_count + (on ? -1 : 1) });
    try { await rp({ data: { post_id: post.id, on } }); } catch { onChange?.(post); }
  };
  const doBookmark = async () => {
    const on = post.bookmarked_by_me;
    onChange?.({ ...post, bookmarked_by_me: !on, bookmark_count: post.bookmark_count + (on ? -1 : 1) });
    try { await bm({ data: { post_id: post.id, on } }); } catch { onChange?.(post); }
  };

  const openPost = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button, a, img")) return;
    navigate({ to: "/dashboard/community/post/$id", params: { id: post.id } });
  };

  return (
    <div ref={cardRef} onClick={openPost} className="cursor-pointer px-4 py-4 transition-colors hover:bg-zinc-50/40">
      <div className="flex gap-3">
        <Link to="/dashboard/community/u/$handle" params={{ handle: post.author_handle ?? "" }}>
          {post.author_avatar ? (
            <img src={post.author_avatar} className="h-10 w-10 rounded-full object-cover" alt="" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-sm font-medium text-zinc-500">
              {(post.author_name ?? post.author_handle ?? "?").slice(0, 1).toUpperCase()}
            </div>
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-sm">
            <Link to="/dashboard/community/u/$handle" params={{ handle: post.author_handle ?? "" }}
              className="font-semibold text-zinc-900 hover:underline">
              {post.author_name ?? post.author_handle}
            </Link>
            <VerifiedBadge tier={post.author_tier ?? undefined} size={14} />
            <span className="text-zinc-400">@{post.author_handle}</span>
            <span className="text-zinc-300">·</span>
            <span className="text-zinc-400">{timeAgo(post.created_at)}</span>
          </div>
          <div className="mt-1 whitespace-pre-wrap text-[15px] leading-relaxed text-zinc-800">
            {renderBody(post.body)}
          </div>
          {post.media_urls.length > 0 && (
            <div className={cn("mt-2 grid gap-1 overflow-hidden rounded-2xl border border-zinc-100",
              post.media_urls.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
              {post.media_urls.map((u, i) => (
                <img key={i} src={u} alt="" className="h-48 w-full object-cover" />
              ))}
            </div>
          )}
          {!hideActions && (
            <div className="mt-2 flex max-w-md items-center justify-between text-zinc-500">
              <ActionBtn icon={MessageCircle} count={post.reply_count} />
              <ActionBtn icon={Repeat2} count={post.repost_count} active={post.reposted_by_me}
                onClick={doRepost} activeClass="text-emerald-600" />
              <ActionBtn icon={Heart} count={post.like_count} active={post.liked_by_me}
                onClick={doLike} activeClass="text-rose-600" />
              <ActionBtn icon={Bookmark} count={post.bookmark_count} active={post.bookmarked_by_me}
                onClick={doBookmark} activeClass="text-blue-600" />
              <ActionBtn icon={Share2} count={post.view_count} label />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionBtn({ icon: Icon, count, active, onClick, activeClass, label }: any) {
  return (
    <button onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      className={cn("flex items-center gap-1.5 rounded-full px-2 py-1 text-xs hover:bg-zinc-100",
        active ? activeClass : "text-zinc-500")}>
      <Icon className={cn("h-4 w-4", active && "fill-current")} />
      {count > 0 && <span>{formatCount(count)}</span>}
    </button>
  );
}

function formatCount(n: number) {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return (n / 1000).toFixed(n < 10_000 ? 1 : 0) + "K";
  return (n / 1_000_000).toFixed(1) + "M";
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return new Date(iso).toLocaleDateString();
}

function renderBody(body: string) {
  const parts = body.split(/(\s+)/);
  return parts.map((tok, i) => {
    if (/^\$[A-Za-z]{1,10}$/.test(tok))
      return <span key={i} className="font-medium text-blue-600">{tok}</span>;
    if (/^@[a-z0-9_]{3,20}$/i.test(tok))
      return <Link key={i} to="/dashboard/community/u/$handle" params={{ handle: tok.slice(1).toLowerCase() }}
        className="text-blue-600 hover:underline">{tok}</Link>;
    if (/^https?:\/\//i.test(tok))
      return <a key={i} href={tok} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{tok}</a>;
    return <span key={i}>{tok}</span>;
  });
}

function RightRail({ profile }: { profile: any }) {
  return (
    <div className="sticky top-6 space-y-4">
      <Link to="/dashboard/community/u/$handle" params={{ handle: profile.handle }}
        className="block rounded-2xl border border-zinc-100 bg-white p-4 transition hover:border-zinc-200">
        <div className="text-xs text-zinc-400">Signed in as</div>
        <div className="mt-1 font-semibold text-zinc-900">@{profile.handle}</div>
      </Link>
      <div className="rounded-2xl border border-zinc-100 bg-white p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-800">
          <Users className="h-4 w-4" /> About Community
        </div>
        <p className="text-xs leading-relaxed text-zinc-500">
          Share setups, backtests, and market ideas. Use $TAGS to tag pairs. Be professional — reports and blocks are enforced.
        </p>
      </div>
    </div>
  );
}
