import * as React from "react";
import { createFileRoute, useNavigate, Link, redirect } from "@tanstack/react-router";
import { toast } from "sonner";
import { Mail, Lock, ArrowRight, User } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { CloudOrb } from "@/components/CloudOrb";


type AuthSearch = { redirect?: string };

function sanitizeRedirect(r?: string): string {
  if (!r || typeof r !== "string") return "/dashboard";
  if (!r.startsWith("/") || r.startsWith("//")) return "/dashboard";
  return r;
}

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): AuthSearch => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  beforeLoad: async ({ search }) => {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      throw redirect({ to: sanitizeRedirect(search.redirect) as "/dashboard" });
    }
  },
  head: () => ({
    meta: [
      { title: "Sign In — Jenvu" }, { name: "robots", content: "noindex, nofollow" },
      {
        name: "description",
        content:
          "Sign in to your Jenvu account to access the voice-native institutional gold trading terminal — live ICT/SMC analysis for every XAU cross-pair.",
      },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: "Sign In Your Account — Jenvu" },
      { property: "og:description", content: "Access your voice-native institutional trading terminal." },
      { property: "og:url", content: "https://jenvu.com/auth" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Sign In Your Account — Jenvu" },
      { name: "twitter:description", content: "Access your voice-native institutional trading terminal." },
    ],
    links: [{ rel: "canonical", href: "https://jenvu.com/auth" }],
  }),
  component: AuthPage,
});


const MONO = "font-['JetBrains_Mono',ui-monospace,monospace]";
const SANS = "font-['Inter',system-ui,sans-serif]";

/* ---------- mock data for ticker ---------- */
type TickerRow = [string, string, string];
const INITIAL_TICKER: TickerRow[] = [
  ["XAU/USD", "2,418.30", "+0.42%"],
  ["XAU/EUR", "2,232.15", "+0.31%"],
  ["XAU/GBP", "1,907.44", "+0.28%"],
  ["XAU/JPY", "381,204", "+0.55%"],
  ["XAU/AUD", "3,672.90", "+0.48%"],
  ["XAU/CHF", "2,178.60", "+0.19%"],
  ["DXY", "104.21", "-0.12%"],
];

function AuthPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const redirectTo = sanitizeRedirect(search.redirect);
  const [mode, setMode] = React.useState<"signin" | "signup">("signin");
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [otpStep, setOtpStep] = React.useState(false);
  const [otpCode, setOtpCode] = React.useState("");
  const [resending, setResending] = React.useState(false);

  React.useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((evt, session) => {
      if (evt === "SIGNED_IN" && session) {
        navigate({ to: redirectTo as "/dashboard", replace: true });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate, redirectTo]);

  const signInSchema = z.object({
    email: z.string().trim().email("Enter a valid email").max(255),
    password: z.string().min(1, "Password is required"),
  });
  const signUpSchema = z.object({
    fullName: z.string().trim().min(1, "Name is required").max(100),
    email: z.string().trim().email("Enter a valid email").max(255),
    password: z.string().min(8, "Password must be at least 8 characters").max(72),
  });

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
      setErrorMsg(error.message);
      return;
    }
    navigate({ to: redirectTo as "/dashboard", replace: true });
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
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { full_name: parsed.data.fullName },
      },
    });
    setLoading(false);
    if (error) {
      setErrorMsg(error.message);
      return;
    }
    if (data.session) {
      toast.success("Account created");
      navigate({ to: redirectTo as "/dashboard", replace: true });
    } else {
      toast.success("Check your email to confirm your account");
      setMode("signin");
      setPassword("");
    }
  };


  return (
    <>
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
      <main className="flex-1 min-h-0 overflow-hidden flex flex-col items-center justify-center p-2 sm:p-3">
        <div className="w-full max-w-6xl max-h-full overflow-hidden">
          <div className="rounded-2xl border border-zinc-200 bg-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] overflow-hidden max-h-[calc(100dvh-9rem)] flex flex-col">

            {/* terminal header */}
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2 border-b border-zinc-100 bg-white sm:flex sm:justify-between sm:px-6 sm:py-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex gap-1.5 shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-200" />
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-200" />
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-200" />
                </div>
                <span className={`ml-2 sm:ml-4 text-[10px] sm:text-[11px] ${MONO} tracking-widest text-zinc-900 uppercase truncate`}>
                  Jenvu // AUTH_SESSION
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-4">
                <span className={`text-[11px] ${MONO} text-zinc-400`}>ENCRYPTION · AES-256</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-px bg-zinc-100 flex-1 min-h-0 overflow-y-auto lg:overflow-hidden">
              {/* LEFT — FORM */}
              <div className="lg:col-span-7 bg-white p-4 sm:p-5 lg:p-6 lg:overflow-y-auto">

                <div className="max-w-lg lg:mx-0">

                  <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl lg:text-4xl">
                    {mode === "signin" ? "Sign in to your desk." : "Create your desk."}
                  </h1>
                  <p className="mt-2 text-sm text-zinc-600 leading-relaxed sm:text-base">
                    Voice-native institutional intelligence, on call.
                  </p>


                  {/* Tabs */}
                  <div className="mt-4 inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-1">
                    <button
                      type="button"
                      onClick={() => { setMode("signin"); setErrorMsg(null); }}
                      className={`px-4 py-1.5 text-sm rounded-md transition ${mode === "signin" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-800"}`}
                    >
                      Sign in
                    </button>
                    <button
                      type="button"
                      onClick={() => { setMode("signup"); setErrorMsg(null); }}
                      className={`px-4 py-1.5 text-sm rounded-md transition ${mode === "signup" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-400 hover:text-zinc-600"}`}
                      title="Invite only"
                    >
                      Sign up
                    </button>
                  </div>

                  {mode === "signup" ? (
                    <div className="mt-4 space-y-4">
                      <div className={`rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900 ${MONO}`}>
                        <div className="flex items-start gap-2">
                          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                          <div className="space-y-1.5">
                            <p className="font-semibold uppercase tracking-widest text-[11px] text-amber-800">
                              Invite Only
                            </p>
                            <p className="leading-relaxed text-[13px] text-amber-900 font-sans">
                              Jenvu is currently invite-only. Public sign-up is closed.
                              To request access, contact the administrator.
                            </p>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setMode("signin"); setErrorMsg(null); }}
                        className="group w-full rounded-lg bg-zinc-900 px-5 py-3 text-sm font-medium text-white hover:bg-zinc-800 transition inline-flex items-center justify-center gap-2"
                      >
                        Back to Sign in <ArrowRight className={`w-4 h-4 group-hover:translate-x-0.5 transition ${MONO}`} />
                      </button>
                      <div className="pt-3 border-t border-zinc-100">
                        <p className="text-sm text-zinc-500 leading-relaxed">
                          Already have an account?{" "}
                          <button
                            type="button"
                            onClick={() => { setMode("signin"); setErrorMsg(null); }}
                            className="font-medium text-zinc-900 underline-offset-2 hover:underline"
                          >
                            Sign in
                          </button>.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <form onSubmit={signIn} className="mt-4 space-y-3">
                        <div>
                          <label className={`block text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-1 ${MONO}`}>
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
                          <label className={`block text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-1 ${MONO}`}>
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

                        {errorMsg && (
                          <div className={`flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700 ${MONO}`}>
                            <span className="mt-[2px] inline-block h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                            <span className="leading-snug">{errorMsg}</span>
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={loading}
                          className="group w-full rounded-lg bg-zinc-900 px-5 py-3 text-sm font-medium text-white hover:bg-zinc-800 transition inline-flex items-center justify-center gap-2 disabled:opacity-60"
                        >
                          {loading
                            ? "Authenticating..."
                            : (<>Authenticate <ArrowRight className={`w-4 h-4 group-hover:translate-x-0.5 transition ${MONO}`} /></>)}
                        </button>
                      </form>

                      <div className="mt-4 pt-3 border-t border-zinc-100">
                        <p className="text-xs sm:text-sm text-zinc-500 leading-relaxed whitespace-nowrap">
                          Jenvu is invite-only. Contact the administrator for access.
                        </p>
                      </div>
                    </>
                  )}



                </div>
              </div>


              {/* RIGHT — VISUAL */}
              <div className="hidden lg:flex lg:col-span-5 bg-white flex-col p-5 lg:p-6 border-t lg:border-t-0 lg:border-l border-zinc-100">
                <div className="flex-1 flex flex-col items-center justify-center relative min-h-[200px]">
                  <div
                    className="absolute inset-0 opacity-[0.04] pointer-events-none"
                    style={{
                      backgroundImage: "radial-gradient(#000 0.6px, transparent 0.6px)",
                      backgroundSize: "24px 24px",
                    }}
                  />
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="relative h-32 w-32 lg:h-36 lg:w-36">
                      <div className="absolute inset-0 rounded-full border border-zinc-100 animate-[spin_18s_linear_infinite]" />
                      <div className="absolute inset-4 rounded-full border border-zinc-200/60 animate-[spin_24s_linear_infinite_reverse]" />
                      <div className="absolute inset-7">
                        <CloudOrb status="speaking" pulse={1} />
                      </div>
                    </div>

                    
                    <div className="mt-4 text-center space-y-2">
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
    </div>
    </>
  );
}


function RotatingStatus() {
  const [idx, setIdx] = React.useState(0);
  const phrases = [
    "Mapping liquidity on XAU/USD...",
    "FVG detected on XAU/JPY 15m...",
    "Monitoring London fix killzone...",
    "Analyzing institutional bullion bias...",
    "Scanning DXY-XAU divergence..."
  ];
  
  React.useEffect(() => {
    const itv = setInterval(() => setIdx((i: number) => (i + 1) % phrases.length), 3000);
    return () => clearInterval(itv);
  }, [phrases.length]);

  return <span className="animate-pulse">{phrases[idx]}</span>;
}
