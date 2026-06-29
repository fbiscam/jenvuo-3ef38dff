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
    toast.success("Welcome back");
    navigate({ to: "/", replace: true });
  };

  return (
    <div
      className="relative min-h-screen w-full bg-white text-black flex flex-col lg:flex-row overflow-hidden"
      style={{ fontFamily: "Urbanist, sans-serif" }}
    >

      {/* LEFT — Login */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-6 lg:p-16">

        <div className="relative w-full max-w-xl">
          {/* glass card */}
          <div className="relative rounded-3xl bg-transparent p-8 sm:p-10">
            {/* logo badge */}
            <div className="flex items-center gap-4 mb-10">
              <div className="w-14 h-14 flex items-center justify-center">
                <img src={faviconUrl} alt="Jenvu AI" className="w-14 h-14 object-contain" />
              </div>
              <div className="leading-tight">
                <h1
                  className="text-3xl font-black uppercase tracking-tight text-black"
                  style={{ fontFamily: "'Urbanist', sans-serif" }}
                >
                  Jenvu AI
                </h1>
                <p className="text-[13px] uppercase tracking-[0.18em] text-black/50 font-semibold">
                  Voice Intelligence
                </p>
              </div>
            </div>

            <h2 className="text-4xl sm:text-5xl font-bold text-black tracking-tight mb-3">
              Welcome back
            </h2>
            <p className="text-base text-black/80 mb-10 font-medium">
              Sign in to continue your conversation.
            </p>

            <form onSubmit={signIn} className="space-y-5">
              <div>
                <label className="block text-[13px] font-semibold uppercase tracking-wider text-black/80 mb-2 ml-1">
                  Email
                </label>
                <div className="relative group">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-black/40 group-focus-within:text-fuchsia-500 transition" />
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl bg-white border border-black/10 pl-12 pr-4 py-4 text-base text-black outline-none focus:border-black focus:ring-4 focus:ring-black/5 transition placeholder:text-black/35"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-semibold uppercase tracking-wider text-black/80 mb-2 ml-1">
                  Password
                </label>
                <div className="relative group">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-black/40 group-focus-within:text-sky-500 transition" />
                  <input
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl bg-white border border-black/10 pl-12 pr-4 py-4 text-base text-black outline-none focus:border-black focus:ring-4 focus:ring-black/5 transition placeholder:text-black/35"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group relative w-full mt-3 rounded-xl py-4 text-base font-semibold text-white bg-black hover:bg-neutral-900 disabled:opacity-60 transition inline-flex items-center justify-center gap-2 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)] overflow-hidden"
              >
                <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-neutral-900" />
                <span className="relative inline-flex items-center gap-2">
                  {loading ? "Signing in…" : (<>Sign in <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition" /></>)}
                </span>
              </button>
            </form>

            <div className="mt-10 flex items-center gap-3">
              <div className="h-px flex-1 bg-black/10" />
              <span className="text-xs uppercase tracking-[0.18em] text-black/80 font-semibold">Invite Only</span>
              <div className="h-px flex-1 bg-black/10" />
            </div>
            <p className="mt-4 text-sm text-black/90 text-center font-medium">
              Contact the admin to request access.
            </p>
          </div>
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
