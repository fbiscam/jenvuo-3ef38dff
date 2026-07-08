import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TwoFactorSettings } from "@/components/TwoFactorSettings";
import { deleteMyAccount } from "@/lib/delete-account.functions";
import { requestEmailChange } from "@/lib/email-change.functions";

export const Route = createFileRoute("/_authenticated/dashboard/profile")({
  component: Profile,
});


function Profile() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [changingEmail, setChangingEmail] = useState(false);
  const [emailPending, setEmailPending] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);


  useEffect(() => {
    (async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      setEmail(user.user.email ?? "");
      const { data } = await supabase.from("profiles").select("full_name").eq("id", user.user.id).maybeSingle();
      if (data?.full_name) setFullName(data.full_name);
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

  const changeEmail = async () => {
    setEmailError(null);
    const target = newEmail.trim().toLowerCase();
    if (!target) return;
    if (target === email.toLowerCase()) {
      setEmailError("New email must be different from your current email.");
      return;
    }
    setChangingEmail(true);
    try {
      const res = await requestEmailChange({ data: { newEmail: target, siteUrl: window.location.origin } });
      if (!res.ok) {
        setEmailError(res.error || "Could not send confirmation email.");
        setEmailPending(null);
      } else {
        setEmailPending(target);
        setNewEmail("");
        toast.success("Confirmation link sent to your current email.");
      }
    } catch (e: any) {
      setEmailError(e?.message || "Could not send confirmation email.");
    } finally {
      setChangingEmail(false);
    }
  };

  const sendPasswordReset = async () => {
    if (!email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message); else toast.success("Reset email sent");
  };

  const deleteAccount = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteMyAccount();
      await supabase.auth.signOut();
      toast.success("Account deleted");
      navigate({ to: "/auth" });
    } catch (e: any) {
      toast.error(e?.message || "Could not delete account");
      setDeleting(false);
      setConfirmDelete(false);
    }
  };


  return (
    <div className="max-w-2xl space-y-6">
      <section className="rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="text-base font-semibold">Profile</h2>
        <div className="mt-5 space-y-4">
          <label className="block text-xs font-medium text-zinc-600">
            Full name
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              placeholder="Your name"
            />
          </label>
          <label className="block text-xs font-medium text-zinc-600">
            Email
            <input
              value={email}
              disabled
              className="mt-1 block w-full cursor-not-allowed rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500"
            />
          </label>
          <button onClick={saveProfile} disabled={saving} className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50">
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </section>

      <section id="change-email" className="scroll-mt-24 rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="text-base font-semibold">Change email</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Enter a new email and we'll send a confirmation link to your current email address. Your email changes only after you click that link.
        </p>
        <div className="mt-4 space-y-3">
          <label className="block text-xs font-medium text-zinc-600">
            New email
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1 block w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={changeEmail}
              disabled={changingEmail || !newEmail}
              className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {changingEmail ? "Sending…" : "Change email"}
            </button>
            {emailPending && (
              <span className="text-xs font-medium text-amber-600">
                Verification pending — check {email} for a confirmation link.
              </span>
            )}
          </div>
          {emailError && <p className="text-xs font-medium text-rose-600">{emailError}</p>}
        </div>
      </section>


      <section className="rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="text-base font-semibold">Security</h2>
        <p className="mt-1 text-sm text-zinc-500">Protect your account with a password reset link or two-factor authentication.</p>

        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Password</p>
          <button onClick={sendPasswordReset} className="mt-2 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium hover:bg-zinc-50">
            Send password reset
          </button>
        </div>

        <div className="mt-6 border-t border-zinc-100 pt-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Two-Factor Authentication</p>
          <TwoFactorSettings />
        </div>
      </section>

      <section className="rounded-2xl border border-rose-200 bg-rose-50/40 p-6">
        <h2 className="text-base font-semibold text-rose-700">Danger zone</h2>
        <p className="mt-1 text-sm text-rose-600/80">Deleting your account is permanent and cannot be undone.</p>
        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)} className="mt-4 rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50">
            Delete account
          </button>
        ) : (
          <div className="mt-4 flex gap-2">
            <button onClick={deleteAccount} disabled={deleting} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50">{deleting ? "Deleting…" : "Confirm delete"}</button>
            <button onClick={() => setConfirmDelete(false)} disabled={deleting} className="rounded-lg px-4 py-2 text-sm">Cancel</button>

          </div>
        )}
      </section>
    </div>
  );
}
