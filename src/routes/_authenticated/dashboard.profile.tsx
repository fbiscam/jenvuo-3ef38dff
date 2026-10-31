import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getMyMailAddress } from "@/lib/mail.functions";
import AvatarAdjuster from "@/components/AvatarAdjuster";
import { readCachedAvatar, writeCachedAvatar, AVATAR_TTL_SECONDS } from "@/lib/avatar-cache";

const PROFILE_CACHE_KEY = "jenvu:profile:basics";
import { useVerification } from "@/hooks/useVerification";
import { ArrowUpRight, Camera, Check, Copy, FileText, Loader2, LogOut, Mail, Moon, ShieldCheck, Sun, Trash2, UserRound, UserSquare2 } from "lucide-react";
import { readSiteTheme, saveSiteTheme, SITE_THEME_EVENT, type SiteTheme } from "@/lib/site-theme";
import { signOutAndRedirect } from "@/lib/cross-domain-session";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard/profile")({
  head: () => ({
    meta: [
      { title: "Personal settings — Jenvu" },
      { name: "description", content: "Update your Jenvu profile photo and name." },
      { property: "og:title", content: "Personal settings — Jenvu" },
      { property: "og:description", content: "Update your Jenvu profile photo and name." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Profile,
});

// Old links pointed at sections of one long Settings page; send them to the page that now holds that section.
const LEGACY_HASH_PAGES: Record<string, "/dashboard/security" | "/dashboard/settings"> = {
  security: "/dashboard/security",
  "change-email": "/dashboard/security",
  sessions: "/dashboard/security",
  preferences: "/dashboard/settings",
  danger: "/dashboard/settings",
};

function Profile() {
  const navigate = useNavigate();
  const { verified } = useVerification();
  const nameLocked = verified;
  const [userId, setUserId] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [, setMailAddress] = useState<string | null>(null);
  const [theme, setTheme] = useState<SiteTheme>("light");
  const [copied, setCopied] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const stored = readSiteTheme() ?? window.localStorage.getItem("jenvu:dash:theme");
    if (stored === "light" || stored === "dark") setTheme(stored);
    const onChange = (e: Event) => {
      const t = (e as CustomEvent<SiteTheme>).detail;
      if (t === "light" || t === "dark") setTheme(t);
    };
    window.addEventListener(SITE_THEME_EVENT, onChange);
    return () => window.removeEventListener(SITE_THEME_EVENT, onChange);
  }, []);

  const pickTheme = (t: SiteTheme) => { setTheme(t); saveSiteTheme(t); };

  const copyId = async () => {
    if (!userId) return;
    try {
      await navigator.clipboard.writeText(userId);
      setCopied(true);
      toast.success("Copied");
      setTimeout(() => setCopied(false), 1800);
    } catch { toast.error("Copy failed"); }
  };

  const logOut = async () => {
    setSigningOut(true);
    try { await signOutAndRedirect("/dashboard"); } catch { setSigningOut(false); }
  };

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    const page = LEGACY_HASH_PAGES[hash];
    if (page) { void navigate({ to: page, hash, replace: true }); return; }
    if (hash) setTimeout(() => document.getElementById(hash)?.scrollIntoView({ block: "start" }), 300);
  }, [navigate]);

  const refreshAvatarUrl = async (path: string | null) => {
    if (!path) { setAvatarUrl(null); writeCachedAvatar(null); return; }
    const { data } = await supabase.storage.from("avatars").createSignedUrl(path, AVATAR_TTL_SECONDS);
    setAvatarUrl(data?.signedUrl ?? null);
    writeCachedAvatar(data?.signedUrl ?? null);
  };


  // Paint the last known photo/name/email before the first frame, then refresh in the background.
  useLayoutEffect(() => {
    try {
      const c = JSON.parse(localStorage.getItem(PROFILE_CACHE_KEY) || "null");
      if (c?.email) setEmail(c.email);
      if (c?.fullName) setFullName(c.fullName);
      if (c?.avatarPath) setAvatarPath(c.avatarPath);
    } catch {}
    const cachedUrl = readCachedAvatar();
    if (cachedUrl) setAvatarUrl(cachedUrl);
  }, []);

  useEffect(() => {
    (async () => {
      // getSession reads the local session (no network), so email shows at once.
      const { data: s } = await supabase.auth.getSession();
      const u = s.session?.user;
      if (!u) return;
      setUserId(u.id);
      setEmail(u.email ?? "");
      const [{ data }] = await Promise.all([
        supabase.from("profiles").select("full_name, avatar_url").eq("id", u.id).maybeSingle(),
        getMyMailAddress().then((addr) => { if (addr?.address) setMailAddress(addr.address); }).catch(() => {}),
      ]);
      if (data?.full_name) setFullName(data.full_name);
      setAvatarPath(data?.avatar_url ?? null);
      try {
        localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({ email: u.email ?? "", fullName: data?.full_name ?? "", avatarPath: data?.avatar_url ?? null }));
      } catch {}
      if (data?.avatar_url) {
        if (!readCachedAvatar()) await refreshAvatarUrl(data.avatar_url);
      } else { setAvatarUrl(null); writeCachedAvatar(null); }
    })();
  }, []);

  const saveProfile = async () => {
    setSaving(true);
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    const { error } = await supabase.from("profiles").upsert({ id: user.user.id, full_name: fullName });
    setSaving(false);
    if (error) toast.error("Could not save"); else toast.success("Profile updated");
  };

  const onAvatarPick = () => fileInputRef.current?.click();

  const onAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !userId) return;
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image file"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Max 10MB"); return; }
    setPendingFile(file);
  };

  const uploadAdjustedBlob = async (blob: Blob) => {
    if (!userId) return;
    setUploadingAvatar(true);
    setPendingFile(null);
    try {
      const path = `${userId}/avatar-${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { upsert: true, contentType: "image/jpeg" });
      if (upErr) throw upErr;

      // Clean up previous avatar object
      if (avatarPath && avatarPath !== path) {
        await supabase.storage.from("avatars").remove([avatarPath]).catch(() => {});
      }

      const { error: profErr } = await supabase.from("profiles").upsert({ id: userId, avatar_url: path });
      if (profErr) throw profErr;
      setAvatarPath(path);
      await refreshAvatarUrl(path);
      toast.success("Profile photo updated");
    } catch (err: any) {
      toast.error(err?.message || "Upload failed");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const removeAvatar = async () => {
    if (!userId || !avatarPath) return;
    setUploadingAvatar(true);
    try {
      await supabase.storage.from("avatars").remove([avatarPath]).catch(() => {});
      await supabase.from("profiles").upsert({ id: userId, avatar_url: null });
      setAvatarPath(null);
      setAvatarUrl(null);
      toast.success("Profile photo removed");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const initial = (fullName || email || "?").trim().charAt(0).toUpperCase();
  const pill =
    "inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-gc-line bg-background px-4 text-[14px] text-gc-ink transition-colors hover:bg-gc-surface disabled:opacity-50";
  const row = "flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3";
  const rowLabel = "flex min-w-0 items-center gap-3 text-[15px] text-gc-ink";
  const themes: { key: SiteTheme; label: string; icon: typeof Sun }[] = [
    { key: "light", label: "Light", icon: Sun },
    { key: "dark", label: "Dark", icon: Moon },
  ];

  return (
    <div className="mx-auto w-full max-w-[880px] pb-10 pt-2 text-foreground">
      <h1 className="text-[28px] font-normal leading-tight tracking-tight text-gc-ink sm:text-[32px]">Personal</h1>

      {/* Photo, name and email */}
      <div className="mt-7 flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div
            role="button"
            tabIndex={0}
            onClick={() => { if (!uploadingAvatar) onAvatarPick(); }}
            onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !uploadingAvatar) { e.preventDefault(); onAvatarPick(); } }}
            aria-label={avatarPath ? "Change profile photo" : "Upload profile photo"}
            className="group relative h-11 w-11 shrink-0 cursor-pointer overflow-hidden rounded-full bg-gc-surface outline-none focus-visible:ring-2 focus-visible:ring-gc-ink-muted"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-[17px] font-medium text-gc-ink">{initial}</span>
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-gc-ink/55 text-background opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              <Camera className="h-4 w-4" />
            </span>
            {uploadingAvatar && (
              <span className="absolute inset-0 flex items-center justify-center bg-background/70">
                <Loader2 className="h-4 w-4 animate-spin text-gc-ink" />
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-medium text-gc-ink">{fullName || "Your name"}</p>
            <p className="truncate text-[14px] text-gc-ink-muted">{email}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {avatarPath && (
            <button type="button" onClick={removeAvatar} disabled={uploadingAvatar} className={pill}>
              <Trash2 className="h-4 w-4" /> Remove
            </button>
          )}
          <button type="button" onClick={onAvatarPick} disabled={uploadingAvatar} className={pill}>
            <Camera className="h-4 w-4" />
            {uploadingAvatar ? "Uploading…" : avatarPath ? "Change photo" : "Upload photo"}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onAvatarChange} />
        </div>
      </div>

      {/* Theme */}
      <div role="radiogroup" aria-label="Theme" className="mt-6 grid grid-cols-2 gap-2">
        {themes.map((t) => (
          <button
            key={t.key}
            type="button"
            role="radio"
            aria-checked={theme === t.key}
            onClick={() => pickTheme(t.key)}
            className={cn(
              "flex h-[70px] flex-col items-center justify-center gap-1.5 rounded-xl border text-[14px] transition-colors",
              theme === t.key ? "border-gc-line bg-gc-surface text-gc-ink" : "border-gc-line bg-background text-gc-ink-muted hover:text-gc-ink",
            )}
          >
            <t.icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6 border-t border-gc-line py-3">
        <div className={row}>
          <span className={rowLabel}><UserRound className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} /> Full name</span>
          <div className="ml-auto flex min-w-0 items-center gap-2">
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={nameLocked}
              placeholder="Your name"
              aria-label="Full name"
              className="h-9 w-[200px] max-w-full rounded-lg border border-gc-line bg-background px-3 text-[14px] text-gc-ink outline-none focus:border-gc-ink-muted disabled:cursor-not-allowed disabled:text-gc-ink-muted"
            />
            {!nameLocked && (
              <button type="button" onClick={saveProfile} disabled={saving} className={pill}>{saving ? "Saving…" : "Save"}</button>
            )}
          </div>
        </div>
        {nameLocked && (
          <p className="-mt-1 pb-2 pl-[30px] text-[12px] text-gc-ink-muted">Locked — your name is verified against your identity documents. Contact support to change it.</p>
        )}
        <div className={row}>
          <span className={rowLabel}><Mail className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} /> Email</span>
          <span className="ml-auto truncate text-[14px] text-gc-ink-muted">{email || "—"}</span>
        </div>
        <div className={row}>
          <span className={rowLabel}><ShieldCheck className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} /> Password and security</span>
          <Link to="/dashboard/security" className={cn(pill, "ml-auto")}>Manage <ArrowUpRight className="h-3.5 w-3.5" /></Link>
        </div>
        <div className={row}>
          <span className={rowLabel}><FileText className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} /> Terms and policies</span>
          <Link to="/terms" className={cn(pill, "ml-auto")}>View terms <ArrowUpRight className="h-3.5 w-3.5" /></Link>
        </div>
      </div>

      <div className="border-t border-gc-line py-3">
        <div className={row}>
          <span className={rowLabel}><UserSquare2 className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} /> User ID</span>
          <button type="button" onClick={() => void copyId()} disabled={!userId} className={cn(pill, "ml-auto")}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Copy ID
          </button>
        </div>
      </div>

      <div className="flex justify-end border-t border-gc-line py-6">
        <button type="button" onClick={() => void logOut()} disabled={signingOut} className={pill}>
          <LogOut className="h-4 w-4" /> {signingOut ? "Logging out…" : "Log out"}
        </button>
      </div>

      {pendingFile && (
        <AvatarAdjuster
          file={pendingFile}
          onCancel={() => setPendingFile(null)}
          onDone={(blob) => { void uploadAdjustedBlob(blob); }}
        />
      )}
    </div>
  );
}
