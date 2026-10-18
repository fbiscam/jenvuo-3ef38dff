import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getMyMailAddress } from "@/lib/mail.functions";
import AvatarAdjuster from "@/components/AvatarAdjuster";
import { writeCachedAvatar, AVATAR_TTL_SECONDS } from "@/lib/avatar-cache";
import { useVerification } from "@/hooks/useVerification";


export const Route = createFileRoute("/_authenticated/dashboard/profile")({
  component: Profile,
});


function Profile() {
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
  const field = "mt-1.5 block h-11 w-full rounded-xl border border-gc-line bg-background px-4 text-[15px] text-gc-ink outline-none focus:border-gc-blue-deep focus:ring-2 focus:ring-gc-blue-soft";

  return (
    <div className="mx-auto w-full max-w-[880px] space-y-6 pb-10 text-gc-ink">
      <header className="jenvu-rise pt-2">
        <span className="inline-flex rounded-full bg-gc-blue-soft px-3 py-1 text-[13px] font-medium text-gc-blue-deep">Settings</span>
        <h1 className="mt-4 text-[32px] font-medium leading-tight tracking-[-0.3px] sm:text-[40px]">{"\n"}</h1>
        <p className="mt-2 max-w-[620px] text-[16px] leading-[1.6] text-gc-ink-muted">Your photo and name show on your dashboard, in the top menu and in messages you send to Jenvu support.</p>
      </header>

      <section className="jenvu-rise [animation-delay:60ms] rounded-[28px] border border-gc-line bg-background p-6 sm:p-8">
        <h2 className="text-[20px] font-medium">Profile photo</h2>
        <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-gc-blue-soft ring-4 ring-gc-surface">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[32px] font-medium text-gc-blue-deep">{initial}</div>
            )}
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onAvatarPick}
                disabled={uploadingAvatar}
                className="inline-flex h-10 items-center rounded-full bg-gc-blue px-5 text-[14px] font-medium text-gc-on-blue hover:bg-gc-blue-hover disabled:opacity-50"
              >
                {uploadingAvatar ? "Uploading…" : avatarPath ? "Change photo" : "Upload photo"}
              </button>
              {avatarPath && (
                <button
                  type="button"
                  onClick={removeAvatar}
                  disabled={uploadingAvatar}
                  className="inline-flex h-10 items-center rounded-full border border-gc-line px-5 text-[14px] font-medium text-gc-blue-deep hover:bg-gc-surface disabled:opacity-50"
                >
                  Remove
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onAvatarChange} />
            </div>
            <p className="text-[13px] text-gc-ink-muted">JPG, PNG or WebP. Max 10MB. You can crop, zoom and reposition after selecting.</p>
          </div>
        </div>
      </section>

      <section className="jenvu-rise [animation-delay:120ms] rounded-[28px] border border-gc-line bg-background p-6 sm:p-8">
        <h2 className="text-[20px] font-medium">Account details</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label className="block text-[13px] font-medium text-gc-ink-muted">
            Full name
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={nameLocked}
              className={`${field} ${nameLocked ? "cursor-not-allowed bg-gc-surface text-gc-ink-muted" : ""}`}
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
            <input value={email} disabled className={`${field} cursor-not-allowed bg-gc-surface text-gc-ink-muted`} />
          </label>
        </div>
        <div className="mt-6 flex justify-end border-t border-gc-line pt-5">
          <button
            onClick={saveProfile}
            disabled={saving || nameLocked}
            className="inline-flex h-11 items-center rounded-full bg-gc-blue px-6 text-[14px] font-medium text-gc-on-blue hover:bg-gc-blue-hover disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </section>

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
