import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TwoFactorSettings } from "@/components/TwoFactorSettings";
import { TrustedDevicesSettings } from "@/components/TrustedDevicesSettings";
import { requestEmailChange } from "@/lib/email-change.functions";
import { deleteMyAccount } from "@/lib/delete-account.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard/security")({
  head: () => ({
    meta: [
      { title: "Security — Jenvu" },
      { name: "description", content: "Manage Jenvu account security, sign-in protection, trusted devices, and account access." },
      { property: "og:title", content: "Security — Jenvu" },
      { property: "og:description", content: "Manage Jenvu account security, sign-in protection, trusted devices, and account access." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
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
    <div className="-mx-5 -mb-7 min-h-[calc(100dvh-4rem)] overflow-hidden bg-background text-foreground sm:-mx-8">
      <header className="border-b border-border px-4 py-3 sm:px-6">
        <h1 className="text-lg font-medium text-foreground">Security</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your password, two-factor authentication, and trusted devices.
        </p>
      </header>

      <div className="max-w-4xl divide-y divide-border px-4 sm:px-6">

      <section className="py-6">
        <h2 className="text-base font-medium text-foreground">Password</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          We'll email a secure single-use link to {email || "your account email"} so you can set a new password.
        </p>
        <Button
          variant="outline"
          onClick={sendPasswordReset}
          disabled={sending || !email}
          className="mt-4"
        >
          {sending ? "Sending…" : "Send password reset"}
        </Button>
      </section>

      <section id="change-email" className="scroll-mt-24 py-6">
        <h2 className="text-base font-medium text-foreground">Change email</h2>
        <p className="mt-1 text-sm text-muted-foreground">
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
            <Button
              onClick={changeEmail}
              disabled={changingEmail || !newEmail}
            >
              {changingEmail ? "Sending…" : "Change email"}
            </Button>
            {emailPending && (
              <span className="text-xs font-medium text-amber-600">
                Verification pending — check {email} for a confirmation link.
              </span>
            )}
          </div>
          {emailError && <p className="text-xs font-medium text-rose-600">{emailError}</p>}
        </div>
      </section>

      <section className="py-6">
        <h2 className="text-base font-medium text-foreground">Two-factor authentication</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Require a six-digit code from your authenticator app every time you sign in.
        </p>
        <div className="mt-4">
          <TwoFactorSettings />
        </div>
      </section>

      <section className="py-6">
        <h2 className="text-base font-medium text-foreground">Trusted devices</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Browsers you've marked as trusted skip the 2FA step on sign-in.&nbsp;
        </p>
        <div className="mt-4">
          <TrustedDevicesSettings />
        </div>
      </section>

      <section className="py-6">
        <h2 className="text-base font-medium text-foreground">Session</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Signing out clears your local session on this browser.&nbsp;
          <br />
          Trusted-device status stays until you revoke it above.
        </p>

        <Button
          variant="outline"
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = "/auth";
          }}
          className="mt-4"
        >
          Sign out of this browser
        </Button>
      </section>

      <section className="py-6">
        <h2 className="text-base font-medium text-destructive">Danger zone</h2>
        <p className="mt-1 text-sm text-rose-600/80">Deleting your account is permanent and cannot be undone.</p>
        {!confirmDelete ? (
          <Button
            variant="outline"
            onClick={() => setConfirmDelete(true)}
            className="mt-4 border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive"
          >
            Delete account
          </Button>
        ) : (
          <div className="mt-4 flex gap-2">
            <Button
              variant="destructive"
              onClick={deleteAccount}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Confirm delete"}
            </Button>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)} disabled={deleting}>
              Cancel
            </Button>
          </div>
        )}
      </section>
      </div>
    </div>
  );
}
