import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TwoFactorSettings } from "@/components/TwoFactorSettings";
import { TrustedDevicesSettings } from "@/components/TrustedDevicesSettings";
import { requestEmailChange } from "@/lib/email-change.functions";
import { deleteMyAccount } from "@/lib/delete-account.functions";

export const Route = createFileRoute("/_authenticated/dashboard/security")({
  component: SecurityPage,
});

function SecurityPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [changingEmail, setChangingEmail] = useState(false);
  const [emailPending, setEmailPending] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setEmail(data.user?.email ?? "");
    })();
  }, []);

  const sendPasswordReset = async () => {
    if (!email || sending) return;
    setSending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSending(false);
    if (error) toast.error(error.message);
    else toast.success("Password reset email sent");
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
      const result = await requestEmailChange({ data: { newEmail: target, siteUrl: window.location.origin } });
      if (!result.ok) {
        setEmailError(result.error || "Could not send confirmation email.");
        setEmailPending(null);
      } else {
        setEmailPending(target);
        setNewEmail("");
        toast.success("Confirmation link sent to your current email.");
      }
    } catch (error) {
      setEmailError(error instanceof Error ? error.message : "Could not send confirmation email.");
    } finally {
      setChangingEmail(false);
    }
  };

  const deleteAccount = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteMyAccount();
      await supabase.auth.signOut();
      toast.success("Account deleted");
      navigate({ to: "/auth" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete account");
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="pl-1 text-lg font-semibold">Security</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Manage how you sign in to Jenvu — password, two-factor authentication and trusted devices.
        </p>
      </div>

      <section className="border-t border-zinc-100 pt-6">
        <h2 className="pl-1 text-base font-semibold">&nbsp;Password</h2>
        <p className="mt-1 text-sm text-zinc-500">
          We'll email a secure single-use link to {email || "your account email"} so you can set a new password.
        </p>
        <button
          onClick={sendPasswordReset}
          disabled={sending || !email}
          className="mt-4 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50"
        >
          {sending ? "Sending…" : "Send password reset"}
        </button>
      </section>

      <section id="change-email" className="scroll-mt-24 border-t border-zinc-100 pt-6">
        <h2 className="pl-1 text-base font-semibold">&nbsp;Change email</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Enter a new email and we'll send a confirmation link to your current email address. Your email changes only after you click that link.
        </p>
        <div className="mt-4 space-y-3">
          <label className="block text-xs font-medium text-zinc-600">
            New email
            <input
              type="email"
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
              placeholder="you@example.com"
              className="mt-1 block w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>
          <div className="flex flex-wrap items-center gap-3">
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

      <section className="border-t border-zinc-100 pt-6">
        <h2 className="pl-1 text-base font-semibold">&nbsp;Two-factor authentication</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Require a six-digit code from your authenticator app every time you sign in.
        </p>
        <div className="mt-4">
          <TwoFactorSettings />
        </div>
      </section>

      <section className="border-t border-zinc-100 pt-6">
        <h2 className="pl-1 text-base font-semibold">&nbsp;Trusted devices</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Browsers you've marked as trusted skip the 2FA step on sign-in.&nbsp;
        </p>
        <div className="mt-4">
          <TrustedDevicesSettings />
        </div>
      </section>

      <section className="border-t border-zinc-100 pt-6">
        <h2 className="pl-1 text-base font-semibold">&nbsp;Session</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Signing out clears your local session on this browser.&nbsp;
          <br />
          Trusted-device status stays until you revoke it above.
        </p>

        <button
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = "/auth";
          }}
          className="mt-4 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium hover:bg-zinc-50"
        >
          Sign out of this browser
        </button>
      </section>

      <section className="border-t border-zinc-100 pt-6">
        <h2 className="pl-1 text-base font-semibold text-rose-700">&nbsp;Danger zone</h2>
        <p className="mt-1 text-sm text-rose-600/80">Deleting your account is permanent and cannot be undone.</p>
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="mt-4 rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50"
          >
            Delete account
          </button>
        ) : (
          <div className="mt-4 flex gap-2">
            <button
              onClick={deleteAccount}
              disabled={deleting}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Confirm delete"}
            </button>
            <button onClick={() => setConfirmDelete(false)} disabled={deleting} className="rounded-lg px-4 py-2 text-sm">
              Cancel
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
