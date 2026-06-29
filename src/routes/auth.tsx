import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import welcomeVideo from "@/assets/welcome-orb.mp4.asset.json";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Jenvu AI" },
      { name: "description", content: "Sign in to your Jenvu AI voice assistant." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // If already signed in, go home
  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (alive && data.session) navigate({ to: "/", replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (session) navigate({ to: "/", replace: true });
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, [navigate]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Welcome back");
    navigate({ to: "/", replace: true });
  };

  return (
    <div className="min-h-screen w-full bg-black text-white flex flex-col lg:flex-row">
      {/* LEFT — Login */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-16">
        <div className="w-full max-w-sm">
          <h1
            className="text-3xl font-extrabold uppercase tracking-[0.15em] mb-2"
            style={{ fontFamily: "Urbanist, sans-serif" }}
          >
            JENVU AI
          </h1>
          <p className="text-sm text-neutral-400 mb-10">
            Welcome back. Sign in to talk to your AI.
          </p>

          <form onSubmit={signIn} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-2">
                Email
              </label>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl bg-neutral-900 border border-neutral-800 px-4 py-3 text-sm outline-none focus:border-white/40 transition"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-2">
                Password
              </label>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl bg-neutral-900 border border-neutral-800 px-4 py-3 text-sm outline-none focus:border-white/40 transition"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-white text-black font-semibold py-3 text-sm hover:bg-neutral-200 transition disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-8 text-xs text-neutral-500 text-center">
            Access is invite-only. Contact the admin for an account.
          </p>
        </div>
      </div>

      {/* RIGHT — Welcome video */}
      <div className="relative flex-1 min-h-[40vh] lg:min-h-screen overflow-hidden bg-black">
        <video
          src={welcomeVideo.url}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
        <div className="absolute bottom-10 left-10 right-10">
          <h2
            className="text-3xl lg:text-5xl font-extrabold uppercase tracking-tight leading-tight"
            style={{ fontFamily: "Urbanist, sans-serif" }}
          >
            Hello, I'm Jenvu.
          </h2>
          <p className="mt-3 text-base lg:text-lg text-neutral-300 max-w-md">
            Your personal AI voice assistant — ready to talk, analyse the markets,
            and guide your next move.
          </p>
        </div>
      </div>
    </div>
  );
}
