import { AlertTriangle, Bell, MessageSquare, Check } from "lucide-react";

export function WhyJenvu() {
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
        <div className="relative min-h-[460px] overflow-hidden bg-zinc-950 p-6 sm:p-10">
          <video
            aria-label="Jenvu market analysis feature preview"
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            className="absolute inset-0 h-full w-full object-cover"
          >
            <source src="/pricing-features.webm" type="video/webm" />
          </video>
          <div aria-hidden className="absolute inset-0 bg-zinc-950/50" />
          <span className="relative inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-zinc-950/35 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur-sm">
            <AlertTriangle className="h-3 w-3 text-home-accent" />
            Status: Guesswork
          </span>

          <h3 className="relative mt-6 max-w-[15ch] text-[34px] font-semibold leading-[1.05] tracking-tight text-white sm:text-[40px]">
            Trading gold with the noisy way engine
          </h3>

          {/* floating chips */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-6 top-[54%] flex max-w-[250px] items-start gap-2 rounded-xl border border-white/30 bg-zinc-950/55 px-3.5 py-2.5 shadow-lg backdrop-blur-md">
              <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/70" />
              <p className="text-[11.5px] leading-snug text-white/85">
                "DXY is spiking and I missed the move — can someone check the news?"
              </p>
            </div>
            <div className="absolute bottom-28 left-10 flex items-center gap-2 rounded-xl border border-white/30 bg-zinc-950/55 px-3.5 py-2 shadow-lg backdrop-blur-md">
              <Bell className="h-3.5 w-3.5 text-red-400" />
              <p className="text-[11.5px] font-medium text-white/85">47 unread alerts</p>
            </div>
            <div className="absolute bottom-8 right-6 flex max-w-[240px] items-start gap-2 rounded-xl border border-white/30 bg-zinc-950/55 px-3.5 py-2.5 shadow-lg backdrop-blur-md">
              <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/70" />
              <p className="text-[11.5px] leading-snug text-white/85">
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

        </div>
      </div>
    </div>

  );
}
