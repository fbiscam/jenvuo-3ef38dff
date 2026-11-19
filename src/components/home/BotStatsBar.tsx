import { useEffect, useRef, useState, type ReactNode } from "react";
import { DAILY_DRAWDOWN_PCT } from "@/lib/mt5-licenses";
import { JxFace } from "@/components/jxbot/JxBotFeatures";
import haseebWordmark from "@/assets/haseeb-grey.png.asset.json";

/** Supplied HASEEB wordmark in the owner's grey, sized to the label text. */
function HaseebMark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex h-[13px] w-[85px] max-w-full shrink-0 items-center ${className}`}>
      <img src={haseebWordmark.url} alt="HASEEB" className="h-full w-full object-contain" />
    </span>
  );
}

function JxBotLogo() {
  return <JxFace className="relative -top-1 h-7 w-7 shrink-0 bg-gc-ink" eyes="bg-background" />;
}

export function formatTokens(n: number): string {
  if (n >= 1e9) return `${Math.floor(n / 1e9)}B+`;
  if (n >= 1e6) return `${Math.floor(n / 1e6)}M+`;
  if (n >= 1e3) return `${Math.floor(n / 1e3)}K+`;
  return String(n);
}

/** Homepage stats: fixed capacity/seat figures set by the owner, plus JX Bot rules. No win-rate claims. */
export function BotStatsBar() {
  const items: { key: string; value: string; label: ReactNode; to: number; suffix: ReactNode }[] = [
    { key: "tokens", value: "479M+", to: 479, suffix: "M+", label: "Monthly API token processing" },
    {
      key: "founding",
      value: "99+",
      to: 99,
      suffix: "+",
      label: (
        <span className="inline-flex flex-wrap items-center gap-3">
          Founding seats by <HaseebMark />
        </span>
      ),
    },
    {
      key: "bot",
      value: "99% Wins",
      to: 99,
      suffix: <>% <span className="font-[Sora,sans-serif]">Wins</span></>,
      label: (
        <span className="inline-flex items-start gap-3">
          <JxBotLogo />
          <span>JX Bot: automated EUR/USD Strategies</span>
        </span>
      ),
    },
  ];

  const { ref, progress, shown } = useCountUp(1500);

  return (
    <section ref={ref} className="site-edge w-full px-5 py-10 sm:py-14">
      <div className="mx-auto grid max-w-7xl grid-cols-1 border-y border-gc-line py-2 sm:grid-cols-3 sm:py-10">
        {items.map((it, i) => (
          <div
            key={it.key}
            className={`py-7 transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none sm:py-1 ${shown ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"} ${i > 0 ? "border-t border-gc-line sm:border-l sm:border-t-0 sm:pl-9" : ""}`}
            style={{ transitionDelay: `${i * 120}ms` }}
          >
            <div className="font-stat-heading tracking-normal text-[40px] font-[450] leading-none text-gc-ink tabular-nums sm:text-[48px] sm:leading-[48px]"><span aria-hidden="true">{Math.round(it.to * progress)}{it.suffix}</span>
              <span className="sr-only">{it.value}</span></div>
            <div className="mt-6 font-sans text-[13px] text-gc-ink-muted">{it.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Counts 0 → 1 with an ease-out curve the first time the section scrolls into view (runs once).
 * Server render and reduced-motion users get the final values straight away.
 */
function useCountUp(durationMs: number) {
  const ref = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(1);
  const [shown, setShown] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setProgress(0);
    setShown(false);
    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        setShown(true);
        const start = performance.now();
        const step = (now: number) => {
          const t = Math.min(1, (now - start) / durationMs);
          setProgress(1 - Math.pow(1 - t, 3));
          if (t < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [durationMs]);

  return { ref, progress, shown };
}
