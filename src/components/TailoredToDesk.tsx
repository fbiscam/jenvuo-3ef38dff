import * as React from "react";
import { Bot, CornerDownRight, Github, Globe2, Grid3X3, ShieldCheck } from "lucide-react";
import jenvuLogoAsset from "@/assets/jenvu-workflow-logo.png.asset.json";

const BUILDS = [
  { id: "v30499", time: "Updated 09.10.26, 09:50", status: "Queued" },
  { id: "v30498", time: "Updated 09.10.26, 09:50", status: "Deployed" },
  { id: "v30497", time: "Updated 09.10.26, 09:49", status: "Deployed" },
  { id: "v30496", time: "Updated 09.10.26, 09:49", status: "Deployed" },
];

const AGENTS = [
  { name: "structure-agent", detail: "BOS + CHoCH", meta: "4k candles" },
  { name: "liquidity-agent", detail: "sweeps + FVG", meta: "146 zones" },
  { name: "risk-agent", detail: "exposure clean", meta: "98 checks" },
];

export function TailoredToDesk() {
  const [tick, setTick] = React.useState(0);

  React.useEffect(() => {
    const timer = window.setInterval(() => setTick((value) => value + 1), 1500);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="border-t border-border bg-background">
      <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 sm:py-24">
        <div className="text-center">
          <h2 className="text-3xl font-semibold text-foreground sm:text-4xl md:text-[44px] md:leading-[1.1]">
            Tailored to your desk
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground sm:text-base">
            Easy to use for both solo traders and the world&rsquo;s largest funds.
          </p>
        </div>

        <div className="mt-10 grid min-h-[610px] gap-2 lg:grid-cols-3 lg:grid-rows-2">
          <article className="flex min-h-[290px] flex-col rounded-md border border-border bg-card p-5 sm:p-6 lg:col-span-2">
            <div className="flex items-start gap-5">
              <div className="relative hidden h-14 w-14 shrink-0 items-center justify-center rounded-md border border-border bg-background shadow-sm sm:flex">
                <img src={jenvuLogoAsset.url} alt="Jenvu" width={256} height={256} className="h-9 w-9 object-contain" />
                <span className="absolute -bottom-3 -right-3 flex h-7 w-7 items-center justify-center rounded-sm bg-foreground text-background shadow-sm">
                  <Github className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                {BUILDS.map((build, index) => {
                  const active = index === tick % BUILDS.length;
                  const complete = build.status === "Deployed";
                  return (
                    <div
                      key={build.id}
                      className={`tailored-build-row flex h-11 items-center justify-between gap-3 rounded-sm px-3 text-xs transition-all duration-500 ${active ? "is-active" : ""}`}
                    >
                      <span className="font-mono font-semibold text-home-accent">{build.id}</span>
                      <span className="hidden text-home-accent sm:inline">{build.time}</span>
                      <span className="flex items-center gap-2 text-home-accent">
                        {active && !complete ? "Queued" : "Deployed"}
                        <span className={`flex h-4 w-4 items-center justify-center rounded-full ${active && !complete ? "border border-dashed border-home-accent animate-spin" : "bg-home-accent text-background"}`}>
                          {complete || !active ? <span className="text-[9px]">✓</span> : null}
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-auto pt-8">
              <h3 className="text-[15px] font-semibold text-foreground">Fits into your existing workflows</h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                TradingView, MT5, Chrome and any broker. No proprietary tools or vendor lock-in.
              </p>
            </div>
          </article>

          <article className="flex min-h-[290px] flex-col rounded-md bg-home-accent p-6 text-home-accent-foreground sm:p-7">
            <Globe2 className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
            <h3 className="mt-3 text-base font-semibold">One network for charts and risk</h3>
            <p className="mt-3 max-w-sm text-sm leading-snug opacity-95">
               Whether you&rsquo;re scalping the London killzone, tracking red-folder news, or reviewing a week of trades, it all runs on the global engine.
            </p>
            <div className="tailored-orange-pulse mt-auto" aria-hidden="true" />
          </article>

          <article className="flex min-h-[290px] flex-col justify-end rounded-md border border-border bg-card p-6 sm:p-7">
            <div className="tailored-security-visual mb-auto" aria-hidden="true">
              <span className="tailored-security-ring" />
              <ShieldCheck className="relative h-7 w-7 text-home-accent" />
            </div>
            <ShieldCheck className="h-5 w-5 text-foreground" strokeWidth={1.7} aria-hidden="true" />
            <h3 className="mt-3 text-[15px] font-semibold text-foreground">Secure by default</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Encrypted keys, device trust and 2FA are built into every account from day one.
            </p>
          </article>

          <article className="relative min-h-[290px] overflow-hidden rounded-md border border-border bg-card lg:col-span-2">
            <div className="relative z-10 max-w-[46%] p-6 sm:p-7">
              <h3 className="text-[15px] font-semibold text-foreground">Fast path to AI adoption</h3>
              <p className="mt-2 text-sm leading-snug text-muted-foreground">
                Build and launch experienced ICT/SMC agents on the same chart. Secure access and senior review make analysis production-ready in one click.
              </p>
            </div>

            <div className="tailored-console absolute bottom-0 right-0 top-[56px] w-[52%] overflow-hidden rounded-tl-lg border-l border-t border-border bg-background shadow-sm">
              <div className="p-4">
                <p className="text-[11px] text-muted-foreground">Launching agents to analyze XAU/USD…</p>
                <p className="mt-2 flex items-center gap-2 text-[11px] text-home-accent">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-home-accent" />
                  3 background agents launched
                </p>
                <div className="mt-2 space-y-1.5">
                  {AGENTS.map((agent, index) => (
                    <div key={agent.name} className={`flex items-center gap-2 text-[10px] transition-opacity duration-500 ${tick % 4 >= index ? "opacity-100" : "opacity-35"}`}>
                      <CornerDownRight className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                      <span className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-foreground">{agent.name}</span>
                      <span className="truncate font-mono text-muted-foreground">→ {agent.detail}</span>
                      <span className="ml-auto hidden font-mono text-muted-foreground sm:inline">• {agent.meta}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="tailored-analysis-bar flex h-8 items-center gap-2 border-y border-border px-4 text-[11px] text-home-accent">
                <Grid3X3 className="h-3.5 w-3.5 animate-pulse" aria-hidden="true" />
                Agents live-chart analysis running…
              </div>
              <div className="flex h-16 items-end justify-between px-4 pb-3 font-mono text-xs text-muted-foreground">
                <span>&gt; <span className="animate-terminal-blink">_</span></span>
                <span className="flex items-center gap-1 rounded-md bg-home-accent px-3 py-1.5 font-sans text-xs font-medium text-primary-foreground">
                  Enter <Bot className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

export default TailoredToDesk;