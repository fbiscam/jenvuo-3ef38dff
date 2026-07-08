import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Sparkles, ArrowRight, ArrowLeft, X, CheckCircle2 } from "lucide-react";

type Step = {
  selector: string;
  title: string;
  body: string;
  placement?: "bottom" | "top" | "left" | "right";
};

const STORAGE_KEY = "jenvu.onboarding.v1.done";

const STEPS: Step[] = [
  {
    selector: '[data-tour="launch-ai"]',
    title: "Launch the AI Desk",
    body: "Start a new voice or chat session with your gold-trading copilot. This is your fastest path to a signal.",
    placement: "bottom",
  },
  {
    selector: '[data-tour="analytics"]',
    title: "Track your edge",
    body: "Credits, win-rate and activity update live. Use the range picker to zoom into the last 24 hours or 90 days.",
    placement: "bottom",
  },
  {
    selector: '[data-tour="market-pulse"]',
    title: "Market Pulse",
    body: "Live XAU pairs and DXY, streamed in real time. Tap any row to open it in the Signal Desk.",
    placement: "top",
  },
  {
    selector: '[data-tour="workspace"]',
    title: "Your Workspace",
    body: "Journal, Alerts, Referrals, Billing, Security — everything lives one tab away. Red dots show what's new.",
    placement: "top",
  },
  {
    selector: '[data-tour="plan-pill"]',
    title: "Manage your plan",
    body: "Upgrade, redeem a coupon or top up credits from Billing anytime. Click your plan badge to jump in.",
    placement: "bottom",
  },
];

type Rect = { top: number; left: number; width: number; height: number };

function useElementRect(selector: string, tick: number): Rect | null {
  const [rect, setRect] = useState<Rect | null>(null);
  useLayoutEffect(() => {
    const el = document.querySelector(selector) as HTMLElement | null;
    if (!el) { setRect(null); return; }
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    const measure = () => {
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    // measure after scroll settles
    const t1 = window.setTimeout(measure, 300);
    const t2 = window.setTimeout(measure, 600);
    measure();
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [selector, tick]);
  return rect;
}

export default function OnboardingTour({ forceOpen = false, onClose }: { forceOpen?: boolean; onClose?: () => void }) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const [tick, setTick] = useState(0);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    if (forceOpen) { setOpen(true); setI(0); return; }
    try {
      const done = window.localStorage.getItem(STORAGE_KEY);
      if (!done) {
        const t = window.setTimeout(() => setOpen(true), 700);
        return () => window.clearTimeout(t);
      }
    } catch {}
  }, [mounted, forceOpen]);

  const step = STEPS[i];
  const rect = useElementRect(step?.selector ?? "", tick);

  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 400);
    return () => window.clearInterval(id);
  }, [open, i]);

  const finish = (completed: boolean) => {
    try { window.localStorage.setItem(STORAGE_KEY, completed ? "1" : "skipped"); } catch {}
    setOpen(false);
    onClose?.();
  };

  const tooltipStyle = useMemo(() => {
    if (!rect) {
      return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" } as React.CSSProperties;
    }
    const placement = step.placement ?? "bottom";
    const vw = window.innerWidth;
    const tw = Math.min(360, vw - 24);
    let top = 0, left = 0;
    if (placement === "bottom") {
      top = rect.top + rect.height + 14;
      left = rect.left + rect.width / 2 - tw / 2;
    } else if (placement === "top") {
      top = rect.top - 14;
      left = rect.left + rect.width / 2 - tw / 2;
      return { top, left: Math.max(12, Math.min(left, vw - tw - 12)), width: tw, transform: "translateY(-100%)" } as React.CSSProperties;
    } else if (placement === "right") {
      top = rect.top + rect.height / 2;
      left = rect.left + rect.width + 14;
      return { top, left, width: tw, transform: "translateY(-50%)" } as React.CSSProperties;
    } else {
      top = rect.top + rect.height / 2;
      left = rect.left - 14;
      return { top, left, width: tw, transform: "translate(-100%, -50%)" } as React.CSSProperties;
    }
    return { top, left: Math.max(12, Math.min(left, vw - tw - 12)), width: tw } as React.CSSProperties;
  }, [rect, step]);

  if (!mounted || !open || !step) return null;

  const pad = 8;
  const hole = rect
    ? { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }
    : null;

  const isLast = i === STEPS.length - 1;

  return createPortal(
    <div className="fixed inset-0 z-[100]" role="dialog" aria-label="Onboarding tour">
      {/* SVG mask: dark overlay with a cutout around the target */}
      <svg className="absolute inset-0 h-full w-full pointer-events-auto" onClick={() => finish(false)}>
        <defs>
          <mask id="tour-mask">
            <rect width="100%" height="100%" fill="white" />
            {hole && (
              <rect
                x={hole.left}
                y={hole.top}
                width={hole.width}
                height={hole.height}
                rx={12}
                ry={12}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(9,9,11,0.62)" mask="url(#tour-mask)" />
        {hole && (
          <rect
            x={hole.left}
            y={hole.top}
            width={hole.width}
            height={hole.height}
            rx={12}
            ry={12}
            fill="none"
            stroke="rgba(255,255,255,0.85)"
            strokeWidth={2}
            className="pointer-events-none"
            style={{ filter: "drop-shadow(0 0 24px rgba(250, 204, 21, 0.35))" }}
          />
        )}
      </svg>

      {/* Tooltip card */}
      <div
        className="absolute animate-in fade-in zoom-in-95 duration-200"
        style={tooltipStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rounded-xl border border-zinc-200 bg-white shadow-2xl ring-1 ring-black/5 overflow-hidden">
          {/* accent bar */}
          <div className="h-1 w-full bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500" />
          <div className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-zinc-900 text-white">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                    Step {i + 1} of {STEPS.length}
                  </div>
                  <div className="text-[14px] font-semibold text-zinc-900 leading-tight">{step.title}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => finish(false)}
                aria-label="Close tour"
                className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-3 text-[13px] leading-relaxed text-zinc-600">{step.body}</p>

            {/* progress dots */}
            <div className="mt-4 flex items-center gap-1.5">
              {STEPS.map((_, idx) => (
                <span
                  key={idx}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === i ? "w-6 bg-zinc-900" : idx < i ? "w-1.5 bg-zinc-400" : "w-1.5 bg-zinc-200"
                  }`}
                />
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => finish(false)}
                className="text-[12px] font-medium text-zinc-500 hover:text-zinc-800"
              >
                Skip tour
              </button>
              <div className="flex items-center gap-2">
                {i > 0 && (
                  <button
                    type="button"
                    onClick={() => setI((n) => Math.max(0, n - 1))}
                    className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-[12px] font-medium text-zinc-700 hover:bg-zinc-50"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Back
                  </button>
                )}
                {!isLast ? (
                  <button
                    type="button"
                    onClick={() => setI((n) => Math.min(STEPS.length - 1, n + 1))}
                    className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-zinc-800"
                  >
                    Next <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => finish(true)}
                    className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-amber-500 to-yellow-500 px-3 py-1.5 text-[12px] font-semibold text-zinc-950 shadow-sm hover:brightness-105"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Got it
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function resetOnboardingTour() {
  try { window.localStorage.removeItem(STORAGE_KEY); } catch {}
}
