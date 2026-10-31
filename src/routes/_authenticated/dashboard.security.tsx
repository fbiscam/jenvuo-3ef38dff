import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { TwoFactorSettings } from "@/components/TwoFactorSettings";
import { TrustedDevicesSettings } from "@/components/TrustedDevicesSettings";
import { requestEmailChange } from "@/lib/email-change.functions";
import { getIpGeo } from "@/lib/ip-geo";
import { signOutAndRedirect } from "@/lib/cross-domain-session";
import { SettingsPageHeader } from "@/components/settings/SettingsNav";
import { settingsField } from "@/components/settings/SettingsCard";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard/security")({
  head: () => ({
    meta: [
      { title: "Security settings — Jenvu" },
      { name: "description", content: "Password, two-step sign-in, email and active sessions for your Jenvu account." },
      { property: "og:title", content: "Security settings — Jenvu" },
      { property: "og:description", content: "Password, two-step sign-in, email and active sessions for your Jenvu account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SecurityPage,
});

const pillBtn =
  "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-gc-line bg-background px-4 text-[14px] font-medium text-foreground transition-colors hover:bg-gc-surface disabled:opacity-50";

function describeBrowser(ua: string) {
  let browser = "Browser";
  if (/Edg\//.test(ua)) browser = "Edge";
  else if (/Chrome\//.test(ua)) browser = "Chrome";
  else if (/Firefox\//.test(ua)) browser = "Firefox";
  else if (/Safari\//.test(ua)) browser = "Safari";
  let os = "";
  if (/Windows/.test(ua)) os = "Windows";
  else if (/Android/.test(ua)) os = "Android";
  else if (/iPhone|iPad/.test(ua)) os = "iOS";
  else if (/Mac OS X/.test(ua)) os = "macOS";
  else if (/Linux/.test(ua)) os = "Linux";
  return [browser, os].filter(Boolean).join(" on ");
}

const fmt = (d?: string | null) => {
  if (!d) return "—";
  try { return new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }); } catch { return d; }
};

/** One row: title + grey line on the left, a pill button on the right, optional panel below. */
function Row({ id, title, hint, action, open, children }: { id?: string; title: string; hint: ReactNode; action: ReactNode; open?: boolean; children?: ReactNode }) {
  return (
    <div id={id} className="scroll-mt-24 py-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-2">
        <div className="min-w-0">
          <p className="text-[15px] leading-snug text-foreground">{title}</p>
          <p className="mt-1 text-[14px] leading-snug text-muted-foreground">{hint}</p>
        </div>
        {action}
      </div>
      {open && children && <div className="px-2 pb-1 pt-2">{children}</div>}
    </div>
  );
}

function Toggle({ open, onClick, label }: { open: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} aria-expanded={open} className={pillBtn}>
      {label}
      <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
    </button>
  );
}

function SecurityPage() {
  const [email, setEmail] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [changingEmail, setChangingEmail] = useState(false);
  const [emailPending, setEmailPending] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [device, setDevice] = useState("This browser");
  const [place, setPlace] = useState<string | null>(null);
  const [signedInAt, setSignedInAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setEmail(data.session?.user.email ?? ""));
    void supabase.auth.getUser().then(({ data }) => setSignedInAt(data.user?.last_sign_in_at ?? null));
    setDevice(describeBrowser(navigator.userAgent));
    void getIpGeo().then((g) => {
      if (g) setPlace([g.city, g.country_name].filter(Boolean).join(", ") || null);
    }).catch(() => {});
    const hash = window.location.hash.replace("#", "");
    if (hash === "change-email") setOpen("email");
    if (hash === "security" || hash === "2fa") setOpen("2fa");
    if (hash) setTimeout(() => document.getElementById(hash)?.scrollIntoView({ block: "start" }), 300);
  }, []);

  const toggle = (key: string) => setOpen((cur) => (cur === key ? null : key));

  const sendPasswordReset = async () => {
    if (!email || sending) return;
    setSending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
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

  const signOutOthers = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signOut({ scope: "others" });
    setBusy(false);
    if (error) toast.error("Could not sign out other sessions");
    else toast.success("Signed out of all other browsers and devices");
  };

  return (
    <div className="mx-auto w-full max-w-[1100px] pb-10 text-foreground">
      <div className="px-2">
        <SettingsPageHeader title="Security" description="Sign-in protection, email and the devices where you're signed in." />
      </div>

      <div id="security" className="mt-6 divide-y divide-gc-line">
        <Row
          id="2fa"
          title="Two-factor authentication"
          hint="Ask for a six-digit code from your authenticator app every time you sign in."
          open={open === "2fa"}
          action={<Toggle open={open === "2fa"} onClick={() => toggle("2fa")} label="Manage MFA" />}
        >
          <TwoFactorSettings />
        </Row>

        <Row
          title="Password"
          hint={<>We'll email a single-use link to {email || "your account email"} to set a new password.</>}
          action={
            <button type="button" onClick={sendPasswordReset} disabled={sending || !email} className={pillBtn}>
              {sending ? "Sending…" : <>Reset password <ArrowUpRight className="h-3.5 w-3.5" /></>}
            </button>
          }
        />

        <Row
          id="change-email"
          title="Change email"
          hint="We confirm the change through a link sent to your current email."
          open={open === "email"}
          action={<Toggle open={open === "email"} onClick={() => toggle("email")} label="Change email" />}
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
            <button type="button" onClick={changeEmail} disabled={changingEmail || !newEmail} className={pillBtn}>
              {changingEmail ? "Sending…" : "Send confirmation"}
            </button>
          </div>
          {emailPending && <p className="mt-2 text-[13px] text-muted-foreground">Verification pending — check {email} for a confirmation link.</p>}
          {emailError && <p className="mt-2 text-[13px] font-medium text-destructive">{emailError}</p>}
        </Row>

        <Row
          title="Trusted devices"
          hint="Browsers you marked as trusted skip the two-factor step on sign-in."
          open={open === "devices"}
          action={<Toggle open={open === "devices"} onClick={() => toggle("devices")} label="Manage devices" />}
        >
          <TrustedDevicesSettings />
        </Row>

        <Row
          id="sessions"
          title={`This browser · ${device}`}
          hint={<>{place ? `${place} · ` : ""}Signed in {fmt(signedInAt)}</>}
          action={
            <button type="button" onClick={() => void signOutAndRedirect("/dashboard/security")} className={pillBtn}>
              Sign out
            </button>
          }
        />

        <Row
          title="Sign out everywhere else"
          hint="Ends every other browser, phone and extension session. You stay signed in here."
          action={
            <button type="button" onClick={signOutOthers} disabled={busy} className={pillBtn}>
              {busy ? "Signing out…" : "Sign out others"}
            </button>
          }
        />
      </div>
    </div>
  );
}
