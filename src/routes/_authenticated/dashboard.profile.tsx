import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getMyMailAddress } from "@/lib/mail.functions";
import AvatarAdjuster from "@/components/AvatarAdjuster";
import { writeCachedAvatar, AVATAR_TTL_SECONDS } from "@/lib/avatar-cache";
import { useVerification } from "@/hooks/useVerification";
import { Camera, Loader2, MonitorSmartphone, ShieldAlert, ShieldCheck, SlidersHorizontal, Trash2, Upload, UserRound } from "lucide-react";
import { SettingsCard, settingsBtn, settingsBtnPrimary, settingsField } from "@/components/settings/SettingsCard";
import { DangerZoneSettings, SecuritySettings } from "@/components/settings/SecuritySettings";
import { PreferencesSettings } from "@/components/settings/PreferencesSettings";
import { ActiveSessionsSettings } from "@/components/settings/ActiveSessionsSettings";

export const Route = createFileRoute("/_authenticated/dashboard/profile")({
  head: () => ({
    meta: [
      { title: "Settings — Jenvu" },
      { name: "description", content: "Manage your Jenvu profile, security, preferences and active sessions." },
      { property: "og:title", content: "Settings — Jenvu" },
      { property: "og:description", content: "Manage your Jenvu profile, security, preferences and active sessions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Profile,
});

const SECTIONS = [
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "security", label: "Security", icon: ShieldCheck },
  { id: "preferences", label: "Preferences", icon: SlidersHorizontal },
  { id: "sessions", label: "Active sessions", icon: MonitorSmartphone },
  { id: "danger", label: "Danger zone", icon: ShieldAlert },
] as const;

function Profile() {
  const { verified } = useVerification();
  const nameLocked = verified;
  const [active, setActive] = useState<string>("profile");
  const [userId, setUserId] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [mailAddress, setMailAddress] = useState<string | null>(null);

  const refreshAvatarUrl = async (path: string | null) => {
    if (!path) { setAvatarUrl(null); writeCachedAvatar(null); return; }
    const { data } = await supabase.storage.from("avatars").createSignedUrl(path, AVATAR_TTL_SECONDS);
    setAvatarUrl(data?.signedUrl ?? null);
    writeCachedAvatar(data?.signedUrl ?? null);
  };


  useEffect(() => {
    (async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      setUserId(user.user.id);
      setEmail(user.user.email ?? "");
      const { data } = await supabase.from("profiles").select("full_name, avatar_url").eq("id", user.user.id).maybeSingle();
      if (data?.full_name) setFullName(data.full_name);
      if (data?.avatar_url) {
        setAvatarPath(data.avatar_url);
        await refreshAvatarUrl(data.avatar_url);
      }
      try {
        const addr = await getMyMailAddress();
        if (addr?.address) setMailAddress(addr.address);
      } catch {}
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

  return (
    <div className="mx-auto w-full max-w-[1080px] pb-10 text-gc-ink">
      <header className="jenvu-rise pt-2">
        <h1 className="text-[32px] font-medium leading-tight tracking-[-0.3px] sm:text-[36px]">Settings</h1>
        <p className="mt-2 max-w-[620px] text-[15px] leading-[1.6] text-gc-ink-muted">Manage your profile, security, preferences and where you're signed in.</p>
      </header>

      <div className="mt-6 grid gap-8 lg:grid-cols-[200px_minmax(0,1fr)]">
        <nav aria-label="Settings sections" className="lg:sticky lg:top-24 lg:self-start">
          <ul className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
            {SECTIONS.map((s) => (
              <li key={s.id} className="shrink-0">
                <a
                  href={`#${s.id}`}
                  onClick={(e) => { e.preventDefault(); setActive(s.id); document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
                  aria-current={active === s.id ? "true" : undefined}
                  className={`flex h-10 items-center gap-3 rounded-full px-4 text-[14px] font-medium transition-colors ${active === s.id ? "bg-gc-blue-soft text-gc-blue-deep" : "text-gc-ink-muted hover:bg-gc-surface hover:text-gc-ink"}`}
                >
                  <s.icon className="h-4 w-4 shrink-0" />
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 space-y-6">
          <SettingsCard id="profile" title="Profile" description="Your photo and name show on your dashboard, in the top menu and in messages you send to Jenvu support.">
            <div className="flex flex-col gap-5 px-6 py-5 sm:flex-row sm:items-center sm:px-7">
              <div
                role="button"
                tabIndex={0}
                onClick={() => { if (!uploadingAvatar) onAvatarPick(); }}
                onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !uploadingAvatar) { e.preventDefault(); onAvatarPick(); } }}
                aria-label={avatarPath ? "Change profile photo" : "Upload profile photo"}
                className="group relative h-20 w-20 shrink-0 cursor-pointer overflow-hidden rounded-full bg-gc-blue-soft outline-none focus-visible:ring-2 focus-visible:ring-gc-blue-deep"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-[30px] font-medium text-gc-blue-deep">{initial}</span>
                )}
                <span className="absolute inset-0 flex items-center justify-center bg-gc-ink/55 text-background opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  <Camera className="h-5 w-5" />
                </span>
                {uploadingAvatar && (
                  <span className="absolute inset-0 flex items-center justify-center bg-background/70">
                    <Loader2 className="h-6 w-6 animate-spin text-gc-blue-deep" />
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[18px] font-medium leading-tight">{fullName || "Your name"}</p>
                <p className="truncate text-[14px] text-gc-ink-muted">{email}</p>
                <p className="mt-1 text-[12px] text-gc-ink-muted">JPG, PNG or WebP, up to 10MB. You can crop and zoom before saving.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={onAvatarPick} disabled={uploadingAvatar} className={settingsBtnPrimary}>
                  <Upload className="h-4 w-4" />
                  {uploadingAvatar ? "Uploading…" : avatarPath ? "Change photo" : "Upload photo"}
                </button>
                {avatarPath && (
                  <button type="button" onClick={removeAvatar} disabled={uploadingAvatar} className={settingsBtn}>
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </button>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onAvatarChange} />
              </div>
            </div>

            <div className="grid gap-5 px-6 py-5 sm:grid-cols-2 sm:px-7">
              <label className="block text-[13px] font-medium text-gc-ink-muted">
                Full name
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={nameLocked}
                  className={`mt-1.5 ${settingsField} ${nameLocked ? "cursor-not-allowed bg-gc-surface text-gc-ink-muted" : ""}`}
                  placeholder="Your name"
                />
                {nameLocked && (
                  <span className="mt-1.5 block text-[12px] font-normal text-gc-ink-muted">
                    Locked — your name is verified against your identity documents. Contact support to change it.
                  </span>
                )}
              </label>
              <label className="block text-[13px] font-medium text-gc-ink-muted">
                Email
                <input value={email} disabled className={`mt-1.5 ${settingsField} cursor-not-allowed bg-gc-surface text-gc-ink-muted`} />
              </label>
            </div>
            <div className="flex justify-end px-6 py-4 sm:px-7">
              <button onClick={saveProfile} disabled={saving || nameLocked} className={settingsBtnPrimary}>
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </SettingsCard>

          <SecuritySettings email={email} />
          <PreferencesSettings />
          <ActiveSessionsSettings />
          <DangerZoneSettings />
        </div>
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
