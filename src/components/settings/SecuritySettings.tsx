import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { TwoFactorSettings } from "@/components/TwoFactorSettings";
import { TrustedDevicesSettings } from "@/components/TrustedDevicesSettings";
import { requestEmailChange } from "@/lib/email-change.functions";
import { deleteMyAccount } from "@/lib/delete-account.functions";
import { signOutAndRedirect } from "@/lib/cross-domain-session";
import { SettingsCard, SettingsRow, settingsBtn, settingsBtnPrimary, settingsField } from "./SettingsCard";

/** Password, email change, 2FA and trusted devices (formerly the Security page). */
export function SecuritySettings({ email }: { email: string }) {
  const [sending, setSending] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [changingEmail, setChangingEmail] = useState(false);
  const [emailPending, setEmailPending] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

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

  return (
    <SettingsCard id="security" title="Security" description="Manage your password, email, two-factor authentication and trusted devices.">
      <SettingsRow label="Password" hint={<>We'll email a secure single-use link to {email || "your account email"} so you can set a new password.</>}>
        <button type="button" onClick={sendPasswordReset} disabled={sending || !email} className={settingsBtn}>
          {sending ? "Sending…" : "Send reset link"}
        </button>
      </SettingsRow>

      <div id="change-email" className="scroll-mt-24">
        <SettingsRow
          wide
          label="Change email"
          hint="We'll send a confirmation link to your current email. Your email changes after you click that link."
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="email"
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
              placeholder="New email address"
              aria-label="New email"
              className={`${settingsField} sm:max-w-[360px]`}
            />
            <button type="button" onClick={changeEmail} disabled={changingEmail || !newEmail} className={settingsBtnPrimary}>
              {changingEmail ? "Sending…" : "Change email"}
            </button>
          </div>
          {emailPending && <p className="mt-2 text-[13px] text-gc-ink-muted">Verification pending — check {email} for a confirmation link.</p>}
          {emailError && <p className="mt-2 text-[13px] font-medium text-destructive">{emailError}</p>}
        </SettingsRow>
      </div>

      <SettingsRow wide label="Two-factor authentication" hint="Require a six-digit code from your authenticator app every time you sign in.">
        <TwoFactorSettings />
      </SettingsRow>

      <SettingsRow wide label="Trusted devices" hint="Browsers you've marked as trusted skip the 2FA step on sign-in.">
        <TrustedDevicesSettings />
      </SettingsRow>
    </SettingsCard>
  );
}

/** Permanent account deletion. */
export function DangerZoneSettings() {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const deleteAccount = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteMyAccount();
      toast.success("Account deleted");
      await signOutAndRedirect("/dashboard");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete account");
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <SettingsCard id="danger" tone="danger" title="Danger zone">
      <SettingsRow label="Delete account" hint="Deleting your account is permanent and cannot be undone.">
        {!confirmDelete ? (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="inline-flex h-10 items-center rounded-full border border-destructive/30 px-5 text-[14px] font-medium text-destructive hover:bg-destructive/5"
          >
            Delete account
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={deleteAccount}
              disabled={deleting}
              className="inline-flex h-10 items-center rounded-full bg-destructive px-5 text-[14px] font-medium text-destructive-foreground disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Confirm delete"}
            </button>
            <button type="button" onClick={() => setConfirmDelete(false)} disabled={deleting} className={settingsBtn}>
              Cancel
            </button>
          </div>
        )}
      </SettingsRow>
    </SettingsCard>
  );
}
