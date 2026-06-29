import * as React from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CloudOrb } from "@/components/CloudOrb";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Jenvu AI" },
      { name: "description", content: "Sign in to your Jenvu AI voice terminal." },
    ],
  }),
  component: AuthPage,
});

const MONO = "font-['JetBrains_Mono',ui-monospace,monospace]";
const SANS = "font-['Inter',system-ui,sans-serif]";

/* ---------- mock data for ticker ---------- */
type TickerRow = [string, string, string];
const INITIAL_TICKER: TickerRow[] = [
  ["XAU/USD", "2,418.30", "+0.42%"],
  ["BTC/USDT", "71,204.10", "+1.18%"],
  ["ETH/USDT", "3,841.20", "+2.04%"],
  ["EUR/USD", "1.0832", "-0.07%"],
  ["DXY", "104.21", "-0.12%"],
  ["SOL/USDT", "168.40", "+3.12%"],
];

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (alive && data.session) navigate({ to: "/app", replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (session) navigate({ to: "/app", replace: true });
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
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
    navigate({ to: "/app", replace: true });
  };

  return (
    <>
    <style>{`@media (min-width: 1280px) and (min-height: 800px){.jenvu-auth-zoom{zoom:1.05}}`}</style>
    <div className={`jenvu-auth-zoom h-dvh w-full overflow-hidden bg-white text-zinc-900 ${SANS} antialiased selection:bg-zinc-900 selection:text-white flex flex-col`}>


      {/* NAV */}
      <header className="sticky top-0 z-50 border-b border-zinc-100 bg-white/85 backdrop-blur-md">
        <div className="relative mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 py-3 sm:px-6 sm:py-4 md:flex md:justify-between">
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <img src="/favicon.png" alt="JENVU AI" className="h-6 w-6 rounded-md object-contain" />
            <span className="truncate font-semibold tracking-tight">JENVU AI</span>
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-100 bg-white ${MONO} text-[10px] tracking-wider uppercase text-zinc-900`}>
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inset-0 rounded-full bg-emerald-500 animate-pulse" />
                <span className="relative rounded-full bg-emerald-500 h-1.5 w-1.5" />
              </span>
              AUTH_TERMINAL // ONLINE
            </div>
          </div>
        </div>
        {/* ticker strip */}
        <div className="border-t border-zinc-100 overflow-hidden">
          <div className={`flex w-max gap-8 py-2 ${MONO} text-[11px] text-zinc-900 whitespace-nowrap animate-ticker`}>
            {[...INITIAL_TICKER, ...INITIAL_TICKER].map(([s, p, d], i) => (
              <span key={i} className="flex items-center gap-2">
                <span className="text-zinc-900 font-medium">{s}</span>
                <span>{p}</span>
                <span className={d.startsWith("-") ? "text-red-500" : "text-emerald-600"}>{d}</span>
                <span className="text-zinc-200">•</span>
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 min-h-0 flex flex-col items-center justify-center p-3 sm:p-4 overflow-hidden">
        <div className="w-full max-w-6xl max-h-full">
          <div className="rounded-2xl border border-zinc-200 bg-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] overflow-hidden">
            {/* terminal header */}
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2 border-b border-zinc-100 bg-white sm:flex sm:justify-between sm:px-6 sm:py-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex gap-1.5 shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-200" />
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-200" />
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-200" />
                </div>
                <span className={`ml-2 sm:ml-4 text-[10px] sm:text-[11px] ${MONO} tracking-widest text-zinc-900 uppercase truncate`}>
                  JENVU AI // AUTH_SESSION
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-4">
                <span className={`text-[11px] ${MONO} text-zinc-400`}>ENCRYPTION · AES-256</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-px bg-zinc-100">
              {/* LEFT — FORM */}
              <div className="lg:col-span-7 bg-white p-5 sm:p-6 lg:p-8">

                <div className="max-w-md mx-auto lg:mx-0">
                  
                  <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
                    Sign in to your desk.
                  </h1>
                  <p className="mt-2 text-sm text-zinc-600 leading-relaxed">
                    Voice-native institutional intelligence, on call.
                  </p>

                  <form onSubmit={signIn} className="mt-5 space-y-3">

                    <div>
                      <label className={`block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 ${MONO}`}>
                        User Identification
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
                    </div>

                    <div>
                      <label className={`block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 ${MONO}`}>
                        Access Key
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full rounded-xl border border-zinc-200 bg-white pl-11 pr-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-900 transition placeholder:text-zinc-300"
                          placeholder="Enter password..."
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="group w-full rounded-lg bg-zinc-900 px-5 py-3 text-sm font-medium text-white hover:bg-zinc-800 transition inline-flex items-center justify-center gap-2"
                    >
                      {loading ? "Authenticating..." : (<>Authenticate <ArrowRight className={`w-4 h-4 group-hover:translate-x-0.5 transition ${MONO}`} /></>)}
                    </button>
                  </form>

                  <div className="mt-4 pt-3 border-t border-zinc-100">
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      This terminal is invite-only. Contact your account administrator for credentials.
                    </p>
                  </div>

                </div>
              </div>

              {/* RIGHT — VISUAL */}
              <div className="hidden lg:flex lg:col-span-5 bg-white flex-col p-6 lg:p-10 border-t lg:border-t-0 lg:border-l border-zinc-100">
                <div className="flex-1 flex flex-col items-center justify-center relative min-h-[240px]">
                  <div
                    className="absolute inset-0 opacity-[0.04] pointer-events-none"
                    style={{
                      backgroundImage: "radial-gradient(#000 0.6px, transparent 0.6px)",
                      backgroundSize: "24px 24px",
                    }}
                  />
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="relative h-40 w-40 lg:h-48 lg:w-48">
                      <div className="absolute inset-0 rounded-full border border-zinc-100 animate-[spin_18s_linear_infinite]" />
                      <div className="absolute inset-5 rounded-full border border-zinc-200/60 animate-[spin_24s_linear_infinite_reverse]" />
                      <div className="absolute inset-9">
                        <CloudOrb status="speaking" pulse={1} />
                      </div>
                    </div>
                    
                    <div className="mt-6 text-center space-y-2">
                      <div className={`flex items-center justify-center gap-2 ${MONO} text-[10px] tracking-[0.2em] text-zinc-400 uppercase`}>
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/40" />
                        LIVE_NARRATION
                      </div>
                      <div className={`h-10 flex items-center justify-center ${MONO} text-[11px] text-zinc-900 text-center max-w-[200px] leading-relaxed`}>
                        <RotatingStatus />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-auto grid grid-cols-2 gap-px bg-zinc-100 rounded-xl overflow-hidden border border-zinc-100">
                  {[
                    ["Markets", "32+"],
                    ["Latency", "14ms"],
                  ].map(([k, v]) => (
                    <div key={k} className="bg-white p-4 text-center">
                      <div className={`${MONO} text-[9px] uppercase tracking-widest text-zinc-400`}>{k}</div>
                      <div className="mt-1 text-sm font-semibold text-zinc-900">{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-zinc-100 shrink-0">
        <div className="mx-auto max-w-6xl px-5 py-3 flex items-center justify-between gap-5">
          <div className="flex items-center gap-2 text-[11px] text-zinc-400">
            <span className="font-semibold text-zinc-900">JENVU AI</span>
            <span>·</span>
            <span>© {new Date().getFullYear()}</span>
          </div>
          <div className={`${MONO} text-[10px] text-zinc-400 uppercase tracking-widest`}>
            v1.0 // AUTH_EDITION
          </div>
        </div>
      </footer>
    </div>
    </>
  );
}


function RotatingStatus() {
  const [idx, setIdx] = React.useState(0);
  const phrases = [
    "Mapping liquidity on XAUUSD...",
    "FVG detected on BTC 15m...",
    "Monitoring London Killzone...",
    "Analyzing institutional bias...",
    "Scanning SMT divergence..."
  ];
  
  React.useEffect(() => {
    const itv = setInterval(() => setIdx((i: number) => (i + 1) % phrases.length), 3000);
    return () => clearInterval(itv);
  }, [phrases.length]);

  return <span className="animate-pulse">{phrases[idx]}</span>;
}
