import * as React from "react";
import orbVideo from "@/assets/welcome-orb.mp4.asset.json";
import xauLogo from "@/assets/xau-logo.png.asset.json";
import jenvuLogo from "@/assets/favicon.png";

const MONO = "font-mono";

const BUILDS = [
  { id: "v30862", time: "Updated 09.10.26, 01:08", status: "Queued" },
  { id: "v30861", time: "Updated 09.10.26, 01:08", status: "Analyzing" },
  { id: "v30860", time: "Updated 09.10.26, 01:07", status: "Delivered" },
  { id: "v30859", time: "Updated 09.10.26, 01:06", status: "Delivered" },
];

const AGENTS = [
  { name: "structure-agent", detail: "scanning H4 legs", meta: "179.6k ticks" },
  { name: "liquidity-agent", detail: "sweep confirmation", meta: "27k levels" },
  { name: "risk-agent", detail: "exposure clean", meta: "146 checks" },
];

export function TailoredToDesk() {
  const [tick, setTick] = React.useState(0);

  React.useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1600);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section className="border-t border-zinc-100 bg-white">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-24">
        <div className="text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl md:text-[44px] md:leading-[1.1]">
            Tailored to your desk
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-zinc-500 sm:text-base">
            Easy to use for both solo traders and the world&rsquo;s largest funds.
          </p>
        </div>


        <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-200 md:grid-cols-5">
          {/* TOP LEFT — animated build/scan list */}
          <div className="bg-white p-5 sm:p-6 md:col-span-3">
            <div className="flex items-start gap-4">
              <div className="relative hidden h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white sm:flex">
                <img
                  src={jenvuLogo}
                  alt="Jenvu logo"
                  loading="lazy"
                  width={256}
                  height={256}
                  className="h-8 w-8 object-contain"
                />
                <img
                  src={xauLogo.url}
                  alt="XAU gold logo"
                  loading="lazy"
                  width={512}
                  height={512}
                  className="absolute -bottom-2 -right-2 h-6 w-6 rounded-full bg-white ring-2 ring-white"
                />
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                {BUILDS.map((b, i) => {
                  const active = i === tick % BUILDS.length;
                  return (
                    <div
                      key={b.id}
                      className={`flex items-center justify-between gap-3 rounded-md px-3 py-2.5 text-xs transition-all duration-500 ${
                        active ? "bg-home-accent-soft" : "bg-white"
                      }`}
                      style={{ opacity: 1 - i * 0.18 }}
                    >
                      <span className={`${MONO} text-zinc-700`}>{b.id}</span>
                      <span className="hidden text-zinc-500 sm:inline">{b.time}</span>
                      <span className="flex items-center gap-1.5 text-zinc-700">
                        {b.status}
                        <span
                          className={`inline-block h-2.5 w-2.5 rounded-full border-2 ${
                            active
                              ? "animate-spin border-home-accent border-t-transparent"
                              : "border-emerald-500 bg-emerald-500/20"
                          }`}
                        />
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            <h3 className="mt-6 text-sm font-semibold text-zinc-900">
              Fits into your existing workflow
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-500">
              TradingView, MT5, Chrome and any broker. No proprietary terminal or vendor lock-in.
            </p>
          </div>

          {/* TOP RIGHT — accent panel */}
          <div className="bg-home-accent p-6 text-white md:col-span-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full border border-white/60">
              <span className="text-[11px]">◎</span>
            </div>
            <h3 className="mt-4 text-base font-semibold">
              One desk for charts, voice and risk
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-white/90">
              Whether you&rsquo;re scalping the London killzone, tracking red-folder news, or
              reviewing a week of trades — it all runs on the same engine, managed from one
              dashboard, billed as one platform.
            </p>
          </div>

          {/* BOTTOM LEFT — secure by default */}
          <div className="flex flex-col justify-end bg-white p-6 md:col-span-2">
            <div className="tailored-accent-glow mb-4 h-24 rounded-lg" />
            <div className="flex h-6 w-6 items-center justify-center rounded-full border border-zinc-300 text-zinc-700">
              <span className="text-[11px]">⛨</span>
            </div>
            <h3 className="mt-3 text-sm font-semibold text-zinc-900">Secure by default</h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-500">
              Encrypted keys, device trust and 2FA are built into every account from day one.
            </p>
          </div>

          {/* BOTTOM RIGHT — agents + live video */}
          <div className="bg-white p-6 md:col-span-3">
            <h3 className="text-sm font-semibold text-zinc-900">Fast path to AI analysis</h3>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-zinc-500">
              Launch voice agents that read structure, liquidity and risk on the same chart —
              production-ready in one click.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-zinc-200 bg-white p-3">
                <p className="text-[11px] text-zinc-500">Launching agents to analyze XAU/USD…</p>
                <p className="mt-2 flex items-center gap-2 text-[11px] text-home-accent">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-home-accent" />
                  3 background agents launched
                </p>
                <div className="mt-2 space-y-1.5">
                  {AGENTS.map((a, i) => (
                    <div
                      key={a.name}
                      className={`flex items-center gap-2 text-[10px] transition-opacity duration-500 ${
                        tick % AGENTS.length >= i ? "opacity-100" : "opacity-30"
                      }`}
                    >
                      <span className="text-zinc-400">↳</span>
                      <span className={`${MONO} rounded bg-home-accent-soft px-1.5 py-0.5 text-home-accent`}>
                        {a.name}
                      </span>
                      <span className={`${MONO} truncate text-zinc-500`}>{a.detail}</span>
                      <span className={`${MONO} ml-auto hidden text-zinc-400 sm:inline`}>{a.meta}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative overflow-hidden rounded-lg border border-zinc-200 bg-zinc-950">
                <video
                  src={orbVideo.url}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="h-full min-h-[130px] w-full object-cover"
                />
                <span className={`absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 ${MONO} text-[9px] uppercase tracking-widest text-white`}>
                  live voice desk
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default TailoredToDesk;
