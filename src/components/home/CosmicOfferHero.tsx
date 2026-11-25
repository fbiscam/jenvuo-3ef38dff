import * as React from "react";
import { Link } from "@tanstack/react-router";

/** Countdown to the end of the current month (Founding seats + yearly offer reset monthly). */
function monthEnd(now: Date) {
  return new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0);
}

function useCountdown() {
  const [left, setLeft] = React.useState<number | null>(null);
  React.useEffect(() => {
    const tick = () => setLeft(Math.max(0, monthEnd(new Date()).getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  const s = Math.floor((left ?? 0) / 1000);
  return [Math.floor(s / 86400), Math.floor((s % 86400) / 3600), Math.floor((s % 3600) / 60), s % 60];
}

export function CosmicOfferHero() {
  const parts = useCountdown();
  const labels = ["Days", "Hours", "Mins", "Secs"];
  return (
    <section className="cosmic-hero relative overflow-hidden">
      <div aria-hidden className="cosmic-hero__disk" />
      <div aria-hidden className="cosmic-hero__core" />
      <div aria-hidden className="cosmic-hero__dust" />
      <div className="site-edge relative z-10 mx-auto grid min-h-[560px] items-center gap-10 py-20 md:grid-cols-2">
        <div>
          <h1 className="cosmic-hero__title text-5xl font-semibold leading-[1.02] tracking-tight md:text-7xl">
            Trade gold<br />with an edge
          </h1>
          <p className="mt-6 max-w-md text-lg text-[color:var(--cosmic-muted)]">
            Live Terminal, JX Bot and the AI API in one workspace. Yearly plans save 22% — this month's Founding seats close soon.
          </p>
        </div>
        <div className="cosmic-hero__card rounded-3xl p-7 md:p-9">
          <p className="text-sm uppercase tracking-[0.2em] text-[color:var(--cosmic-muted)]">Offer ends in</p>
          <p className="mt-2 text-3xl font-semibold text-[color:var(--cosmic-ink)]">Save 22% yearly</p>
          <div className="mt-6 grid grid-cols-4 gap-3">
            {parts.map((v, i) => (
              <div key={labels[i]} className="cosmic-hero__box rounded-2xl py-4 text-center">
                <div className="text-3xl font-semibold tabular-nums text-[color:var(--cosmic-ink)]">
                  {String(v).padStart(2, "0")}
                </div>
                <div className="mt-1 text-xs text-[color:var(--cosmic-muted)]">{labels[i]}</div>
              </div>
            ))}
          </div>
          <Link to="/pricing" className="cosmic-hero__cta mt-7 block rounded-full py-4 text-center text-base font-semibold">
            Explore plans
          </Link>
        </div>
      </div>
    </section>
  );
}
