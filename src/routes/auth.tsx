import * as React from "react";
import { goAfterSignIn, restoreSharedSession } from "@/lib/cross-domain-session";
import { createFileRoute, useNavigate, Link, redirect } from "@tanstack/react-router";
import { oauthReturnPath } from "@/lib/oauth-return-path";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Mail, Lock, ArrowRight, User, Loader2, Eye, EyeOff } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import {
  confirmRecoveryOtp,
  confirmSignupOtp,
  requestRecoveryOtp,
  requestSignupOtp,
} from "@/lib/custom-auth.functions";
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
    }

    let { data } = await supabase.auth.getUser();
    if (!data.user && (await restoreSharedSession())) data = (await supabase.auth.getUser()).data;
    if (data.user) {
      // If MFA elevation is required but not yet completed, stay on /auth so
      // the user can enter their 6-digit code — do NOT redirect to /dashboard,
      // which would just bounce back here (redirect loop).
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal && aal.currentLevel === "aal1" && aal.nextLevel === "aal2") return;
      const dest = sanitizeRedirect(search.redirect);
      if (typeof window !== "undefined") {
        if (await goAfterSignIn(dest, () => undefined)) return;
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
          "Sign in to your Jenvu account to access the AI-powered trading terminal, live ICT/SMC analysis and reviewed Gold signals.",
      },
      { name: "robots", content: "noindex, follow" },
      { property: "og:title", content: "Sign in to your Desk" },
      { property: "og:description", content: "Access your AI-powered Gold trading terminal and account dashboard." },
      { property: "og:url", content: "https://auth.jenvu.com/sign-in" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Sign in to your Desk" },
      { name: "twitter:description", content: "Access your AI-powered Gold trading terminal and account dashboard." },
    ],
    links: [{ rel: "canonical", href: "https://auth.jenvu.com/sign-in" }],
  }),
  component: AuthPage,
});


const MONO = "font-['JetBrains_Mono',ui-monospace,monospace]";
const SANS = "font-['Google_Sans','Product_Sans','Poppins',system-ui,sans-serif]";

function AuthPage() {
  const navigate = useNavigate();
  const sendSignupOtp = useServerFn(requestSignupOtp);
  const verifySignupCode = useServerFn(confirmSignupOtp);
  const sendRecoveryOtp = useServerFn(requestRecoveryOtp);
  const verifyRecoveryCode = useServerFn(confirmRecoveryOtp);
  const search = Route.useSearch();
  const redirectTo = sanitizeRedirect(search.redirect);
  const [mode, setMode] = React.useState<"signin" | "signup" | "forgot">(
    search.mode === "signup" ? "signup" : "signin",
  );

  const [fullName, setFullName] = React.useState("");
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
    void openMfaChallengeIfNeeded();
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
                    void goAfterSignIn(redirectTo, () => navigate({ to: redirectTo as "/dashboard", replace: true }));
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
          void goAfterSignIn(redirectTo, () => navigate({ to: redirectTo as "/dashboard", replace: true }));
        })();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate, redirectTo, applyPendingReferral, mfaChallenge, verifyTrustedDeviceFn]);

  // Reset submitted-otp tracker when leaving OTP screens or clearing the code
  React.useEffect(() => {
    if (otpCode.length === 0) lastSubmittedOtpRef.current = "";
  }, [otpCode]);

  // Autofocus OTP inputs when the step opens
  React.useEffect(() => {
    if (mode === "signup" && otpStep) {
      otpInputRef.current?.focus();
    } else if (mode === "forgot" && forgotStep === "code") {
      recoveryOtpInputRef.current?.focus();
    }
  }, [mode, otpStep, forgotStep]);

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
    // Exactly one flow must be active for auto-submit
    if (isSignupOtp === isRecoveryOtp) return;

    lastSubmittedOtpRef.current = otpCode;
    const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
    if (isSignupOtp) {
      void verifyOtp(fakeEvent);
    } else {
      void verifyRecoveryOtp(fakeEvent);
    }
  }, [otpCode, loading, mode, otpStep, forgotStep, otpError]);

  const signInSchema = z.object({
    email: z.string().trim().email("Enter a valid email").max(255),
    password: z.string().min(1, "Password is required"),
  });
  const signUpSchema = z.object({
    fullName: z.string().trim().min(1, "Name is required").max(100),
    email: z.string().trim().email("Enter a valid email").max(255),
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
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    setLoading(false);
    if (error) {
      const msg = error.message || "";
      const notConfirmed =
        /confirm/i.test(msg) || /verify/i.test(msg) || /not.*confirmed/i.test(msg);
      if (notConfirmed) {
        // User exists but hasn't verified — do NOT auto-resend a code.
        // Treat as invalid until they complete signup properly.
        setErrorMsg("Invalid credentials. Please sign up.");
        return;
      }
      if (/invalid.*(login|credential)/i.test(msg)) {
        setErrorMsg("Invalid credentials. Please sign up.");
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

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const parsed = signUpSchema.safeParse({ fullName, email, password });
    if (!parsed.success) {
      setErrorMsg(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setLoading(true);
    const { getDeviceFingerprint } = await import("@/lib/device-fingerprint");
    const fingerprint = await getDeviceFingerprint();
    const result = await sendSignupOtp({
      data: { ...parsed.data, siteUrl: window.location.origin, fingerprint },
    });
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
    const { getDeviceFingerprint } = await import("@/lib/device-fingerprint");
    const fingerprint = await getDeviceFingerprint();
    const result = await verifySignupCode({ data: { email, code: otpCode, password, fingerprint } });
    if (!result.ok || !result.session) {
      setLoading(false);
      triggerOtpError(result.error || "Verification failed. Try again.");
      return;
    }
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: result.session.access_token,
      refresh_token: result.session.refresh_token,
    });
    setLoading(false);
    if (sessionError) {
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
        body: "Your account is ready. Explore signals, dashboard, and referrals.",
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
      data: { email, password, fullName, siteUrl: window.location.origin, fingerprint },
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




  return (
    <div className={`min-h-dvh w-full bg-white text-zinc-900 ${SANS} antialiased selection:bg-zinc-900 selection:text-white lg:flex`}>

      {/* LEFT — form column */}
      <div className="flex min-h-dvh w-full flex-col lg:w-1/2 lg:items-end">
        <div className="mx-auto w-full max-w-[384px] px-6 pt-8 sm:pt-12 lg:mx-0 lg:mr-16 lg:px-0 xl:mr-24">
          <Link to="/" aria-label="Jenvu home" className="inline-flex items-center gap-2.5">
            <img src="/favicon.png" alt="Jenvu" className="h-7 w-7 object-contain" />
            <span className="text-[15px] text-gc-ink-muted">Try Jenvu for free</span>
          </Link>
        </div>

        <div className="flex w-full flex-1 items-start justify-center px-6 pb-16 pt-10 lg:justify-end lg:px-0 lg:pt-12">
          <div className="w-full max-w-[384px] lg:mr-16 xl:mr-24">
            <h1 className="text-left text-[26px] font-semibold tracking-tight text-zinc-900">
              {mfaChallenge
                ? "Two-factor authentication"
                : mode === "forgot"
                  ? "Reset your password"
                  : mode === "signup"
                    ? "Create your Jenvu account"
                    : "Sign in to Jenvu"}
            </h1>

                  {emailChangedBanner && (
                    <div
                      role="status"
                      className="mt-4 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
                    >
                      <Mail className="mt-0.5 h-4 w-4 shrink-0" />
                      <div className="leading-snug">
                        <div className="font-medium">Email change complete</div>
                        <div className="text-emerald-800">
                          Please sign in again with{" "}
                          <span className="font-semibold">{emailChangedBanner}</span>.
                        </div>
                      </div>
                    </div>
                  )}





                  {mfaChallenge ? (
                    <form onSubmit={verifyMfa} className="mt-4 space-y-3">
                      <div className={`rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-[13px] text-zinc-700 ${MONO}`}>
                        <p className="leading-relaxed">
                          Two-factor authentication is enabled. Enter the 6-digit code from your authenticator app to continue.
                        </p>
                      </div>
                      <div>
                        <label className="mb-2 block text-[14px] font-medium text-zinc-900">
                          Authenticator Code
                        </label>
                        <input
                          ref={mfaInputRef}
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={6}
                          required
                          disabled={loading}
                          aria-invalid={mfaError ? true : undefined}
                          value={mfaCode}
                          onChange={(e) => { setMfaError(null); setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6)); }}
                          className={`w-full rounded-xl border bg-white px-4 py-3 text-center text-2xl tracking-[0.6em] outline-none transition placeholder:text-zinc-300 ${MONO} ${mfaError ? "border-red-400 text-red-600 focus:border-red-500" : "border-zinc-200 text-zinc-900 focus:border-zinc-900"} ${mfaShake ? "animate-otp-shake" : ""}`}
                          placeholder="••••••"
                        />
                        {mfaError && (
                          <p className={`mt-2 text-[13px] text-red-600 md:whitespace-nowrap`} role="alert" aria-live="polite">
                            {mfaError}
                          </p>
                        )}

                      </div>

                      <label className={`flex items-center gap-2 text-xs text-zinc-600 select-none cursor-pointer ${MONO}`}>
                        <input
                          type="checkbox"
                          checked={rememberDevice}
                          onChange={(e) => setRememberDevice(e.target.checked)}
                          disabled={loading}
                          className="h-3.5 w-3.5 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                        />
                        <span>Remember this device for 30 days</span>
                      </label>


                      <button
                        type="submit"
                        disabled={loading || mfaCode.length !== 6}
                        className="group w-full rounded-lg bg-gc-blue px-5 py-3 text-sm font-medium text-gc-on-blue hover:bg-gc-blue-hover transition inline-flex items-center justify-center gap-2 disabled:opacity-60"
                      >
                        {loading ? btnLoading("Verifying...") : (<>Verify <ArrowRight className={`w-4 h-4 group-hover:translate-x-0.5 transition ${MONO}`} /></>)}
                      </button>

                      <div className="flex items-center justify-between pt-2 gap-3">
                        <button
                          type="button"
                          onClick={cancelMfa}
                          disabled={loading}
                          className="text-xs text-zinc-500 hover:text-zinc-900 transition disabled:opacity-40"
                        >
                          ← Sign in with a different account
                        </button>
                        <button
                          type="button"
                          onClick={resendMfaChallenge}
                          disabled={loading || mfaResending || mfaResendCooldown > 0}
                          className={`text-xs text-zinc-500 hover:text-zinc-900 transition disabled:opacity-40 ${MONO}`}
                          aria-live="polite"
                        >
                          {mfaResending
                            ? "Requesting…"
                            : mfaResendCooldown > 0
                              ? `Resend in ${mfaResendCooldown}s`
                              : "Resend code"}
                        </button>
                      </div>
                    </form>
                  ) : mode === "signup" ? (
                    otpStep ? (
                      <form onSubmit={verifyOtp} className="mt-4 space-y-3">
                        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 sm:px-4 py-3 text-[13px] sm:text-[14px] text-zinc-700" style={{ fontFamily: "'Google Sans Flex','Google Sans',sans-serif" }}>
                          <p className="leading-relaxed">
                            <span className="sm:hidden">Code sent to <span className="font-semibold text-zinc-900 break-all">{email}</span>.<br />Enter it to continue.</span>
                            <span className="hidden sm:inline">We sent a 6-digit code to <span className="font-semibold text-zinc-900">{email}</span>. Enter it below to activate your desk.</span>
                          </p>
                        </div>
                        <div>
                          <label className="mb-2 block text-[14px] font-medium text-zinc-900">
                            Verification Code
                          </label>
                          <input
                            ref={otpInputRef}
                            onPaste={handleOtpPaste}
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            maxLength={6}
                            required
                            disabled={loading}
                            aria-invalid={otpError ? true : undefined}
                            aria-describedby={otpError ? "otp-error" : undefined}
                            value={otpCode}
                            onChange={(e) => { setOtpError(null); setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6)); }}
                            className={`w-full rounded-xl border bg-white px-4 py-3 text-center text-2xl tracking-[0.6em] outline-none transition placeholder:text-zinc-300 ${MONO} ${otpError ? "border-red-400 text-red-600 focus:border-red-500" : "border-zinc-200 text-zinc-900 focus:border-zinc-900"} ${otpShake ? "animate-otp-shake" : ""}`}
                            placeholder="••••••"
                          />
                          {otpError && (
                            <p id="otp-error" className={`mt-2 text-[13px] text-red-600`} role="alert" aria-live="polite">
                              {otpError}
                            </p>
                          )}
                        </div>


                        <button
                          type="submit"
                          disabled={loading}
                          className="group w-full rounded-lg bg-gc-blue px-5 py-3 text-sm font-medium text-gc-on-blue hover:bg-gc-blue-hover transition inline-flex items-center justify-center gap-2 disabled:opacity-60"
                        >
                          {loading ? btnLoading("Verifying...") : (<>Verify & Continue <ArrowRight className={`w-4 h-4 group-hover:translate-x-0.5 transition ${MONO}`} /></>)}
                        </button>

                        <div className="flex items-center justify-between pt-2 text-xs text-zinc-500">
                          <button
                            type="button"
                            onClick={() => { setOtpStep(false); setErrorMsg(null); setOtpError(null); }}
                            disabled={loading}
                            className="hover:text-zinc-900 transition disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            ← Change email
                          </button>
                          <button
                            type="button"
                            onClick={resendCode}
                            disabled={loading || resending || resendCooldown > 0}
                            className="font-medium text-zinc-900 underline-offset-2 hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed inline-flex items-center gap-1.5"
                          >
                            {resending ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                                Sending...
                              </>
                            ) : resendCooldown > 0 ? (
                              `Resend in ${resendCooldown}s`
                            ) : (
                              "Resend code"
                            )}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <form onSubmit={signUp} className="mt-4 space-y-4">
                        <div>
                          <label htmlFor="signup-name" className="mb-2 block text-[14px] font-medium text-zinc-900">
                            Full name
                          </label>
                          <input
                            type="text"
                            id="signup-name"
                            required
                            autoComplete="name"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="h-[43px] w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-auth-action focus:ring-1 focus:ring-auth-action"
                          />
                        </div>
                        <div>
                          <label htmlFor="signup-email" className="mb-2 block text-[14px] font-medium text-zinc-900">
                            Email
                          </label>
                          <input
                            type="email"
                            id="signup-email"
                            required
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="h-[43px] w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-auth-action focus:ring-1 focus:ring-auth-action"
                          />
                          {flashInline("email")}
                        </div>
                        <div>
                          <label htmlFor="signup-password" className="mb-2 block text-[14px] font-medium text-zinc-900">
                            Password
                          </label>
                          <div className="relative">
                            <input
                              type={showPassword ? "text" : "password"}
                              id="signup-password"
                              required
                              autoComplete="new-password"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="h-[43px] w-full rounded-lg border border-zinc-200 bg-white px-3 pr-12 text-sm text-zinc-900 outline-none transition focus:border-auth-action focus:ring-1 focus:ring-auth-action"
                            />
                            <Button type="button" variant="ghost" size="icon" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-1 top-1/2 -translate-y-1/2 text-zinc-700 hover:bg-transparent hover:text-zinc-900">
                              {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                            </Button>
                          </div>
                          {flashInline("password")}
                        </div>

                        <p className="text-[12px] leading-snug text-zinc-500">
                          Founding Program: Get 3 Months Access with $250 Credits.{" "}
                          <Link to="/founding" className="font-medium text-gc-blue-deep underline underline-offset-2">
                            Apply now
                          </Link>
                        </p>

                        {errorMsg && (
                          <div className={`flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700`}>
                            <span className="mt-[2px] inline-block h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                            <span className="leading-snug">{errorMsg}</span>
                          </div>
                        )}

                        <Button
                          type="submit"
                          disabled={loading}
                          className="group h-[43px] w-full rounded-lg bg-auth-action px-5 text-sm font-semibold text-auth-action-foreground shadow-none transition hover:bg-auth-action/90"
                        >
                          {loading ? btnLoading("Sending code...") : "Create account"}
                        </Button>
                      </form>
                    )

                  ) : mode === "forgot" ? (
                    forgotStep === "email" ? (
                      <form onSubmit={sendResetLink} className="mt-4 space-y-3">
                        <div className={`rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-[13px] text-zinc-700 ${MONO}`}>
                          <p className="leading-relaxed">
                            &nbsp; &nbsp; We'll send a 6-digit reset code.
                          </p>
                        </div>
                        <div>
                          <label className="mb-2 block text-[14px] font-medium text-zinc-900">
                            Email
                          </label>
                          <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                            <input
                              type="email"
                              required
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="w-full rounded-xl border border-zinc-200 bg-white pl-11 pr-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-900 transition placeholder:text-zinc-300"
                              placeholder="Institutional email..."
                            />
                          </div>
                          {flashInline("email")}
                        </div>

                        {errorMsg && (
                          <div className={`flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700`}>
                            <span className="mt-[2px] inline-block h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                            <span className="leading-snug">{errorMsg}</span>
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={loading}
                          className="group w-full rounded-lg bg-gc-blue px-5 py-3 text-sm font-medium text-gc-on-blue hover:bg-gc-blue-hover transition inline-flex items-center justify-center gap-2 disabled:opacity-60"
                        >
                          {loading ? btnLoading("Sending...") : (<>Send Reset <ArrowRight className={`w-4 h-4 group-hover:translate-x-0.5 transition ${MONO}`} /></>)}
                        </button>

                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => { setMode("signin"); setErrorMsg(null); }}
                            className="text-xs text-zinc-500 hover:text-zinc-900 transition"
                          >
                            ← Back to Sign in
                          </button>
                        </div>
                      </form>
                    ) : forgotStep === "code" ? (
                      <form onSubmit={verifyRecoveryOtp} className="mt-4 space-y-3">
                        <div className={`rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-[13px] text-zinc-700 ${MONO}`}>
                          <p className="leading-relaxed">
                            Check <span className="font-semibold text-zinc-900">{email}</span>. Enter the 6-digit code below.
                          </p>
                        </div>
                        <div>
                          <label className="mb-2 block text-[14px] font-medium text-zinc-900">
                            Verification Code
                          </label>
                          <input
                            ref={recoveryOtpInputRef}
                            onPaste={handleOtpPaste}
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            maxLength={6}
                            required
                            disabled={loading}
                            aria-invalid={otpError ? true : undefined}
                            aria-describedby={otpError ? "otp-error-recovery" : undefined}
                            value={otpCode}
                            onChange={(e) => { setOtpError(null); setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6)); }}
                            className={`w-full rounded-xl border bg-white px-4 py-3 text-center text-2xl tracking-[0.6em] outline-none transition placeholder:text-zinc-300 ${MONO} ${otpError ? "border-red-400 text-red-600 focus:border-red-500" : "border-zinc-200 text-zinc-900 focus:border-zinc-900"} ${otpShake ? "animate-otp-shake" : ""}`}
                            placeholder="••••••"
                          />
                          {otpError && (
                            <p id="otp-error-recovery" className={`mt-2 text-[13px] text-red-600`} role="alert" aria-live="polite">
                              {otpError}
                            </p>
                          )}
                        </div>


                        <button
                          type="submit"
                          disabled={loading}
                          className="group w-full rounded-lg bg-gc-blue px-5 py-3 text-sm font-medium text-gc-on-blue hover:bg-gc-blue-hover transition inline-flex items-center justify-center gap-2 disabled:opacity-60"
                        >
                          {loading ? btnLoading("Verifying...") : (<>Verify Code <ArrowRight className={`w-4 h-4 group-hover:translate-x-0.5 transition ${MONO}`} /></>)}
                        </button>

                        <div className="flex items-center justify-between pt-2 text-xs text-zinc-500">
                          <button
                            type="button"
                            onClick={() => { setForgotStep("email"); setErrorMsg(null); setOtpError(null); }}
                            disabled={loading}
                            className="hover:text-zinc-900 transition disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            ← Change email
                          </button>
                          <button
                            type="button"
                            onClick={resendResetCode}
                            disabled={loading || resending || resendCooldown > 0}
                            className="font-medium text-zinc-900 underline-offset-2 hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed inline-flex items-center gap-1.5"
                          >
                            {resending ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                                Sending...
                              </>
                            ) : resendCooldown > 0 ? (
                              `Resend in ${resendCooldown}s`
                            ) : (
                              "Resend code"
                            )}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <form onSubmit={updatePassword} className="mt-4 space-y-3">
                        <div className={`rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-900 ${MONO}`}>
                          <p className="leading-relaxed">
                            Verified. Set a new password to continue.
                          </p>
                        </div>
                        <div>
                          <label className="mb-2 block text-[14px] font-medium text-zinc-900">
                            New Password
                          </label>
                          <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                            <input
                              type={showNewPassword ? "text" : "password"}
                              required
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              className="w-full rounded-xl border border-zinc-200 bg-white pl-11 pr-11 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-900 transition placeholder:text-zinc-300"
                              placeholder="Min 8 characters..."
                            />
                            <button type="button" onClick={() => setShowNewPassword((v) => !v)} aria-label={showNewPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700">
                              {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                          {flashInline("password")}
                        </div>


                        {errorMsg && (
                          <div className={`flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700`}>
                            <span className="mt-[2px] inline-block h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                            <span className="leading-snug">{errorMsg}</span>
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={loading}
                          className="group w-full rounded-lg bg-gc-blue px-5 py-3 text-sm font-medium text-gc-on-blue hover:bg-gc-blue-hover transition inline-flex items-center justify-center gap-2 disabled:opacity-60"
                        >
                          {loading ? btnLoading("Updating...") : (<>Update Password <ArrowRight className={`w-4 h-4 group-hover:translate-x-0.5 transition ${MONO}`} /></>)}
                        </button>
                      </form>
                    )
                  ) : (
                    <>
                      <form onSubmit={signIn} className="mt-4 space-y-4">
                        <div>
                          <label htmlFor="signin-email" className="mb-2 block text-[14px] font-medium text-zinc-900">
                            Email
                          </label>
                          <input
                            type="email"
                            id="signin-email"
                            required
                            autoComplete="username"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="h-[43px] w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-auth-action focus:ring-1 focus:ring-auth-action"
                          />
                          {flashInline("email")}
                        </div>

                        <div>
                          <label htmlFor="signin-password" className="mb-2 block text-[14px] font-medium text-zinc-900">
                            Password
                          </label>
                          <div className="relative">
                            <input
                              type={showPassword ? "text" : "password"}
                              id="signin-password"
                              required
                              autoComplete="current-password"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="h-[43px] w-full rounded-lg border border-zinc-200 bg-white px-3 pr-12 text-sm text-zinc-900 outline-none transition focus:border-auth-action focus:ring-1 focus:ring-auth-action"
                            />
                            <Button type="button" variant="ghost" size="icon" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-1 top-1/2 -translate-y-1/2 text-zinc-700 hover:bg-transparent hover:text-zinc-900">
                              {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                            </Button>
                          </div>
                          {flashInline("password")}
                        </div>

                        <label className="flex cursor-pointer select-none items-center gap-2 pt-3 text-[14px] text-zinc-900">
                          <input
                            type="checkbox"
                            checked={rememberLogin}
                            onChange={(event) => setRememberLogin(event.target.checked)}
                            className="h-[18px] w-[18px] rounded border-zinc-300 accent-zinc-900"
                          />
                          <span>Save email and login method on this device</span>
                        </label>


                        {errorMsg && (
                          <div className={`flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700`}>
                            <span className="mt-[2px] inline-block h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                            <span className="leading-snug">{errorMsg}</span>
                          </div>
                        )}

                        <Button
                          type="submit"
                          disabled={loading}
                          className="group h-[43px] w-full rounded-lg bg-auth-action px-5 text-sm font-semibold text-auth-action-foreground shadow-none transition hover:bg-auth-action/90"
                        >
                          {loading
                            ? btnLoading("Signing in...")
                            : "Sign in"}
                        </Button>
                      </form>

                    </>
                  )}

                  {mode === "signin" && !mfaChallenge && (
                    <div className="mt-6 space-y-1.5 text-center text-[13px] text-zinc-500">
                      <p>
                        New here?{" "}
                        <button
                          type="button"
                          onClick={() => { setMode("signup"); setErrorMsg(null); setOtpStep(false); }}
                          className="font-medium text-zinc-900 underline underline-offset-2"
                        >
                          Create an account
                        </button>
                      </p>
                      <p>
                        Founding member?{" "}
                        <Link to="/founding" className="font-medium text-gc-blue-deep underline underline-offset-2">
                          Get 3 Months Access with $250 Credits →
                        </Link>
                      </p>
                      <p>
                        Forgot your password?{" "}
                        <button
                          type="button"
                          onClick={() => { setMode("forgot"); setForgotStep("email"); setErrorMsg(null); setOtpCode(""); }}
                          className="font-medium text-zinc-900 underline underline-offset-2"
                        >
                          Reset it
                        </button>
                      </p>
                    </div>
                  )}

                  {mode === "signup" && !otpStep && !mfaChallenge && (
                    <p className="mt-6 text-center text-[13px] text-zinc-500">
                      Already have an account?{" "}
                      <button
                        type="button"
                        onClick={() => { setMode("signin"); setErrorMsg(null); }}
                        className="font-medium text-zinc-900 underline underline-offset-2"
                      >
                        Sign in
                      </button>
                    </p>
                  )}

                  <p className="mt-8 text-center text-[12px] leading-relaxed text-zinc-400">
                    By continuing, I agree to Jenvu's{" "}
                    <Link to="/terms" className="underline underline-offset-2">terms</Link> and{" "}
                    <Link to="/privacy" className="underline underline-offset-2">privacy policy</Link>.
                  </p>
                </div>
              </div>
            </div>

            {/* RIGHT — Google Cloud-style info panel */}
            <div className="relative hidden min-h-dvh w-1/2 overflow-hidden bg-background lg:flex lg:flex-col">
              <svg className="pointer-events-none absolute right-0 top-0 h-full w-[38%]" viewBox="0 0 300 800" fill="none" aria-hidden>
                <line x1="20" y1="0" x2="200" y2="320" className="stroke-gc-ink-muted" strokeWidth="1" strokeDasharray="1 4" />
                <circle cx="90" cy="70" r="2.5" className="fill-gc-line" />
                <circle cx="88" cy="195" r="5" className="fill-gc-yellow" />
                <path d="M130 430 L175 505 L130 580 L85 505 Z" className="stroke-gc-ink-muted" strokeWidth="1" strokeDasharray="1 4" />
                <circle cx="105" cy="545" r="8" className="fill-gc-red" />
                <path d="M40 760 l20 -16 M50 770 l20 -16 M60 780 l20 -16" className="stroke-gc-ink-muted" strokeWidth="1" strokeDasharray="1 3" />
              </svg>
              <div className="relative z-10 flex flex-1 flex-col pl-16 pt-[120px] xl:pl-24 sm:pt-[136px]">
                <div className="max-w-[340px] space-y-7">
                  <div>
                    <h2 className="text-[20px] font-normal text-gc-ink">Access to Jenvu tools</h2>
                    <p className="mt-2 text-[14px] leading-[1.55] text-gc-ink-muted">
                      Get everything you need to read Gold: the Terminal, AI desk, sweeps, zones, FVGs and alerts
                    </p>
                  </div>
                  <div>
                    <h2 className="text-[20px] font-normal text-gc-ink">$100 in free credit</h2>
                    <p className="mt-2 text-[14px] leading-[1.55] text-gc-ink-muted">
                      Try Jenvu with $100 in credit to spend on top-tier AI models & pro access to use other features
                    </p>
                  </div>
                  <div>
                    <h2 className="text-[20px] font-normal text-gc-ink">14 days of Pro access</h2>
                    <p className="mt-2 text-[14px] leading-[1.55] text-gc-ink-muted">
                      Start 14 days of Pro free from your dashboard. Upgrade only if Jenvu is right for you
                    </p>
                  </div>
                </div>
                <svg className="mt-16 h-[230px] w-[220px]" viewBox="0 0 220 230" fill="none" aria-hidden>
                  <circle cx="58" cy="12" r="7" className="fill-gc-blue" />
                  <path d="M46 46 H136 L182 124 H92 Z" className="stroke-gc-ink" strokeWidth="1" />
                  <path d="M0 124 H92 L136 202 H46 Z" className="stroke-gc-ink" strokeWidth="1" />
                  <line x1="92" y1="124" x2="136" y2="46" className="stroke-gc-ink-muted" strokeWidth="1" strokeDasharray="1 3" />
                  <ellipse cx="156" cy="89" rx="14" ry="15" className="fill-gc-green" />
                </svg>
              </div>
            </div>
    </div>
  );
}
