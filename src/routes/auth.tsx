import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Mail, Lock, ArrowRight, Sparkles } from "lucide-react";
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
    if (error) { toast.error(error.message); return; }
    toast.success("Welcome back");
    navigate({ to: "/", replace: true });
  };

  return (
    <div
      className="min-h-screen w-full text-white flex flex-col lg:flex-row relative overflow-hidden"
      style={{ fontFamily: "Urbanist, sans-serif" }}
    >
      {/* Ambient animated background */}
      <div className="absolute inset-0 -z-10 bg-[#05060a]">
        <div className="absolute -top-40 -left-40 w-[36rem] h-[36rem] rounded-full opacity-40 blur-3xl"
             style={{ background: "radial-gradient(circle, #7c3aed 0%, transparent 70%)" }} />
        <div className="absolute -bottom-40 -right-40 w-[40rem] h-[40rem] rounded-full opacity-40 blur-3xl"
             style={{ background: "radial-gradient(circle, #06b6d4 0%, transparent 70%)" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30rem] h-[30rem] rounded-full opacity-25 blur-3xl"
             style={{ background: "radial-gradient(circle, #ec4899 0%, transparent 70%)" }} />
      </div>

      {/* LEFT — Login */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-16 relative">
        <div className="w-full max-w-sm">
          {/* Logo badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-6">
            <Sparkles className="w-3.5 h-3.5 text-violet-300" />
            <span className="text-[11px] uppercase tracking-[0.2em] text-neutral-300">Voice Intelligence</span>
          </div>

          <h1 className="text-5xl font-black uppercase tracking-tight mb-3 leading-none">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-violet-200 to-cyan-200">
              Jenvu AI
            </span>
          </h1>
          <p className="text-sm text-neutral-400 mb-10">
            Welcome back. Sign in to talk to your AI.
          </p>

          <form onSubmit={signIn} className="space-y-4">
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 group-focus-within:text-violet-300 transition" />
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl bg-white/[0.04] border border-white/10 pl-11 pr-4 py-3.5 text-sm outline-none focus:border-violet-400/50 focus:bg-white/[0.07] transition placeholder:text-neutral-600 backdrop-blur-md"
                placeholder="you@example.com"
              />
            </div>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 group-focus-within:text-violet-300 transition" />
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl bg-white/[0.04] border border-white/10 pl-11 pr-4 py-3.5 text-sm outline-none focus:border-violet-400/50 focus:bg-white/[0.07] transition placeholder:text-neutral-600 backdrop-blur-md"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="relative w-full rounded-2xl py-3.5 text-sm font-semibold overflow-hidden group disabled:opacity-60 transition"
              style={{
                background: "linear-gradient(135deg, #7c3aed 0%, #ec4899 50%, #06b6d4 100%)",
                boxShadow: "0 10px 40px -10px rgba(124, 58, 237, 0.6)",
              }}
            >
              <span className="relative z-10 inline-flex items-center justify-center gap-2 text-white">
                {loading ? "Signing in…" : (<>Sign in <ArrowRight className="w-4 h-4" /></>)}
              </span>
              <span className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition" />
            </button>
          </form>

          <p className="mt-8 text-xs text-neutral-500 text-center">
            Access is invite-only. Contact the admin for an account.
          </p>
        </div>
      </div>

      {/* RIGHT — Welcome video */}
      <div className="relative flex-1 min-h-[45vh] lg:min-h-screen overflow-hidden">
        <video
          src={welcomeVideo.url}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* Layered gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#05060a] via-transparent to-transparent lg:from-[#05060a]/80" />
        <div className="absolute inset-0 mix-blend-overlay opacity-30"
             style={{ background: "radial-gradient(ellipse at top right, #7c3aed, transparent 60%)" }} />

        <div className="absolute bottom-10 left-8 right-8 lg:left-14 lg:right-14">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md mb-5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] uppercase tracking-[0.2em] text-white/90">Live</span>
          </div>
          <h2 className="text-4xl lg:text-6xl font-black uppercase tracking-tight leading-[0.95]">
            Hello, <br className="hidden lg:block" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-300 via-pink-300 to-cyan-300">
              I'm Jenvu.
            </span>
          </h2>
          <p className="mt-4 text-base lg:text-lg text-neutral-300 max-w-md leading-relaxed">
            Your personal AI voice assistant — ready to talk, analyse the markets,
            and guide your next move.
          </p>
        </div>
      </div>
    </div>
  );
}
