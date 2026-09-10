import { Link } from "@tanstack/react-router";
import {
  Shield,
  ArrowRightLeft,
  Database,
  Globe2,
  Sparkles,
  LogIn,
} from "lucide-react";

const tiles = [
  { Icon: LogIn, className: "left-[6%] top-[14%] -rotate-6", size: 56 },
  { Icon: Shield, className: "left-[16%] top-[42%] rotate-3", size: 48 },
  { Icon: ArrowRightLeft, className: "left-[26%] top-[66%] -rotate-3", size: 52 },
  { Icon: Globe2, className: "right-[10%] top-[12%] rotate-6", size: 56 },
  { Icon: Database, className: "right-[18%] top-[44%] -rotate-3", size: 48 },
  { Icon: Sparkles, className: "right-[7%] top-[68%] rotate-6", size: 52 },
];

export default function CloudflareHero() {
  return (
    <section className="relative mx-auto max-w-6xl px-4 pt-10 pb-6 sm:px-6 sm:pt-16">
      <div
        className="relative overflow-hidden rounded-[28px] px-6 py-16 sm:px-10 sm:py-24 md:py-28"
        style={{ background: "var(--home-accent)" }}
      >
        {/* dot grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.55) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />

        {/* warm bottom glow */}
        <div
          className="pointer-events-none absolute bottom-0 left-1/2 h-2/3 w-3/4 -translate-x-1/2 translate-y-1/3"
          style={{
            background:
              "radial-gradient(ellipse at center bottom, rgba(255, 214, 150, 0.85), transparent 70%)",
            filter: "blur(14px)",
          }}
        />

        {/* floating dashed icon tiles */}
        {tiles.map(({ Icon, className, size }, i) => (
          <div
            key={i}
            className={`pointer-events-none absolute hidden items-center justify-center rounded-xl border border-dashed border-white/50 text-white/80 md:flex ${className}`}
            style={{
              width: size,
              height: size,
              animation: `cfhero-float ${5 + i}s ease-in-out ${i * 0.4}s infinite`,
            }}
          >
            <Icon className="h-5 w-5" strokeWidth={1.5} />
          </div>
        ))}

        {/* content */}
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          {/* pill */}
          <div className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-white/40 px-4 py-1.5 text-[11px] text-white/90 sm:text-xs">
            <span className="font-medium">Jenvu 2026</span>
            <span className="text-white/50">·</span>
            <span>The Agentic Trading Network of the Year</span>
            <span className="text-white/50">·</span>
            <span>Live 24/7</span>
            <span className="text-white/50">·</span>
            <Link to="/founding" className="font-medium underline underline-offset-2 hover:text-white">
              Register
            </Link>
          </div>

          {/* headline */}
          <h1 className="mt-8 text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-5xl md:text-[56px]">
            Everything we learned from powering gold trading—yours by default
          </h1>

          {/* subtext */}
          <p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-white/90 sm:text-base">
            One platform for your signals, voice agent, and trading desk.
            <br />
            Deploy, analyze, and scale without managing infrastructure.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/founding"
              className="inline-flex items-center justify-center rounded-full bg-white px-7 py-3 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-100"
            >
              Start trading for free
            </Link>
            <Link
              to="/pricing"
              className="inline-flex items-center justify-center rounded-full border border-white/50 bg-white/15 px-7 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/25"
            >
              View pricing
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
