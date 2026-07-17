import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import {
  getCommunityProfile,
  listCommunityFeed,
  toggleFollow,
  updateCommunityProfile,
  type CommunityProfileRow,
  type CommunityPostRow,
} from "@/lib/community.functions";
import { PostCard } from "./dashboard.community";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { ArrowLeft, Loader2, Pencil, MapPin, Link2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard/community/u/$handle")({
  head: ({ params }) => ({
    meta: [
      { title: `@${params.handle} — Jenvu Community` },
      { name: "description", content: `Posts by @${params.handle} on the Jenvu community.` },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { handle } = Route.useParams();
  const getProfile = useServerFn(getCommunityProfile);
  const listFeed = useServerFn(listCommunityFeed);
  const follow = useServerFn(toggleFollow);
  const [profile, setProfile] = useState<CommunityProfileRow | null>(null);
  const [posts, setPosts] = useState<CommunityPostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      const p = await getProfile({ data: { handle } });
      if (cancel) return;
      setProfile(p);
      if (p) setPosts(await listFeed({ data: { author_id: p.user_id, limit: 50 } }));
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [handle]);

  const doFollow = async () => {
    if (!profile) return;
    const on = profile.is_following;
    setProfile({ ...profile, is_following: !on, followers: profile.followers + (on ? -1 : 1) });
    try { await follow({ data: { followee_id: profile.user_id, on } }); }
    catch { setProfile(profile); }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-white"><Loader2 className="h-6 w-6 animate-spin text-zinc-400" /></div>;
  if (!profile) return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="text-lg font-semibold text-zinc-900">Handle not found</div>
        <Link to="/dashboard/community" className="mt-2 inline-block text-sm text-blue-600">Back to community</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-2xl">
        <header className="sticky top-0 z-10 flex items-center gap-4 border-b border-zinc-100 bg-white/90 px-4 py-3 backdrop-blur">
          <button onClick={() => navigate({ to: "/dashboard/community" })} className="rounded-full p-2 hover:bg-zinc-100">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 truncate text-base font-semibold text-zinc-900">
              {profile.display_name ?? profile.handle}
              <VerifiedBadge tier={profile.tier ?? undefined} size={14} />
            </div>
            <div className="text-xs text-zinc-400">{posts.length} posts</div>
          </div>
        </header>

        <div className="h-32 bg-gradient-to-br from-blue-50 via-white to-amber-50" />
        <div className="relative -mt-10 px-4">
          <div className="flex items-end justify-between">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-20 w-20 rounded-full border-4 border-white object-cover" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-zinc-100 text-2xl font-semibold text-zinc-500">
                {(profile.display_name ?? profile.handle).slice(0, 1).toUpperCase()}
              </div>
            )}
            {profile.is_self ? (
              <button onClick={() => setEditing(true)} className="mb-2 rounded-full border border-zinc-200 px-4 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50">
                <Pencil className="mr-1 inline h-3.5 w-3.5" /> Edit profile
              </button>
            ) : (
              <button onClick={doFollow}
                className={cn("mb-2 rounded-full px-5 py-1.5 text-sm font-medium",
                  profile.is_following
                    ? "border border-zinc-200 text-zinc-800 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100"
                    : "bg-zinc-900 text-white")}>
                {profile.is_following ? "Following" : "Follow"}
              </button>
            )}
          </div>
          <div className="mt-3">
            <div className="flex items-center gap-1 text-xl font-semibold tracking-tight text-zinc-900">
              {profile.display_name ?? profile.handle}
              <VerifiedBadge tier={profile.tier ?? undefined} size={16} />
            </div>
            <div className="text-sm text-zinc-400">@{profile.handle}</div>
            {profile.bio && <p className="mt-2 text-[15px] leading-relaxed text-zinc-800">{profile.bio}</p>}
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-zinc-500">
              {profile.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{profile.location}</span>}
              {profile.website && <a href={profile.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline"><Link2 className="h-3.5 w-3.5" />{profile.website.replace(/^https?:\/\//, "")}</a>}
            </div>
            <div className="mt-3 flex gap-5 text-sm">
              <span><span className="font-semibold text-zinc-900">{profile.following}</span> <span className="text-zinc-500">Following</span></span>
              <span><span className="font-semibold text-zinc-900">{profile.followers}</span> <span className="text-zinc-500">Followers</span></span>
            </div>
          </div>
        </div>

        <div className="mt-4 border-b border-zinc-100 px-4 text-sm font-medium text-zinc-900">
          <span className="inline-block border-b-2 border-blue-600 pb-2">Posts</span>
        </div>

        {editing && <EditProfileModal profile={profile} onClose={() => setEditing(false)} onSaved={(p) => { setProfile(p); setEditing(false); }} />}

        {posts.length === 0 ? (
          <div className="p-10 text-center text-sm text-zinc-400">No posts yet.</div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {posts.map((p) => (
              <PostCard key={p.id} post={p} onChange={(np) => setPosts((prev) => prev.map((x) => x.id === np.id ? np : x))} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EditProfileModal({ profile, onClose, onSaved }: {
  profile: CommunityProfileRow;
  onClose: () => void;
  onSaved: (p: CommunityProfileRow) => void;
}) {
  const update = useServerFn(updateCommunityProfile);
  const [name, setName] = useState(profile.display_name ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [loc, setLoc] = useState(profile.location ?? "");
  const [site, setSite] = useState(profile.website ?? "");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      await update({ data: { display_name: name, bio, location: loc, website: site } });
      onSaved({ ...profile, display_name: name, bio, location: loc, website: site });
      toast.success("Saved");
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 text-lg font-semibold text-zinc-900">Edit profile</div>
        <div className="space-y-3">
          <Field label="Display name"><input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none" /></Field>
          <Field label="Bio"><textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={160} rows={3} className="w-full resize-none rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none" /></Field>
          <Field label="Location"><input value={loc} onChange={(e) => setLoc(e.target.value)} maxLength={60} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none" /></Field>
          <Field label="Website"><input value={site} onChange={(e) => setSite(e.target.value)} maxLength={200} placeholder="https://…" className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none" /></Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100">Cancel</button>
          <button onClick={save} disabled={busy} className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-50">{busy ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-medium text-zinc-600">{label}</div>
      {children}
    </label>
  );
}
