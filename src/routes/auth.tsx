import JenvuMark from "@/components/JenvuMark";
import * as React from "react";
import { clearStoredAuthSessions, goAfterSignIn as goAfterSignInRaw, restoreSharedSession } from "@/lib/cross-domain-session";
import { createFileRoute, useNavigate, Link, redirect } from "@tanstack/react-router";
import { oauthReturnPath } from "@/lib/oauth-return-path";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Mail, Loader2, Eye, EyeOff, ChevronDown } from "lucide-react";
import { lovable } from "@/integrations/lovable/index";
import { isFreshSocialSignup } from "@/lib/social-signup";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import {
  confirmRecoveryOtp,
  completeSocialSignup,
  confirmSignupOtp,
  checkSignupCode,
  getTurnstileSiteKey,
  requestRecoveryOtp,
  requestSignupOtp,
  signInWithTurnstile,
  finishSignInWithEmailCode,
  requestLoginCode,
  signInWithLoginCode,
} from "@/lib/custom-auth.functions";
import { TurnstileWidget } from "@/components/auth/TurnstileWidget";
import { applyReferralCode } from "@/lib/referrals.functions";
import { registerTrustedDevice, verifyTrustedDevice } from "@/lib/trusted-devices.functions";
import { sendWelcomeEmail } from "@/lib/email/welcome.functions";
import { createUserNotification } from "@/lib/notifications.functions";
import { Button } from "@/components/ui/button";

const TRUSTED_DEVICE_KEY = (uid: string) => `mfa_trusted_device:${uid}`;
const SAVED_LOGIN_EMAIL_KEY = "jenvu_saved_login_email";

async function waitForMfaElevation(): Promise<boolean> {
  for (let i = 0; i < 10; i += 1) {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) return false;
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (!aal || aal.currentLevel === "aal2" || aal.nextLevel !== "aal2") return true;
    await new Promise((resolve) => window.setTimeout(resolve, 150));
  }
  return false;
}


type AuthSearch = { redirect?: string; emailChanged?: "1"; newEmail?: string; mfa?: "1"; mode?: "signup" };

export function sanitizeRedirect(r?: string): string {
  if (!r || typeof r !== "string") return "/dashboard";
  if (!r.startsWith("/") || r.startsWith("//")) return "/dashboard";
  // OAuth consent needs its authorization_id query preserved.
  if (r.startsWith("/.lovable/oauth/consent")) {
    const safe = oauthReturnPath(r);
    return safe === "/" ? "/dashboard" : safe;
  }
  // Strip query/hash — TanStack's navigate({ to }) expects a route path only.
  // Lovable preview appends cache-buster params (__lovable_sha, __lovable_load_id)
  // that break route matching and cause sign-in to silently stall on /auth.
  const path = r.split("?")[0].split("#")[0];
  return path || "/dashboard";
}

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): AuthSearch => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
    emailChanged: search.emailChanged === "1" ? "1" : undefined,
    newEmail: typeof search.newEmail === "string" ? search.newEmail : undefined,
    mfa: search.mfa === "1" ? "1" : undefined,
    mode: search.mode === "signup" ? "signup" : undefined,
  }),
  beforeLoad: async ({ search }) => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash || "";
      if (hash.includes("type=recovery") || hash.includes("error")) return;
      if (search.emailChanged === "1") return;
      if (search.mfa === "1") return;
      if (new URLSearchParams(window.location.search).get("signed_out") === "1") {
        // Drop the marker first: beforeLoad re-runs when the session changes
        // (router.invalidate on SIGNED_IN), and a lingering signed_out=1 would
        // wipe the brand-new session right after the user signs in again.
        const url = new URL(window.location.href);
        url.searchParams.delete("signed_out");
        window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
        clearStoredAuthSessions();
        await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
        clearStoredAuthSessions();
        return;
      }
    }

    let { data } = await supabase.auth.getUser();
    if (!data.user && (await restoreSharedSession())) data = (await supabase.auth.getUser()).data;
    if (data.user) {
      // A brand-new Google/Apple account first runs the sign-up checks on this page.
      if (isNewSocialUser(data.user)) return;
      // If MFA elevation is required but not yet completed, stay on /auth so
      // the user can enter their 6-digit code — do NOT redirect to /dashboard,
      // which would just bounce back here (redirect loop).
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal && aal.currentLevel === "aal1" && aal.nextLevel === "aal2") return;
      const dest = sanitizeRedirect(search.redirect);
      if (typeof window !== "undefined") {
        if (await goAfterSignInRaw(dest, () => undefined)) return;
      }
      throw redirect({ to: dest as "/dashboard" });
    }
  },
  head: () => ({
    meta: [
      { title: "Sign in to your Desk — Jenvu" },
      {
        name: "description",
        content:
          "Sign in to your Jenvu account to access the AI-powered trading terminal, live ICT/SMC analysis and reviewed signals for Gold, BTC/USD and EUR/USD.",
      },
      { name: "robots", content: "noindex, follow" },
      { property: "og:title", content: "Sign in to your Desk" },
      { property: "og:description", content: "Access your AI trading terminal for Gold, BTC/USD and EUR/USD and account dashboard." },
      { property: "og:url", content: "https://auth.jenvu.com/sign-in" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Sign in to your Desk" },
      { name: "twitter:description", content: "Access your AI trading terminal for Gold, BTC/USD and EUR/USD and account dashboard." },
    ],
    links: [{ rel: "canonical", href: "https://auth.jenvu.com/sign-in" }],
  }),
  component: AuthPage,
});


const MONO = "font-sans";

type SocialProvider = "google" | "apple";

function isNewSocialUser(user: { app_metadata?: Record<string, unknown>; created_at?: string }) {
  return isFreshSocialSignup({
    provider: String(user.app_metadata?.provider || "email"),
    createdAt: user.created_at,
    now: Date.now(),
    alreadyProcessed: false,
  });
}
const SANS = "font-['Google_Sans_Flex','Google_Sans','Product_Sans','Poppins',system-ui,sans-serif]";

function AuthPage() {
  const navigate = useNavigate();
  const sendSignupOtp = useServerFn(requestSignupOtp);
  const verifySignupCode = useServerFn(confirmSignupOtp);
  const checkCode = useServerFn(checkSignupCode);
  const sendRecoveryOtp = useServerFn(requestRecoveryOtp);
  const verifyRecoveryCode = useServerFn(confirmRecoveryOtp);
  const serverSignIn = useServerFn(signInWithTurnstile);
  const finishWithEmailCode = useServerFn(finishSignInWithEmailCode);
  const sendLoginCodeFn = useServerFn(requestLoginCode);
  const loginWithCode = useServerFn(signInWithLoginCode);
  // "login" = one-time code instead of a password; "second" = code after a correct password.
  const [codeFor, setCodeFor] = React.useState<"login" | "second">("login");
  const loadSiteKey = useServerFn(getTurnstileSiteKey);
  const [turnstileSiteKey, setTurnstileSiteKey] = React.useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = React.useState<string | null>(null);
  const [turnstileReset, setTurnstileReset] = React.useState(0);
  React.useEffect(() => {
    loadSiteKey()
      .then((r) => setTurnstileSiteKey(r.siteKey))
      .catch(() => setTurnstileSiteKey(null));
  }, [loadSiteKey]);
  const needsTurnstile = !!turnstileSiteKey && !turnstileToken;
  const freshTurnstile = () => setTurnstileReset((n) => n + 1);
  const search = Route.useSearch();
  const redirectTo = sanitizeRedirect(search.redirect);
  // ?mode=signup opens the sign-up form (free trial); everything else opens on sign-in.
  const [mode, setMode] = React.useState<"signin" | "signup" | "forgot">(
    search.mode === "signup" ? "signup" : "signin",
  );
  // A brand-new account goes straight to API keys to create its first key.
  const signedUpRef = React.useRef(false);
  const [signinStep, setSigninStep] = React.useState<"choose" | "email" | "password" | "code">("choose");
  const [signupStep, setSignupStep] = React.useState<"choose" | "form" | "details">("choose");
  const [socialBusy, setSocialBusy] = React.useState<SocialProvider | null>(null);
  // "Completing sign-in / sign-up" screen while the session is checked and the next page opens.
  const [completing, setCompleting] = React.useState<null | "in" | "up">(null);
  const goAfterSignIn = (dest: string, fallback: () => void) => {
    setCompleting(signedUpRef.current ? "up" : "in");
    // Never leave the screen stuck if the next page doesn't open.
    window.setTimeout(() => setCompleting(null), 15000);
    return goAfterSignInRaw(dest, fallback);
  };
  const finishSocial = useServerFn(completeSocialSignup);
  const socialCheckedRef = React.useRef<string | null>(null);

  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [emailUpdates, setEmailUpdates] = React.useState(false);
  const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [rememberLogin, setRememberLogin] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [emailChangedBanner, setEmailChangedBanner] = React.useState<string | null>(null);

  // Show a banner + toast when redirected here after a successful email change.
  React.useEffect(() => {
    if (search.emailChanged !== "1") return;
    const ne = search.newEmail || "";
    if (ne) setEmail(ne);
    setEmailChangedBanner(ne || "your new email");
    // Strip the params from the URL so a refresh doesn't re-fire the toast.
    navigate({
      to: "/auth",
      search: (prev: AuthSearch) => ({ ...prev, emailChanged: undefined, newEmail: undefined }),
      replace: true,
    });
  }, []);

  const [otpStep, setOtpStep] = React.useState(false);
  const [otpCode, setOtpCode] = React.useState("");
  const [otpError, setOtpError] = React.useState<string | null>(null);
  const [otpShake, setOtpShake] = React.useState(false);
  const [resending, setResending] = React.useState(false);
  const [forgotStep, setForgotStep] = React.useState<"email" | "code" | "reset">("email");
  const [newPassword, setNewPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [showNewPassword, setShowNewPassword] = React.useState(false);

  React.useEffect(() => {
    const savedEmail = window.localStorage.getItem(SAVED_LOGIN_EMAIL_KEY);
    if (savedEmail) setEmail(savedEmail);
  }, []);

  const recoveryModeRef = React.useRef(false);
  const lastSubmittedOtpRef = React.useRef<string>("");
  const otpInputRef = React.useRef<HTMLInputElement | null>(null);
  const recoveryOtpInputRef = React.useRef<HTMLInputElement | null>(null);
  const [resendCooldown, setResendCooldown] = React.useState(0);

  // --- MFA (TOTP) challenge state ---
  const [mfaChallenge, setMfaChallenge] = React.useState<null | {
    factorId: string;
    challengeId: string;
    userId: string;
  }>(null);
  const [mfaCode, setMfaCode] = React.useState("");
  const [mfaError, setMfaError] = React.useState<string | null>(null);
  const [mfaShake, setMfaShake] = React.useState(false);
  const [mfaResendCooldown, setMfaResendCooldown] = React.useState(0);
  const [mfaResending, setMfaResending] = React.useState(false);
  const [rememberDevice, setRememberDevice] = React.useState(true);
  const mfaInputRef = React.useRef<HTMLInputElement | null>(null);
  const verifyTrustedDeviceFn = useServerFn(verifyTrustedDevice);
  const registerTrustedDeviceFn = useServerFn(registerTrustedDevice);

  // Terminal-header flash: shows a blinking notification inside the auth-session
  // strip for a few seconds, then reverts to the default label.
  const [flashMsg, setFlashMsg] = React.useState<string | null>(null);
  const [flashTarget, setFlashTarget] = React.useState<"email" | "password">("email");
  const flashTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashInfo = React.useCallback((msg: string, target: "email" | "password" = "email") => {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    setFlashTarget(target);
    setFlashMsg(msg);
    flashTimerRef.current = setTimeout(() => setFlashMsg(null), 3000);
  }, []);
  React.useEffect(() => () => {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
  }, []);

  const flashInline = (target: "email" | "password") =>
    flashMsg && flashTarget === target ? (
      <div key={flashMsg} className={`mt-2 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-700 ${MONO} animate-terminal-blink`}>
        <span className="mt-[2px] inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
        <span className="leading-snug">{flashMsg}</span>
      </div>
    ) : null;

  React.useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  React.useEffect(() => {
    if (mfaResendCooldown <= 0) return;
    const t = setInterval(() => setMfaResendCooldown((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(t);
  }, [mfaResendCooldown]);



  // Capture ?ref=CODE and stash it for post-signup application.
  React.useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const ref = url.searchParams.get("ref");
      if (ref && ref.trim()) {
        window.sessionStorage.setItem("pending_ref_code", ref.trim().toUpperCase());
      }
    } catch { /* ignore */ }
  }, []);

  const applyRefFn = useServerFn(applyReferralCode);
  const applyPendingReferral = React.useCallback(async () => {
    if (typeof window === "undefined") return;
    const code = window.sessionStorage.getItem("pending_ref_code");
    if (!code) return;
    window.sessionStorage.removeItem("pending_ref_code");
    try {
      const res = await applyRefFn({ data: { code } });
      if (res?.ok) {
        toast.success("Referral applied — 50 credits unlock when you upgrade");
      }
    } catch { /* silent */ }
  }, [applyRefFn]);

  // Google/Apple: run the sign-up checks + free trial for a brand-new account.
  // Returns false when the account was refused (it is signed out again).
  const socialGate = React.useCallback(async (user: { id: string; email?: string; app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown>; created_at?: string }) => {
    const provider = String(user.app_metadata?.provider || "email");
    if (provider === "email") return true;
    if (socialCheckedRef.current === user.id) return true;
    socialCheckedRef.current = user.id;
    try {
      const { getDeviceFingerprint } = await import("@/lib/device-fingerprint");
      const fingerprint = await getDeviceFingerprint();
      const res = await finishSocial({ data: { fingerprint } });
      if (!res.ok) {
        socialCheckedRef.current = null;
        clearStoredAuthSessions();
        await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
        setSocialBusy(null);
        setErrorMsg(res.error || "Sign-up is not allowed on this device.");
        return false;
      }
      if (res.isNew) {
        signedUpRef.current = true;
        const name = String(user.user_metadata?.full_name || user.user_metadata?.name || "");
        void sendWelcomeEmail({ data: { fullName: name, siteUrl: window.location.origin } }).catch(() => {});
        void createUserNotification({
          data: {
            type: "welcome",
            title: `Welcome to Jenvu${name ? ", " + name.split(" ")[0] : ""} 👋`,
            body: "Your account is ready. Explore the Terminal, Chat and API.",
            dedupeKey: `welcome-${(user.email || user.id).toLowerCase()}`,
          },
        });
        void import("@/lib/system-mail.functions").then((m) =>
          m.sendWelcomeSystemMail({ data: { fullName: name } }).catch(() => {}),
        );
      }
      return true;
    } catch {
      socialCheckedRef.current = null;
      setSocialBusy(null);
      setErrorMsg("Could not finish signing in. Please try again.");
      return false;
    }
  }, [finishSocial]);

  const socialSignIn = async (provider: SocialProvider) => {
    if (socialBusy) return;
    setErrorMsg(null);
    setSocialBusy(provider);
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: `${window.location.origin}${window.location.pathname}`,
    });
    if (result.error) {
      setSocialBusy(null);
      setErrorMsg(result.error.message || "Could not sign in. Please try again.");
      return;
    }
    // Redirected: the browser leaves for the provider. Otherwise the session is
    // set and the SIGNED_IN listener below continues.
  };

  // Shared: open the TOTP challenge for a user who's already signed in
  // but stuck at AAL1 (needs to complete MFA). Also handles trusted-device
  // fast path.
  const openMfaChallengeIfNeeded = React.useCallback(async () => {
    const { data: sess } = await supabase.auth.getSession();
    const session = sess.session;
    if (!session) return false;
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (!aal || aal.currentLevel !== "aal1" || aal.nextLevel !== "aal2") return false;
    const { data: fac } = await supabase.auth.mfa.listFactors();
    const totp = fac?.totp?.find((f) => f.status === "verified");
    if (!totp) return false;
    try {
      const uid = session.user.id;
      const savedToken = window.localStorage.getItem(TRUSTED_DEVICE_KEY(uid));
      if (savedToken) {
        const res = await verifyTrustedDeviceFn({ data: { token: savedToken } });
        if (res?.valid) {
          await applyPendingReferral();
          void goAfterSignIn(redirectTo, () => navigate({ to: redirectTo as "/dashboard", replace: true }));
          return true;
        }
        window.localStorage.removeItem(TRUSTED_DEVICE_KEY(uid));
      }
    } catch { /* fall through */ }
    const { data: chal, error } = await supabase.auth.mfa.challenge({ factorId: totp.id });
    if (error || !chal) {
      const msg = error?.message || "Could not start MFA challenge";
      setErrorMsg(msg);
      toast.error("Two-factor step failed", { description: msg });
      return true;
    }
    setMfaChallenge({ factorId: totp.id, challengeId: chal.id, userId: session.user.id });
    setMfaCode("");
    setMfaError(null);
    setMfaResendCooldown(30);
    return true;
  }, [navigate, redirectTo, applyPendingReferral, verifyTrustedDeviceFn]);

  // On mount / when arriving with ?mfa=1, if the session is already at AAL1
  // needing AAL2, open the challenge — no SIGNED_IN event fires on plain page
  // loads, so this is required to avoid a redirect loop with the dashboard.
  React.useEffect(() => {
    void (async () => {
      // Back from Google/Apple with a brand-new account: checks first, then continue.
      const { data } = await supabase.auth.getUser();
      if (data.user && isNewSocialUser(data.user)) {
        setCompleting("up");
        if (!(await socialGate(data.user))) { setCompleting(null); return; }
        if (await openMfaChallengeIfNeeded()) { setCompleting(null); return; }
        await applyPendingReferral();
        const dest = signedUpRef.current ? "/dashboard/api" : redirectTo;
        void goAfterSignIn(dest, () => navigate({ to: dest as "/dashboard", replace: true }));
        return;
      }
      void openMfaChallengeIfNeeded();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((evt, session) => {
      if (evt === "PASSWORD_RECOVERY") {
        recoveryModeRef.current = true;
        setMode("forgot");
        setForgotStep("reset");
        setErrorMsg(null);
        return;
      }
      if (evt === "SIGNED_IN" && session && !recoveryModeRef.current && !mfaChallenge) {
        // Check if MFA elevation is required before navigating to dashboard
        void (async () => {
          if (!(await socialGate(session.user))) return;
          const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
          if (data && data.currentLevel === "aal1" && data.nextLevel === "aal2") {
            const { data: fac } = await supabase.auth.mfa.listFactors();
            const totp = fac?.totp?.find((f) => f.status === "verified");
            if (totp) {
              // Try trusted-device fast path first.
              try {
                const uid = session.user.id;
                const savedToken = window.localStorage.getItem(TRUSTED_DEVICE_KEY(uid));
                if (savedToken) {
                  const res = await verifyTrustedDeviceFn({ data: { token: savedToken } });
                  if (res?.valid) {
                    await applyPendingReferral();
                    { const dest = signedUpRef.current ? "/dashboard/api" : redirectTo; void goAfterSignIn(dest, () => navigate({ to: dest as "/dashboard", replace: true })); }
                    return;
                  }
                  // Stale/expired — clear it so we don't retry every login.
                  window.localStorage.removeItem(TRUSTED_DEVICE_KEY(uid));
                }
              } catch { /* fall through to MFA prompt */ }

              const { data: chal, error } = await supabase.auth.mfa.challenge({ factorId: totp.id });
              if (error || !chal) {
                const msg = error?.message || "Could not start MFA challenge";
                setErrorMsg(msg);
                toast.error("Two-factor step failed", { description: msg });
                return;
              }
              setMfaChallenge({ factorId: totp.id, challengeId: chal.id, userId: session.user.id });
              setMfaCode("");
              setMfaError(null);
              setMfaResendCooldown(30);
              return;
            }
          }
          await applyPendingReferral();
          { const dest = signedUpRef.current ? "/dashboard/api" : redirectTo; void goAfterSignIn(dest, () => navigate({ to: dest as "/dashboard", replace: true })); }
        })();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate, redirectTo, applyPendingReferral, mfaChallenge, verifyTrustedDeviceFn, socialGate]);

  // Reset submitted-otp tracker when leaving OTP screens or clearing the code
  React.useEffect(() => {
    if (otpCode.length === 0) lastSubmittedOtpRef.current = "";
  }, [otpCode]);

  // Autofocus OTP inputs when the step opens
  React.useEffect(() => {
    if ((mode === "signup" && otpStep) || (mode === "signin" && signinStep === "code")) {
      otpInputRef.current?.focus();
    } else if (mode === "forgot" && forgotStep === "code") {
      recoveryOtpInputRef.current?.focus();
    }
  }, [mode, otpStep, forgotStep, signinStep]);

  // Auto-submit OTP — only when a full 6 digits are present, no error is showing,
  // no verify is already in flight, and the code matches the CURRENT OTP step.
  React.useEffect(() => {
    // Hard length guard — never fire on partial input / partial paste
    if (otpCode.length !== 6) return;
    if (!/^\d{6}$/.test(otpCode)) return;
    if (loading) return;
    if (otpError) return; // don't retry while an error is being shown
    if (lastSubmittedOtpRef.current === otpCode) return;

    const isSignupOtp = mode === "signup" && otpStep;
    const isRecoveryOtp = mode === "forgot" && forgotStep === "code";
    const isSigninCode = mode === "signin" && signinStep === "code";
    // Exactly one flow must be active for auto-submit
    if (Number(isSignupOtp) + Number(isRecoveryOtp) + Number(isSigninCode) !== 1) return;

    lastSubmittedOtpRef.current = otpCode;
    const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
    if (isSigninCode) {
      void submitSigninCode(fakeEvent);
    } else if (isSignupOtp) {
      void verifyOtp(fakeEvent);
    } else {
      void verifyRecoveryOtp(fakeEvent);
    }
  }, [otpCode, loading, mode, otpStep, forgotStep, otpError, signinStep]);

  const signInSchema = z.object({
    email: z.string().trim().email("Enter a valid email").max(255),
    password: z.string().min(1, "Password is required"),
  });
  const signUpEmailSchema = z.object({
    email: z.string().trim().email("Enter a valid email").max(255),
  });
  const signUpDetailsSchema = z.object({
    firstName: z.string().trim().min(1, "First name is required").max(50),
    lastName: z.string().trim().min(1, "Last name is required").max(50),
    password: z.string().min(8, "Password must be at least 8 characters").max(72),
  });

  const btnLoading = (label: string) => (
    <>
      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
      <span>{label}</span>
    </>
  );

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      setErrorMsg(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    if (needsTurnstile) {
      setErrorMsg("Please complete the security check.");
      return;
    }
    setLoading(true);
    let error: { message: string } | null = null;
    // Always signed in on the server: it runs the security check and, when the
    // account has email codes on, sends the code instead of opening a session.
    const res = await serverSignIn({
      data: { email: parsed.data.email, password: parsed.data.password, turnstileToken },
    }).catch(() => ({ ok: false as const, error: "Sign-in failed. Please try again.", captcha: false }));
    if (turnstileSiteKey) freshTurnstile();
    if (res.ok) {
      const set = await supabase.auth.setSession(res.session);
      error = set.error ? { message: set.error.message } : null;
    } else if ("needsEmailCode" in res && res.needsEmailCode) {
      setLoading(false);
      setCodeFor("second");
      setOtpCode("");
      setOtpError(null);
      setResendCooldown(45);
      setSigninStep("code");
      flashInfo("6-digit security code sent to your email");
      return;
    } else {
      error = { message: res.error };
    }
    setLoading(false);
    if (error) {
      const msg = error.message || "";
      const notConfirmed =
        /confirm/i.test(msg) || /verify/i.test(msg) || /not.*confirmed/i.test(msg);
      if (notConfirmed) {
        // User exists but hasn't verified — do NOT auto-resend a code.
        setErrorMsg("This email isn't verified yet. Please sign up again to get a new code.");
        return;
      }
      if (/invalid.*(login|credential)/i.test(msg)) {
        // One answer for wrong password and unknown email, so the page can't be used
        // to find out which emails have accounts.
        setErrorMsg("Email or password is incorrect. Try again, reset it with \"Forgot password\", or sign up.");
        return;
      }
      setErrorMsg(msg);
      return;
    }
    if (rememberLogin) {
      window.localStorage.setItem(SAVED_LOGIN_EMAIL_KEY, parsed.data.email);
    } else {
      window.localStorage.removeItem(SAVED_LOGIN_EMAIL_KEY);
    }
    // Do NOT navigate here — the onAuthStateChange listener above will
    // check MFA level and either open the MFA challenge or navigate.
  };

  const rememberEmail = (value: string) => {
    if (rememberLogin) window.localStorage.setItem(SAVED_LOGIN_EMAIL_KEY, value);
    else window.localStorage.removeItem(SAVED_LOGIN_EMAIL_KEY);
  };

  // One-time code sign-in: email a code instead of typing the password.
  const sendLoginCode = async () => {
    setErrorMsg(null);
    const ok = z.string().trim().email().max(255).safeParse(email);
    if (!ok.success) { setErrorMsg("Enter a valid email"); return; }
    if (needsTurnstile) { setErrorMsg("Please complete the security check."); return; }
    setLoading(true);
    const res = await sendLoginCodeFn({ data: { email: ok.data, turnstileToken } })
      .catch(() => ({ ok: false as const, error: "Could not send the code. Try again." }));
    if (turnstileSiteKey) freshTurnstile();
    setLoading(false);
    if (!res.ok) { setErrorMsg(res.error || "Could not send the code. Try again."); return; }
    setCodeFor("login");
    setOtpCode("");
    setOtpError(null);
    setResendCooldown(45);
    setSigninStep("code");
    flashInfo("If this email has an account, a 6-digit sign-in code is on its way");
  };

  const resendSigninCode = async () => {
    if (resendCooldown > 0) return;
    if (codeFor === "login") { await sendLoginCode(); return; }
    await signIn({ preventDefault: () => {} } as React.FormEvent);
  };

  const submitSigninCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError(null);
    setErrorMsg(null);
    if (!/^\d{6}$/.test(otpCode)) { setOtpError("Enter the 6-digit code from your email"); return; }
    setLoading(true);
    const res = codeFor === "login"
      ? await loginWithCode({ data: { email: email.trim(), code: otpCode } }).catch(() => ({ ok: false as const, error: "Could not sign you in. Try again." }))
      : await finishWithEmailCode({ data: { email: email.trim(), password, code: otpCode } }).catch(() => ({ ok: false as const, error: "Could not sign you in. Try again." }));
    if (!res.ok) {
      setLoading(false);
      setOtpError(res.error || "Invalid code. Try again.");
      setOtpShake(true);
      setTimeout(() => setOtpShake(false), 400);
      return;
    }
    const set = await supabase.auth.setSession(res.session);
    setLoading(false);
    if (set.error) { setErrorMsg(set.error.message); return; }
    rememberEmail(email.trim());
    // The SIGNED_IN listener checks the authenticator step and opens the next page.
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const parsed = signUpEmailSchema.safeParse({ email });
    if (!parsed.success) {
      setErrorMsg(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    if (needsTurnstile) {
      setErrorMsg("Please complete the security check.");
      return;
    }
    setLoading(true);
    const { getDeviceFingerprint } = await import("@/lib/device-fingerprint");
    const fingerprint = await getDeviceFingerprint();
    const result = await sendSignupOtp({
      data: { email: parsed.data.email, siteUrl: window.location.origin, fingerprint, turnstileToken },
    });
    if (turnstileSiteKey) freshTurnstile();
    setLoading(false);
    if (!result.ok) {
      setErrorMsg(result.error || "Could not send verification code");
      return;
    }
    toast.success("6-digit verification code sent to your email"); flashInfo("6-digit verification code sent to your email");
    setOtpStep(true);
    setOtpCode("");
    setResendCooldown(60);
  };

  const verifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setMfaError(null);
    if (!mfaChallenge) return;
    if (!/^\d{6}$/.test(mfaCode)) {
      const msg = "Enter the 6-digit code from your authenticator app.";
      setMfaError(msg);
      toast.error("Invalid code format", { description: msg });
      setMfaShake(true);
      setTimeout(() => setMfaShake(false), 500);
      mfaInputRef.current?.focus();
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.mfa.verify({
      factorId: mfaChallenge.factorId,
      challengeId: mfaChallenge.challengeId,
      code: mfaCode,
    });
    if (error) {
      setLoading(false);
      const raw = error.message || "";
      const lower = raw.toLowerCase();
      const friendly = lower.includes("expired")
        ? "That code expired. Generate a fresh one in your authenticator app."
        : lower.includes("invalid") || lower.includes("incorrect") || lower.includes("mismatch")
          ? "That code doesn't match. Try again."
          : raw || "That code doesn't match. Try again.";

      setMfaError(friendly);
      toast.error("Verification failed", { description: friendly });
      setMfaCode("");
      setMfaShake(true);
      setTimeout(() => setMfaShake(false), 500);
      setTimeout(() => mfaInputRef.current?.focus(), 30);
      return;
    }
    const elevated = await waitForMfaElevation();
    if (!elevated) {
      setLoading(false);
      const msg = "Two-factor session is still updating. Please try again.";
      setMfaError(msg);
      toast.error("Verification delayed", { description: msg });
      setMfaCode("");
      setTimeout(() => mfaInputRef.current?.focus(), 30);
      return;
    }
    const rememberedUid = mfaChallenge.userId;
    setMfaChallenge(null);
    setMfaCode("");
    // Optionally persist this device so MFA is skipped for 30 days (silent — no toast).
    if (rememberDevice && rememberedUid) {
      try {
        const ua = typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 400) : undefined;
        const res = await registerTrustedDeviceFn({ data: { userAgent: ua } });
        if (res?.token) {
          try {
            window.localStorage.setItem(TRUSTED_DEVICE_KEY(rememberedUid), res.token);
          } catch {
            // storage blocked — fail silently
          }
        }
      } catch {
        // fail silently — user is signed in either way
      }
    }

    setLoading(false);
    void goAfterSignIn(redirectTo, () => navigate({ to: redirectTo as "/dashboard", replace: true }));
  };

  const cancelMfa = async () => {
    setMfaChallenge(null);
    setMfaCode("");
    setMfaError(null);
    await supabase.auth.signOut();
  };

  const resendMfaChallenge = async () => {
    if (!mfaChallenge || mfaResendCooldown > 0 || mfaResending) return;
    setMfaResending(true);
    setMfaError(null);
    try {
      const { data: chal, error } = await supabase.auth.mfa.challenge({ factorId: mfaChallenge.factorId });
      if (error || !chal) {
        const msg = error?.message || "Could not request a new code";
        setMfaError(msg);
        toast.error("Couldn't refresh code", { description: msg });
        return;
      }
      setMfaChallenge({ factorId: mfaChallenge.factorId, challengeId: chal.id, userId: mfaChallenge.userId });
      setMfaCode("");
      setMfaResendCooldown(30);
      toast.success("New challenge ready", { description: "Enter the current 6-digit code from your authenticator app." });
      setTimeout(() => mfaInputRef.current?.focus(), 30);
    } finally {
      setMfaResending(false);
    }
  };

  // Auto-focus + auto-submit for MFA input
  React.useEffect(() => {
    if (mfaChallenge) mfaInputRef.current?.focus();
  }, [mfaChallenge]);
  React.useEffect(() => {
    if (mfaChallenge && mfaCode.length === 6 && !loading && !mfaError) {
      void verifyMfa({ preventDefault: () => {} } as React.FormEvent);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mfaCode, mfaChallenge]);

  const humanizeOtpError = (msg: string): string => {
    const m = msg.toLowerCase();
    if (m.includes("expired")) return "Code expired. Tap Resend.";
    if (m.includes("invalid") || m.includes("token") || m.includes("otp"))
      return "Invalid code. Try again.";
    if (m.includes("rate") || m.includes("too many"))
      return "Too many attempts. Please wait a moment before trying again.";
    return msg || "Verification failed. Try again.";
  };

  const triggerOtpError = (msg: string, isRecovery = false) => {
    setOtpError(humanizeOtpError(msg));
    setOtpShake(true);
    setOtpCode("");
    lastSubmittedOtpRef.current = "";
    window.setTimeout(() => setOtpShake(false), 500);
    window.setTimeout(() => {
      const el = isRecovery ? recoveryOtpInputRef.current : otpInputRef.current;
      el?.focus();
      el?.select?.();
    }, 30);
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const raw = e.clipboardData.getData("text") || "";
    const digits = raw.replace(/\D/g, "");
    const isRecovery = e.currentTarget === recoveryOtpInputRef.current;

    if (digits.length === 0) {
      triggerOtpError("Clipboard doesn't contain a numeric code.", isRecovery);
      return;
    }
    if (digits.length < 6) {
      setOtpCode(digits); // let user see what came through
      triggerOtpError(
        `Pasted only ${digits.length} digit${digits.length === 1 ? "" : "s"} — the code is 6 digits.`,
        isRecovery,
      );
      // Refocus AFTER the trigger's clear so user can retype
      window.setTimeout(() => {
        setOtpCode(digits);
      }, 0);
      return;
    }
    if (digits.length > 6) {
      triggerOtpError(
        `Pasted ${digits.length} digits — the code is 6 digits. Check your email again.`,
        isRecovery,
      );
      return;
    }
    // Exactly 6 — good; auto-submit effect will pick it up.
    setOtpError(null);
    setOtpCode(digits);
  };




  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setOtpError(null);
    if (!/^\d{6}$/.test(otpCode)) {
      triggerOtpError("Enter the 6-digit code from your email");
      return;
    }
    setLoading(true);
    const check = await checkCode({ data: { email, code: otpCode } });
    setLoading(false);
    if (!check.ok) {
      triggerOtpError(check.error || "Verification failed. Try again.");
      return;
    }
    // Code is right: next step collects name + password (code is used up there).
    setOtpStep(false);
    setSignupStep("details");
  };

  const completeSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const parsed = signUpDetailsSchema.safeParse({ firstName, lastName, password });
    if (!parsed.success) {
      setErrorMsg(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setLoading(true);
    signedUpRef.current = true;
    setCompleting("up");
    const { getDeviceFingerprint } = await import("@/lib/device-fingerprint");
    const fingerprint = await getDeviceFingerprint();
    const result = await verifySignupCode({
      data: { email, code: otpCode, password, fullName, emailUpdates, fingerprint },
    });
    if (!result.ok || !result.session) {
      setLoading(false);
      setCompleting(null);
      signedUpRef.current = false;
      const msg = result.error || "Could not complete sign up. Try again.";
      // Expired / used-up code: send the user back to enter a fresh one.
      if (/code|attempts/i.test(msg)) {
        setOtpCode("");
        lastSubmittedOtpRef.current = "";
        setSignupStep("form");
        setOtpStep(true);
        setOtpError(humanizeOtpError(msg));
      } else {
        setErrorMsg(msg);
      }
      return;
    }
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: result.session.access_token,
      refresh_token: result.session.refresh_token,
    });
    setLoading(false);
    if (sessionError) {
      signedUpRef.current = false;
      setCompleting(null);
      setErrorMsg(sessionError.message);
      return;
    }
    
    // Fire-and-forget welcome email
    void sendWelcomeEmail({
      data: { fullName, siteUrl: window.location.origin },
    }).catch(() => {});
    // Mirror the welcome email as an in-app notification
    void createUserNotification({
      data: {
        type: "welcome",
        title: `Welcome to Jenvu${fullName ? ", " + fullName.split(" ")[0] : ""} 👋`,
        body: "Your account is ready. Explore the Terminal, Chat and API.",
        dedupeKey: `welcome-${email.toLowerCase()}`,
      },
    });
    // Deliver welcome message to the user's internal @jenvu.email inbox from support@
    void import("@/lib/system-mail.functions").then((m) =>
      m.sendWelcomeSystemMail({ data: { fullName } }).catch(() => {}),
    );
  };


  const resendCode = async () => {
    if (resendCooldown > 0) return;
    setErrorMsg(null);
    setResending(true);
    const { getDeviceFingerprint } = await import("@/lib/device-fingerprint");
    const fingerprint = await getDeviceFingerprint();
    const result = await sendSignupOtp({
      data: { email, siteUrl: window.location.origin, fingerprint },
    });
    setResending(false);
    if (!result.ok) {
      setErrorMsg(result.error || "Could not send code");
      return;
    }
    toast.success("New 6-digit code sent"); flashInfo("New 6-digit code sent");
    setResendCooldown(60);
  };

  const forgotEmailSchema = z.object({
    email: z.string().trim().email("Enter a valid email").max(255),
  });

  const sendResetLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const parsed = forgotEmailSchema.safeParse({ email });
    if (!parsed.success) {
      setErrorMsg(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setLoading(true);
    const result = await sendRecoveryOtp({
      data: { email: parsed.data.email, siteUrl: window.location.origin },
    });
    setLoading(false);
    if (!result.ok) {
      setErrorMsg(result.error || "Could not send reset code");
      return;
    }
    toast.success("6-digit reset code sent to your email"); flashInfo("6-digit reset code sent to your email");
    setForgotStep("code");
    setOtpCode("");
    setResendCooldown(60);
  };

  const verifyRecoveryOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setOtpError(null);
    if (!/^\d{6}$/.test(otpCode)) {
      triggerOtpError("Enter the 6-digit code from your email", true);
      return;
    }
    setLoading(true);
    recoveryModeRef.current = true;
    const result = await verifyRecoveryCode({
      data: { email, code: otpCode, siteUrl: window.location.origin },
    });
    if (!result.ok || !result.session) {
      setLoading(false);
      triggerOtpError(result.error || "Verification failed. Try again.", true);
      return;
    }
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: result.session.access_token,
      refresh_token: result.session.refresh_token,
    });
    setLoading(false);
    if (sessionError) {
      triggerOtpError(sessionError.message, true);
      return;
    }
    setForgotStep("reset");
  };


  const resendResetCode = async () => {
    if (resendCooldown > 0) return;
    setErrorMsg(null);
    setResending(true);
    const result = await sendRecoveryOtp({
      data: { email, siteUrl: window.location.origin },
    });
    setResending(false);
    if (!result.ok) {
      setErrorMsg(result.error || "Could not send code");
      return;
    }
    toast.success("New 6-digit code sent"); flashInfo("New 6-digit code sent");
    setResendCooldown(60);
  };


  const updatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (newPassword.length < 8 || newPassword.length > 72) {
      setErrorMsg("Password must be 8-72 characters");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (error) {
      setErrorMsg(error.message);
      return;
    }
    toast.success("Password updated"); flashInfo("Password updated", "password");
    recoveryModeRef.current = false;
    setNewPassword("");
    void goAfterSignIn(redirectTo, () => navigate({ to: redirectTo as "/dashboard", replace: true }));
  };



  const goSignup = () => { setMode("signup"); setSignupStep("choose"); setOtpStep(false); setErrorMsg(null); };
  const goSignin = () => { setMode("signin"); setSigninStep("choose"); setErrorMsg(null); };

  const pill = "inline-flex h-[42px] w-full items-center justify-center gap-2.5 rounded-full text-[15px] font-medium transition disabled:cursor-not-allowed disabled:opacity-60";
  const pillDark = `${pill} bg-foreground text-background hover:bg-foreground/90`;
  const pillLight = `${pill} border border-border bg-background text-foreground hover:bg-muted`;
  const field = "h-[46px] w-full rounded-full border border-border bg-background px-5 text-[15px] text-foreground outline-none transition focus:border-foreground focus:ring-1 focus:ring-foreground";
  const label = "mb-1.5 block text-[14px] font-medium text-foreground";

  const errorBox = errorMsg ? (
    <div role="alert" className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-[13px] text-red-700">
      <span className="mt-[6px] inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
      <span className="leading-snug">{errorMsg}</span>
    </div>
  ) : null;

  const terms = (
    <p className="text-center text-[14px] leading-relaxed text-muted-foreground">
      By continuing, you agree to Jenvu's
      <br />
      <Link to="/terms" className="underline underline-offset-2 hover:text-foreground">Terms of Service</Link> and{" "}
      <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground">Privacy Policy</Link>.
    </p>
  );

  const socialButton = (provider: SocialProvider, verb: string, variant: "google-dark" | "google-light" | "light") => {
    const busy = socialBusy === provider;
    const name = provider === "google" ? "Google" : "Apple";
    const cls =
      variant === "google-dark"
        ? `${pill} border border-[#8E918F] bg-[#131314] text-[#E3E3E3] hover:opacity-90`
        : variant === "google-light"
          ? `${pill} border border-[#747775] bg-[#FFFFFF] text-[#1F1F1F] hover:bg-[#F8F8F8]`
          : pillLight;
    return (
      <button type="button" onClick={() => void socialSignIn(provider)} disabled={!!socialBusy || loading} className={cls}>
        {busy ? (
          <Loader2 className="h-[18px] w-[18px] animate-spin" aria-hidden="true" />
        ) : provider === "google" ? (
          <GoogleLogo />
        ) : (
          <AppleLogo />
        )}
        <span>{verb} with {name}</span>
      </button>
    );
  };

  const otpBoxes = (ref: React.RefObject<HTMLInputElement | null>, errId: string) => (
    <div className="flex flex-col items-center">
      <div className={`relative ${otpShake ? "animate-otp-shake" : ""}`}>
        <div className="flex items-center gap-3" aria-hidden="true">
          {[0, 1].map((g) => (
            <React.Fragment key={g}>
              {g === 1 && <span className="h-px w-4 bg-border" />}
              <div className={`flex overflow-hidden rounded-xl border ${otpError ? "border-red-400" : "border-border"} bg-muted/40`}>
                {[0, 1, 2].map((j) => {
                  const i = g * 3 + j;
                  const active = otpCode.length === i;
                  return (
                    <span
                      key={i}
                      className={`flex h-[46px] w-[42px] items-center justify-center text-[20px] font-medium ${j > 0 ? "border-l border-border" : ""} ${otpError ? "text-red-600" : "text-foreground"} ${active ? "bg-background ring-2 ring-inset ring-foreground/70" : ""}`}
                    >
                      {otpCode[i] ?? ""}
                    </span>
                  );
                })}
              </div>
            </React.Fragment>
          ))}
        </div>
        <input
          ref={ref}
          onPaste={handleOtpPaste}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          required
          disabled={loading}
          aria-label="6-digit code"
          aria-invalid={otpError ? true : undefined}
          aria-describedby={otpError ? errId : undefined}
          value={otpCode}
          onChange={(e) => { setOtpError(null); setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6)); }}
          className="absolute inset-0 h-full w-full cursor-text bg-transparent text-transparent caret-transparent opacity-0 outline-none"
        />
      </div>
      {otpError && (
        <p id={errId} className="mt-2 text-[13px] text-red-600" role="alert" aria-live="polite">
          {otpError}
        </p>
      )}
    </div>
  );

  const resendLine = (onResend: () => void) => (
    <p className="text-center text-[14px] text-muted-foreground">
      Didn't receive a code?{" "}
      <button
        type="button"
        onClick={onResend}
        disabled={loading || resending || resendCooldown > 0}
        className="font-medium text-foreground hover:underline disabled:font-normal disabled:text-muted-foreground disabled:no-underline"
      >
        {resending ? "Sending…" : resendCooldown > 0 ? `Resend (${resendCooldown})` : "Resend"}
      </button>
    </p>
  );

  const passwordInput = (id: string, value: string, set: (v: string) => void, shown: boolean, toggle: () => void, auto: string) => (
    <div className="relative">
      <input
        type={shown ? "text" : "password"}
        id={id}
        required
        autoComplete={auto}
        value={value}
        onChange={(e) => set(e.target.value)}
        className={`${field} pr-12`}
      />
      <Button type="button" variant="ghost" size="icon" onClick={toggle} aria-label={shown ? "Hide password" : "Show password"} className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full text-muted-foreground hover:bg-transparent hover:text-foreground">
        {shown ? <EyeOff className="h-[17px] w-[17px]" /> : <Eye className="h-[17px] w-[17px]" />}
      </Button>
    </div>
  );

  const title = mfaChallenge
    ? "Two-factor authentication"
    : mode === "forgot"
      ? forgotStep === "code" ? "Check your email" : forgotStep === "reset" ? "Set a new password" : "Reset your password"
      : mode === "signup"
        ? otpStep ? "Verify your email" : signupStep === "details" ? "Complete your sign up" : signupStep === "form" ? "Sign up with your email" : "Create your account"
        : signinStep === "choose" ? "Log into your account" : signinStep === "code" ? "Check your email" : "Log in with your email";

  if (completing && !mfaChallenge && !errorMsg) {
    return (
      <div className={`flex min-h-dvh w-full flex-col items-center justify-center bg-background px-6 text-center text-foreground ${SANS} antialiased`} role="status" aria-live="polite">
        <span aria-hidden className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-foreground" />
        <h1 className="mt-5 text-[22px] font-normal tracking-[-0.02em] sm:text-[24px]">
          {completing === "up" ? "Completing sign-up" : "Completing sign-in"}
        </h1>
        <p className="mt-2 text-[14px] text-muted-foreground">Verifying your device to keep your account secure…</p>
      </div>
    );
  }

  return (
    <div className={`min-h-dvh w-full bg-background text-foreground ${SANS} antialiased selection:bg-foreground selection:text-background`}>
      <header className="flex items-center justify-between px-5 py-4 sm:px-6">
        <Link to="/" aria-label="Jenvu home" className="text-foreground">
          <JenvuMark className="h-7 w-7" />
        </Link>
        <div className="flex items-center gap-2 text-[14px] text-muted-foreground">
          <span className="hidden sm:inline">You are signing into</span>
          <span className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-foreground">
            Jenvu <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          </span>
        </div>
      </header>

      <main className="flex w-full justify-center px-6 pb-16 pt-10 sm:pt-[72px]">
        <div className="auth-zoom-desktop w-full max-w-[386px]">
          <h1 className="text-center text-[28px] font-normal tracking-[-0.02em] text-foreground sm:text-[30px]">{title}</h1>

          {emailChangedBanner && (
            <div role="status" className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              <Mail className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="leading-snug">
                <div className="font-medium">Email change complete</div>
                <div className="text-emerald-800">
                  Please sign in again with <span className="font-semibold">{emailChangedBanner}</span>.
                </div>
              </div>
            </div>
          )}

          {mfaChallenge ? (
            <form onSubmit={verifyMfa} className="mt-5 space-y-4">
              <p className="text-center text-[14px] leading-relaxed text-muted-foreground">
                Enter the 6-digit code from your authenticator app to continue.
              </p>
              <input
                ref={mfaInputRef}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
                disabled={loading}
                aria-label="Authenticator code"
                aria-invalid={mfaError ? true : undefined}
                value={mfaCode}
                onChange={(e) => { setMfaError(null); setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6)); }}
                className={`${field} text-center text-[22px] tracking-[0.5em] ${mfaError ? "border-red-400 text-red-600" : ""} ${mfaShake ? "animate-otp-shake" : ""}`}
                placeholder="••••••"
              />
              {mfaError && <p className="text-center text-[13px] text-red-600" role="alert" aria-live="polite">{mfaError}</p>}
              <label className="flex cursor-pointer select-none items-center justify-center gap-2 text-[13px] text-muted-foreground">
                <input type="checkbox" checked={rememberDevice} onChange={(e) => setRememberDevice(e.target.checked)} disabled={loading} className="h-4 w-4 rounded border-border accent-foreground" />
                <span>Remember this device for 30 days</span>
              </label>
              <button type="submit" disabled={loading || mfaCode.length !== 6} className={pillDark}>
                {loading ? btnLoading("Verifying…") : "Verify"}
              </button>
              <button type="button" onClick={resendMfaChallenge} disabled={loading || mfaResending || mfaResendCooldown > 0} className={pillLight}>
                {mfaResending ? "Requesting…" : mfaResendCooldown > 0 ? `New code in ${mfaResendCooldown}s` : "New code"}
              </button>
              <button type="button" onClick={cancelMfa} disabled={loading} className="block w-full text-center text-[14px] text-muted-foreground hover:text-foreground">
                Sign in with a different account
              </button>
            </form>
          ) : mode === "signup" ? (
            otpStep ? (
              <form onSubmit={verifyOtp} className="mt-4 space-y-5">
                <p className="text-center text-[15px] leading-relaxed text-muted-foreground">
                  We've emailed a one time security code to <span className="text-foreground">{email}</span>. It should arrive in the next few minutes. If you don't see it, check your spam folder. Enter it below:
                </p>
                {otpBoxes(otpInputRef, "otp-error")}
                {resendLine(resendCode)}
                {errorBox}
                <div className="space-y-3">
                  <button type="submit" disabled={loading} className={pillDark}>
                    {loading ? btnLoading("Confirming…") : "Confirm email"}
                  </button>
                  <button type="button" onClick={() => { setOtpStep(false); setErrorMsg(null); setOtpError(null); }} disabled={loading} className={pillLight}>
                    Go back
                  </button>
                </div>
                <div className="pt-3">{terms}</div>
              </form>
            ) : signupStep === "details" ? (
              <form onSubmit={completeSignup} className="mt-6 space-y-4">
                <div className="flex justify-center">
                  <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-border px-3.5 py-1.5 text-[14px] text-foreground">
                    <Mail className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="truncate">{email}</span>
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="signup-first" className={label}>First name</label>
                    <input type="text" id="signup-first" required autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={field} autoFocus />
                  </div>
                  <div>
                    <label htmlFor="signup-last" className={label}>Last name</label>
                    <input type="text" id="signup-last" required autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} className={field} />
                  </div>
                </div>
                <div>
                  <label htmlFor="signup-password" className={label}>Password</label>
                  {passwordInput("signup-password", password, setPassword, showPassword, () => setShowPassword((v) => !v), "new-password")}
                  {flashInline("password")}
                </div>
                <label className="flex cursor-pointer select-none items-start gap-2.5 text-[14px] leading-snug text-muted-foreground">
                  <input type="checkbox" checked={emailUpdates} onChange={(e) => setEmailUpdates(e.target.checked)} disabled={loading} className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-foreground" />
                  <span>Receive email updates on new features and offers</span>
                </label>
                {errorBox}
                <div className="space-y-3 pt-1">
                  <button type="submit" disabled={loading} className={pillDark}>
                    {loading ? btnLoading("Creating account…") : "Complete sign up"}
                  </button>
                  <button type="button" onClick={() => { setSignupStep("form"); setOtpStep(true); setErrorMsg(null); }} disabled={loading} className={pillLight}>
                    Go back
                  </button>
                </div>
              </form>
            ) : signupStep === "form" ? (
              <form onSubmit={signUp} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="signup-email" className={label}>Email</label>
                  <input type="email" id="signup-email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
                  {flashInline("email")}
                </div>
                {turnstileSiteKey && <TurnstileWidget siteKey={turnstileSiteKey} onToken={setTurnstileToken} resetKey={turnstileReset} />}
                {errorBox}
                <div className="space-y-3 pt-1">
                  <button type="submit" disabled={loading} className={pillDark}>
                    {loading ? btnLoading("Sending code…") : "Sign up"}
                  </button>
                  <button type="button" onClick={() => { setSignupStep("choose"); setErrorMsg(null); }} disabled={loading} className={pillLight}>
                    Go back
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-7 space-y-7">
                {terms}
                <div className="space-y-3">
                  {socialButton("google", "Sign up", "google-light")}
                  <div className="mx-auto h-px w-[76%] bg-border" />
                  <button type="button" onClick={() => { setSignupStep("form"); setErrorMsg(null); }} disabled={!!socialBusy} className={pillLight}>
                    <Mail className="h-[18px] w-[18px]" aria-hidden="true" />
                    <span>Sign up with email</span>
                  </button>
                </div>
                <p className="text-center text-[13px] leading-snug text-muted-foreground">
                  Every new account starts on Free with $10 API credit a month.
                </p>
                {errorBox}
              </div>
            )
          ) : mode === "forgot" ? (
            forgotStep === "email" ? (
              <form onSubmit={sendResetLink} className="mt-6 space-y-4">
                <p className="text-center text-[15px] text-muted-foreground">We'll email you a 6-digit reset code.</p>
                <div>
                  <label htmlFor="forgot-email" className={label}>Email</label>
                  <input type="email" id="forgot-email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
                  {flashInline("email")}
                </div>
                {errorBox}
                <div className="space-y-3 pt-1">
                  <button type="submit" disabled={loading} className={pillDark}>
                    {loading ? btnLoading("Sending…") : "Send code"}
                  </button>
                  <button type="button" onClick={() => { setMode("signin"); setSigninStep(email ? "password" : "email"); setErrorMsg(null); }} className={pillLight}>
                    Go back
                  </button>
                </div>
              </form>
            ) : forgotStep === "code" ? (
              <form onSubmit={verifyRecoveryOtp} className="mt-4 space-y-5">
                <p className="text-center text-[15px] leading-relaxed text-muted-foreground">
                  We've emailed a reset code to <span className="text-foreground">{email}</span>. Enter it below:
                </p>
                {otpBoxes(recoveryOtpInputRef, "otp-error-recovery")}
                {resendLine(resendResetCode)}
                {errorBox}
                <div className="space-y-3">
                  <button type="submit" disabled={loading} className={pillDark}>
                    {loading ? btnLoading("Verifying…") : "Verify code"}
                  </button>
                  <button type="button" onClick={() => { setForgotStep("email"); setErrorMsg(null); setOtpError(null); }} disabled={loading} className={pillLight}>
                    Go back
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={updatePassword} className="mt-6 space-y-4">
                <p className="text-center text-[15px] text-muted-foreground">Code verified. Choose a new password (8+ characters).</p>
                <div>
                  <label htmlFor="new-password" className={label}>New password</label>
                  {passwordInput("new-password", newPassword, setNewPassword, showNewPassword, () => setShowNewPassword((v) => !v), "new-password")}
                  {flashInline("password")}
                </div>
                {errorBox}
                <button type="submit" disabled={loading} className={pillDark}>
                  {loading ? btnLoading("Updating…") : "Update password"}
                </button>
              </form>
            )
          ) : signinStep === "choose" ? (
            <div className="mt-8 space-y-3">
              {socialButton("google", "Login", "google-light")}
              <button type="button" onClick={() => { setSigninStep("email"); setErrorMsg(null); }} disabled={!!socialBusy} className={pillLight}>
                <Mail className="h-[18px] w-[18px]" aria-hidden="true" />
                <span>Login with email</span>
              </button>
              {errorBox && <div className="pt-2">{errorBox}</div>}
            </div>
          ) : signinStep === "email" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const ok = z.string().trim().email().max(255).safeParse(email);
                if (!ok.success) { setErrorMsg("Enter a valid email"); return; }
                setErrorMsg(null);
                setSigninStep("password");
              }}
              className="mt-6 space-y-4"
            >
              <div>
                <label htmlFor="signin-email" className={label}>Email</label>
                <input type="email" id="signin-email" required autoFocus autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
                {flashInline("email")}
              </div>
              {errorBox}
              <div className="space-y-3 pt-1">
                <button type="submit" className={pillDark}>Next</button>
                <button type="button" onClick={() => { setSigninStep("choose"); setErrorMsg(null); }} className={pillLight}>Go back</button>
              </div>
            </form>
          ) : signinStep === "code" ? (
            <form onSubmit={submitSigninCode} className="mt-4 space-y-5">
              <p className="text-center text-[15px] leading-relaxed text-muted-foreground">
                {codeFor === "login"
                  ? <>If <span className="text-foreground">{email}</span> has a Jenvu account, we've emailed it a one-time sign-in code. Enter it below:</>
                  : <>Your account asks for an email code. We've sent a 6-digit security code to <span className="text-foreground">{email}</span>. Enter it below:</>}
              </p>
              {otpBoxes(otpInputRef, "signin-code-error")}
              {turnstileSiteKey && <TurnstileWidget siteKey={turnstileSiteKey} onToken={setTurnstileToken} resetKey={turnstileReset} />}
              {resendLine(() => void resendSigninCode())}
              {errorBox}
              <div className="space-y-3">
                <button type="submit" disabled={loading || otpCode.length !== 6} className={pillDark}>
                  {loading ? btnLoading("Signing in…") : "Continue"}
                </button>
                <button type="button" onClick={() => { setSigninStep("password"); setOtpCode(""); setOtpError(null); setErrorMsg(null); }} disabled={loading} className={pillLight}>
                  Go back
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={signIn} className="mt-6 space-y-4">
              <div>
                <label htmlFor="signin-email-ro" className={label}>Email</label>
                <input type="email" id="signin-email-ro" readOnly autoComplete="username" value={email} onClick={() => setSigninStep("email")} className="h-[46px] w-full cursor-pointer rounded-full border border-transparent bg-muted px-5 text-[15px] text-foreground outline-none" />
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="signin-password" className="text-[14px] font-medium text-foreground">Password</label>
                  <button
                    type="button"
                    onClick={() => { setMode("forgot"); setForgotStep("email"); setErrorMsg(null); setOtpCode(""); }}
                    className="text-[13px] text-muted-foreground hover:text-foreground"
                  >
                    Forgot your password?
                  </button>
                </div>
                {passwordInput("signin-password", password, setPassword, showPassword, () => setShowPassword((v) => !v), "current-password")}
                {flashInline("password")}
              </div>
              <label className="flex cursor-pointer select-none items-center gap-2 text-[14px] text-foreground">
                <input type="checkbox" checked={rememberLogin} onChange={(event) => setRememberLogin(event.target.checked)} className="h-4 w-4 rounded border-border accent-foreground" />
                <span>Save email on this device</span>
              </label>
              {turnstileSiteKey && <TurnstileWidget siteKey={turnstileSiteKey} onToken={setTurnstileToken} resetKey={turnstileReset} />}
              {errorBox}
              <div className="space-y-3 pt-1">
                <button type="submit" disabled={loading} className={pillDark}>
                  {loading ? btnLoading("Logging in…") : "Login"}
                </button>
                <button type="button" onClick={() => void sendLoginCode()} disabled={loading} className={pillLight}>
                  <Mail className="h-[18px] w-[18px]" aria-hidden="true" />
                  <span>Email me a one-time code</span>
                </button>
                <button type="button" onClick={() => { setSigninStep("email"); setErrorMsg(null); }} disabled={loading} className={pillLight}>
                  Go back
                </button>
              </div>
            </form>
          )}

          {!mfaChallenge && mode === "signin" && (
            <p className="mt-7 text-center text-[15px] text-muted-foreground">
              Don't have an account?{" "}
              <button type="button" onClick={goSignup} className="font-medium text-foreground hover:underline">Sign up</button>
            </p>
          )}
          {!mfaChallenge && mode === "signup" && !otpStep && signupStep !== "details" && (
            <p className="mt-7 text-center text-[15px] text-muted-foreground">
              Already have an account?{" "}
              <button type="button" onClick={goSignin} className="font-medium text-foreground hover:underline">Sign in</button>
            </p>
          )}
          {!mfaChallenge && mode === "signin" && signinStep === "choose" && <div className="mt-8">{terms}</div>}
        </div>
      </main>
    </div>
  );
}

function GoogleLogo() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" className="shrink-0">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" />
    </svg>
  );
}

function AppleLogo() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true" className="shrink-0">
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
    </svg>
  );
}
