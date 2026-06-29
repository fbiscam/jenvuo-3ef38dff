import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CloudOrb } from "@/components/CloudOrb";

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
      className="relative min-h-screen w-full bg-white text-black flex flex-col lg:flex-row overflow-hidden"
      style={{ fontFamily: "Urbanist, sans-serif" }}
    >
      {/* Soft aurora background tint */}
      <div className="pointer-events-none absolute inset-0 -z-0">
        <div className="absolute -top-32 -left-32 h-[40rem] w-[40rem] rounded-full opacity-25 blur-3xl"
          style={{ background: "radial-gradient(circle, #ff3ea5 0%, transparent 70%)" }} />
        <div className="absolute top-1/3 -right-32 h-[36rem] w-[36rem] rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, #38bdf8 0%, transparent 70%)" }} />
        <div className="absolute -bottom-40 left-1/4 h-[44rem] w-[44rem] rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, #a855f7 0%, transparent 70%)" }} />
      </div>

      {/* LEFT — Login */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-6 lg:p-16">
        <div className="w-full max-w-sm">

          <h1
            className="text-5xl font-black uppercase tracking-tight mb-3 leading-none bg-clip-text text-transparent"
            style={{ backgroundImage: "linear-gradient(135deg,#ec4899 0%,#f59e0b 35%,#0ea5e9 70%,#8b5cf6 100%)" }}
          >
            Jenvu AI
          </h1>
          <p className="text-sm text-black/60 mb-10">
            Welcome back. Sign in to talk to your AI.
          </p>

          <form onSubmit={signIn} className="space-y-4">
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40 group-focus-within:text-black transition" />
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl bg-white border border-black/15 pl-11 pr-4 py-3.5 text-sm text-black outline-none focus:border-fuchsia-500 transition placeholder:text-black/35"
                placeholder="you@example.com"
              />
            </div>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40 group-focus-within:text-black transition" />
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl bg-white border border-black/15 pl-11 pr-4 py-3.5 text-sm text-black outline-none focus:border-sky-500 transition placeholder:text-black/35"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl py-3.5 text-sm font-semibold text-white shadow-[0_10px_40px_-10px_rgba(236,72,153,0.55)] hover:shadow-[0_14px_50px_-10px_rgba(56,189,248,0.6)] disabled:opacity-60 transition inline-flex items-center justify-center gap-2"
              style={{ backgroundImage: "linear-gradient(135deg,#ec4899 0%,#a855f7 50%,#38bdf8 100%)" }}
            >
              {loading ? "Signing in…" : (<>Sign in <ArrowRight className="w-4 h-4" /></>)}
            </button>
          </form>

          <p className="mt-8 text-xs text-black/55 text-center">
            Access is invite-only. Contact the admin for an account.
          </p>
        </div>
      </div>



      {/* RIGHT — Live Voice Agent orb */}
      <div className="relative z-10 flex-1 min-h-[45vh] lg:min-h-screen overflow-hidden flex items-center justify-center lg:border-l border-white/10">
        <div className="absolute inset-0 flex items-center justify-center">
          <CloudOrb status="speaking" pulse={0} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0612] via-[#0a0612]/40 to-transparent pointer-events-none" />

        <div className="absolute bottom-10 left-8 right-8 lg:left-14 lg:right-14 text-white">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/25 backdrop-blur-md mb-5">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span className="text-[11px] uppercase tracking-[0.25em]">Live</span>
          </div>
          <h2 className="text-4xl lg:text-6xl font-black uppercase tracking-tight leading-[0.95]">
            Hello, <br className="hidden lg:block" />I'm Jenvu.
          </h2>
          <p className="mt-4 text-base lg:text-lg text-white/75 max-w-md leading-relaxed">
            Your personal AI voice assistant — ready to talk, analyse the markets,
            and guide your next move.
          </p>
        </div>
      </div>
    </div>
  );
}
