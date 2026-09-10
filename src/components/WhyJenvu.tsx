import { useMemo } from "react";
import { AlertTriangle, Bell, MessageSquare, Check } from "lucide-react";

/* Deterministic pseudo-random dotted bars like the Cloudflare "why" panel */
function dottedBars(count: number, seed = 7) {
  let s = seed;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  return Array.from({ length: count }, (_, i) => {
    const wave =
      Math.sin(i / 6) * 22 + Math.sin(i / 2.7) * 14 + (rnd() - 0.5) * 26;
    return Math.max(6, Math.round(52 + wave));
  });
}

function DotColumn({ height, tone }: { height: number; tone: "light" | "warm" }) {
  const dots = Math.max(2, Math.round(height / 6));
  return (
    <div className="flex w-[3px] flex-col items-center justify-end gap-[3px]">
      {Array.from({ length: dots }).map((_, i) => (
        <span
          key={i}
          className={`h-[3px] w-[3px] rounded-full ${
            tone === "warm" ? "bg-home-accent/45" : "bg-zinc-200"
          }`}
        />
      ))}
    </div>
  );
}

export function WhyJenvu() {
  const bars = useMemo(() => dottedBars(64), []);

  return (
    <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-24">
      {/* Header */}
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl md:text-[44px] md:leading-[1.1]">
          Why choose Jenvu
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-zinc-500 sm:text-base">
          Everything needed to trade gold with clarity, speed, and confidence
        </p>
      </div>

      {/* Split panel */}
      <div className="mt-12 grid overflow-hidden rounded-2xl border border-zinc-200 shadow-[0_1px_2px_rgba(24,24,27,0.04)] md:grid-cols-2">
        {/* LEFT — the old way */}
        <div className="relative min-h-[460px] overflow-hidden bg-white p-6 sm:p-10">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            <AlertTriangle className="h-3 w-3 text-home-accent" />
            Status: Guesswork
          </span>

          <h3 className="mt-6 max-w-[15ch] text-[34px] font-semibold leading-[1.05] tracking-tight text-zinc-900 sm:text-[40px]">
            Trading gold with the noisy way engine
          </h3>

          {/* dotted chart */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-6 bottom-10 flex h-44 items-end justify-between opacity-80"
          >
            {bars.map((h, i) => (
              <DotColumn key={i} height={h} tone={i % 3 === 0 ? "warm" : "light"} />
            ))}
          </div>

          {/* floating chips */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-6 top-[54%] flex max-w-[250px] items-start gap-2 rounded-xl border border-zinc-200/80 bg-white px-3.5 py-2.5 shadow-[0_6px_20px_rgba(24,24,27,0.06)]">
              <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400" />
              <p className="text-[11.5px] leading-snug text-zinc-500">
                "DXY is spiking and I missed the move — can someone check the news?"
              </p>
            </div>
            <div className="absolute bottom-28 left-10 flex items-center gap-2 rounded-xl border border-zinc-200/80 bg-white px-3.5 py-2 shadow-[0_6px_20px_rgba(24,24,27,0.06)]">
              <Bell className="h-3.5 w-3.5 text-red-400" />
              <p className="text-[11.5px] font-medium text-zinc-600">47 unread alerts</p>
            </div>
            <div className="absolute bottom-8 right-6 flex max-w-[240px] items-start gap-2 rounded-xl border border-zinc-200/80 bg-white px-3.5 py-2.5 shadow-[0_6px_20px_rgba(24,24,27,0.06)]">
              <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400" />
              <p className="text-[11.5px] leading-snug text-zinc-500">
                "Six tabs open, three timeframes — still no idea where gold is headed."
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT — with Jenvu */}
        <div className="relative flex min-h-[460px] flex-col bg-home-accent p-6 sm:p-10">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/40 bg-white/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
            <Check className="h-3 w-3" />
            Status: Clear
          </span>

          <h3 className="mt-6 max-w-[14ch] text-[34px] font-semibold leading-[1.05] tracking-tight text-white sm:text-[40px]">
            Trading with Jenvu
          </h3>

          <div className="relative flex flex-1 items-center justify-center">
            {/* dashed connector line */}
            <div
              aria-hidden
              className="absolute -left-10 -right-10 top-1/2 border-t border-dashed border-white/45"
            />
            <span className="relative inline-flex items-center gap-2.5 rounded-xl border border-white/40 bg-white/15 px-4 py-3 text-sm font-semibold text-white backdrop-blur-sm">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-home-accent">
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              </span>
              Delivered 176 senior reviews&nbsp;
            </span>
          </div>

          <p className="text-[11px] uppercase tracking-[0.18em] text-white/75">
            One voice loop — bias, levels, and plan for XAU/USD
          </p>
        </div>
      </div>
    </div>

  );
}
