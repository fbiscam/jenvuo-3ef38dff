import * as React from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Lock, Loader2, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Reset your password — Jenvu" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "description", content: "Choose a new password for your Jenvu account." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = React.useState(false);
  const [hasSession, setHasSession] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);


  // Wait for Supabase to pick up the recovery token from the URL fragment / query
  // and either establish a recovery session or leave us signed out.
  React.useEffect(() => {
    let mounted = true;

    const sub = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY" || (session && event === "SIGNED_IN")) {
        setHasSession(true);
        setReady(true);
      }
    });

    (async () => {
      // Give the client a tick to process the URL, then fall back to getSession().
      await new Promise((r) => setTimeout(r, 250));
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setHasSession(Boolean(data.session));
      setReady(true);
    })();

    return () => {
      mounted = false;
      sub.data.subscription.unsubscribe();
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setSaving(true);
    const { error: upErr } = await supabase.auth.updateUser({ password });
    if (upErr) {
      setSaving(false);
      setError(upErr.message);
      return;
    }
    // Fire the "You're in — plan activates in 4 hours" email for founding users.
    // Best-effort: don't block the flow on failure.
    try {
      const { notifyFoundingPasswordSet } = await import("@/lib/founding.functions");
      await notifyFoundingPasswordSet();
    } catch {}
    // Sign out from every device (including this one) so the user re-logs in with
    // the new password everywhere.
    await supabase.auth.signOut({ scope: "global" }).catch(() => {});
    setSaving(false);
    setDone(true);
    toast.success("Password updated. Please sign in with your new password.");
    setTimeout(() => navigate({ to: "/auth" }), 1200);
  };

  const MONO = "font-mono";

  return (
    <main
      className="min-h-dvh w-full bg-white text-zinc-900 antialiased selection:bg-zinc-900 selection:text-white"
      style={{ fontFamily: '"Google Sans", "Google Sans Text", system-ui, -apple-system, sans-serif' }}
    >
      <div className="flex min-h-dvh w-full flex-col">
        <div className="px-6 pt-6 sm:px-10 sm:pt-8">
          <Link to="/" aria-label="Jenvu home" className="inline-flex">
            <img src="/favicon.png" alt="Jenvu" className="h-9 w-9 rounded-md object-contain" />
          </Link>
        </div>

        <div className="flex flex-1 items-start justify-center px-6 pb-16 pt-10 sm:pt-14">
          <div className="w-full max-w-[354px]">
            <h1 className="text-center text-[26px] font-semibold tracking-tight text-zinc-900">
              Reset your password
            </h1>

            {!ready ? (
              <div className="mt-8 flex items-center justify-center py-8 text-zinc-500">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : done ? (
              <div className="mt-4 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="leading-snug">
                  <div className="font-medium">Password updated</div>
                  <div className="text-emerald-800">
                    You've been signed out of all devices. Redirecting to sign-in…
                  </div>
                </div>
              </div>
            ) : !hasSession ? (
              <div className="mt-4 space-y-3">
                <div className={`flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700 ${MONO}`}>
                  <span className="mt-[2px] inline-block h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                  <span className="leading-snug">
                    This reset link is invalid or has expired. Please request a new one from the sign-in screen.
                  </span>
                </div>
                <Link
                  to="/auth"
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800"
                >
                  Back to sign in
                </Link>
              </div>
            ) : (
              <form onSubmit={submit} className="mt-4 space-y-3">
                <div className={`rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-[13px] text-zinc-700 ${MONO}`}>
                  <p className="leading-relaxed">Choose a new password for your Jenvu account.</p>
                </div>

                <div>
                  <label className={`block text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-1 ${MONO}`}>
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-xl border border-zinc-200 bg-white pl-11 pr-11 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-900 transition placeholder:text-zinc-300"
                      placeholder="Min 8 characters..."
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className={`block text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-1 ${MONO}`}>
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      type={showConfirm ? "text" : "password"}
                      autoComplete="new-password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      className="w-full rounded-xl border border-zinc-200 bg-white pl-11 pr-11 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-900 transition placeholder:text-zinc-300"
                      placeholder="Retype the new password..."
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      aria-label={showConfirm ? "Hide password" : "Show password"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className={`flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700 ${MONO}`}>
                    <span className="mt-[2px] inline-block h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                    <span className="leading-snug">{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="group w-full rounded-lg bg-zinc-900 px-5 py-3 text-sm font-medium text-white hover:bg-zinc-800 transition inline-flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {saving ? "Updating..." : "Update password"}
                </button>

                <p className="pt-1 text-center text-[11.5px] text-zinc-500">
                  After updating, you'll be signed out everywhere and asked to sign in again.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
