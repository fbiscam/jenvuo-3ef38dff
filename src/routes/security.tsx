import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell, H2, P, UL } from "@/components/PageShell";

export const Route = createFileRoute("/security")({
  head: () => ({
    meta: [
      { title: "Security — Jenvu" },
      { name: "description", content: "How Jenvu secures your account: authentication, two-factor login, trusted devices, encryption in transit, row-level access controls and how to reach our security team." },
      { property: "og:title", content: "Security — Jenvu" },
      { property: "og:description", content: "Authentication, 2FA, trusted devices, encryption, access controls and responsible disclosure at Jenvu." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://jenvu.com/security" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://jenvu.com/security" }],
  }),
  component: SecurityPage,
});

function SecurityPage() {
  return (
    <PageShell
      eyebrow="Trust"
      title={"Security at\nJenvu"}
      intro="This page is maintained by the Jenvu team to summarise the security controls that protect your account and data. It describes practices in place today, not an independent certification."
    >
      <section className="space-y-3">
        <H2>1. Account authentication</H2>
        <P>Sign-in is handled through our managed authentication provider. We support:</P>
        <UL>
          <li><strong>Email &amp; password</strong> — passwords are salted and hashed by the auth provider; we never see or store the plaintext.</li>
          <li><strong>Google sign-in</strong> — OAuth 2.0 through your Google account, no password stored with us.</li>
          <li><strong>Password reset</strong> — signed, single-use email links with a short expiry.</li>
        </UL>
      </section>

      <section className="space-y-3">
        <H2>2. Two-factor authentication (2FA)</H2>
        <P>You can enable time-based one-time password (TOTP) 2FA from your <Link to="/dashboard/profile" className="underline underline-offset-4">account settings</Link>. Once enabled:</P>
        <UL>
          <li>A six-digit code from your authenticator app is required at every sign-in.</li>
          <li>Wrong or expired codes are rejected with a clear error and rate-limited to prevent brute force.</li>
          <li>You can resend or regenerate codes with a cooldown timer between attempts.</li>
        </UL>
      </section>

      <section className="space-y-3">
        <H2>3. Trusted devices</H2>
        <P>To balance security with usability, you can mark a browser as trusted after passing 2FA. This stores a hashed, expiring token bound to your account.</P>
        <UL>
          <li>Trusted-device tokens are hashed server-side — the raw token never leaves your browser storage.</li>
          <li>Every trusted device is listed in your account settings with its last-used time and expiry.</li>
          <li>You can revoke any device individually, revoke all devices at once, or use <em>“Forget this device”</em> to remove the current browser.</li>
          <li>Signing out explicitly revokes the current browser's trust so a future login requires 2FA again.</li>
        </UL>
      </section>

      <section className="space-y-3">
        <H2>4. Data access controls</H2>
        <UL>
          <li><strong>Row-level security</strong> is enabled on user-owned tables. Policies scope every read and write to the signed-in user's ID.</li>
          <li><strong>Least-privilege roles</strong> — the app talks to the database using a publishable key that is subject to those policies. Elevated service credentials are used only for verified server-side maintenance and never exposed to the browser.</li>
          <li><strong>Server-side validation</strong> — sensitive actions (email change, account deletion, role checks) run through authenticated server functions with bearer-token verification.</li>
        </UL>
      </section>

      <section className="space-y-3">
        <H2>5. Encryption &amp; transport</H2>
        <UL>
          <li>All traffic to jenvu.com and our APIs is served over HTTPS (TLS).</li>
          <li>Data at rest in our managed database and storage is encrypted by the underlying platform.</li>
          <li>Authentication tokens are stored in your browser's local storage and rotated by the auth provider; they are never transmitted to third parties.</li>
        </UL>
      </section>

      <section className="space-y-3">
        <H2>6. Account lifecycle</H2>
        <UL>
          <li><strong>Email change</strong> requires confirmation from the new address before the switch takes effect.</li>
          <li><strong>Account deletion</strong> is self-service from your profile and removes your profile, sessions and trusted devices.</li>
          <li><strong>Session sign-out</strong> clears the local session and revokes the current trusted-device token.</li>
        </UL>
      </section>

      <section className="space-y-3">
        <H2>7. Abuse prevention</H2>
        <UL>
          <li>Sign-in and 2FA endpoints are rate-limited by the auth provider.</li>
          <li>Anonymous sign-ups are disabled; every account is tied to a verifiable email or OAuth identity.</li>
          <li>Failed MFA attempts surface a clear toast so a user can distinguish a wrong code from a network error.</li>
        </UL>
      </section>

      <section className="space-y-3">
        <H2>8. Shared responsibility</H2>
        <P>Security is a partnership. On our side we ship the controls above and keep them patched. On your side we recommend:</P>
        <UL>
          <li>Use a unique, strong password or a password manager.</li>
          <li>Enable 2FA and keep backup codes somewhere safe.</li>
          <li>Only trust devices you personally control, and revoke any you no longer use.</li>
          <li>Sign out on shared or public machines.</li>
        </UL>
      </section>

      <section className="space-y-3">
        <H2>9. Reporting a vulnerability</H2>
        <P>
          If you believe you have found a security issue, please email{" "}
          <a className="underline underline-offset-4" href="mailto:security@jenvu.com">security@jenvu.com</a>{" "}
          with steps to reproduce. Please do not publicly disclose the issue until we have had a reasonable chance to investigate and respond. We aim to acknowledge reports within a few business days.
        </P>
      </section>

      <section className="space-y-3">
        <H2>10. Related policies</H2>
        <UL>
          <li><Link to="/privacy" className="underline underline-offset-4">Privacy Policy</Link> — what data we collect and how it is used.</li>
          <li><Link to="/terms" className="underline underline-offset-4">Terms of Service</Link> — the agreement covering your use of Jenvu.</li>
          <li><Link to="/disclaimer" className="underline underline-offset-4">Disclaimer</Link> — limits of the market analysis Jenvu provides.</li>
        </UL>
      </section>
    </PageShell>
  );
}
