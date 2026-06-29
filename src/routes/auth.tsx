import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CloudOrb } from "@/components/CloudOrb";
import faviconUrl from "@/assets/favicon.png";

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
    
    navigate({ to: "/", replace: true });
  };

  return (
    <div
      className="relative min-h-screen w-full flex flex-col lg:flex-row overflow-hidden"
      style={{ fontFamily: "'Manrope', system-ui, sans-serif", background: "#ffffff", color: "#2d2d2d" }}
    >

      {/* LEFT — Login (Paper & Ink) */}
      <div className="relative z-10 flex-1 flex flex-col p-8 lg:p-14">
        {/* paper grain */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-50 mix-blend-multiply"
          style={{
            backgroundImage: "radial-gradient(#2d2d2d22 1px, transparent 1px)",
            backgroundSize: "3px 3px",
            maskImage: "radial-gradient(ellipse at center, black 40%, transparent 75%)",
          }}
        />

        {/* top bar */}
        <div className="relative flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5">
            <span
              className="grid place-items-center h-7 w-7 rounded-md text-[#ffffff] font-black"
              style={{ background: "#0d0d0d", fontSize: 13, letterSpacing: "-0.05em", fontFamily: "'Sora', sans-serif" }}
            >
              J
            </span>
            <span className="font-bold uppercase tracking-[-0.02em] text-[15px]" style={{ fontFamily: "'Sora', sans-serif" }}>
              Jenvu<span className="opacity-50">/ai</span>
            </span>
          </a>
          <a href="/" className="text-[12px] font-semibold text-[#2d2d2d]/60 hover:text-[#0d0d0d]">
            ← Back home
          </a>
        </div>

        {/* form */}
        <div className="relative flex-1 flex items-center">
          <div className="w-full max-w-md mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#2d2d2d]/15 bg-[#ffffff] text-[11px] uppercase tracking-[0.22em] font-bold text-[#2d2d2d]/70">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-60" />
                <span className="relative rounded-full bg-emerald-500 h-1.5 w-1.5" />
              </span>
              Invite only · v1.0
            </div>

            <h1
              className="mt-7 font-semibold tracking-[-0.04em] leading-[0.95] text-[clamp(44px,5.5vw,68px)]"
              style={{ color: "#0d0d0d", fontFamily: "'Sora', sans-serif" }}
            >
              Welcome
              <br />
              <span className="italic font-light opacity-70">back.</span>
            </h1>
            <p className="mt-5 text-[15px] leading-relaxed text-[#2d2d2d]/70 max-w-sm">
              Sign in to continue your conversation with the desk.
            </p>

            <form onSubmit={signIn} className="mt-9 space-y-5">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.22em] text-[#2d2d2d]/55 mb-2.5">
                  Email
                </label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2d2d2d]/40" />
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-2xl bg-[#ffffff] border border-[#2d2d2d]/15 pl-11 pr-4 py-3.5 text-[15px] text-[#0d0d0d] outline-none focus:border-[#0d0d0d] focus:bg-white transition placeholder:text-[#2d2d2d]/35"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.22em] text-[#2d2d2d]/55 mb-2.5">
                  Password
                </label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2d2d2d]/40" />
                  <input
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-2xl bg-[#ffffff] border border-[#2d2d2d]/15 pl-11 pr-4 py-3.5 text-[15px] text-[#0d0d0d] outline-none focus:border-[#0d0d0d] focus:bg-white transition placeholder:text-[#2d2d2d]/35"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group w-full mt-2 rounded-full py-4 text-[14px] font-semibold text-[#ffffff] bg-[#0d0d0d] hover:opacity-90 disabled:opacity-60 transition inline-flex items-center justify-center gap-2"
              >
                {loading ? "Signing in…" : (<>Sign in <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition" /></>)}
              </button>
            </form>

            <div className="mt-9 flex items-center gap-3">
              <div className="h-px flex-1 bg-[#2d2d2d]/15" />
              <span className="text-[10px] uppercase tracking-[0.25em] text-[#2d2d2d]/55 font-bold">Invite Only</span>
              <div className="h-px flex-1 bg-[#2d2d2d]/15" />
            </div>
            <p className="mt-3 text-[13px] text-[#2d2d2d]/60 text-center">
              Contact the admin to request access.
            </p>
          </div>
        </div>

        {/* footer */}
        <div className="relative flex items-center justify-between text-[11px] text-[#2d2d2d]/50 font-medium">
          <span>© {new Date().getFullYear()} JENVU AI</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>v1.0 · paper edition</span>
        </div>
      </div>




      {/* RIGHT — Live Voice Agent orb */}
      <div className="relative z-10 flex-1 min-h-screen overflow-hidden hidden lg:flex items-center justify-center bg-black lg:border-l border-white/10">
        <div className="absolute inset-0 flex items-center justify-center">
          <CloudOrb status="speaking" pulse={0} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none" />

      </div>
    </div>
  );
}
