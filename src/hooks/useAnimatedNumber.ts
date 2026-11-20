import { useEffect, useRef, useState } from "react";

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Last value each number finished on, kept for this browser tab only.
 * Coming back to a page inside the dashboard starts from it (no replay);
 * a full page load or refresh clears it, so the count-up plays again.
 */
const lastShown = new Map<string, number>();

/**
 * Smoothly rolls a number to its new value: counts up from 0 the first time it is shown
 * in this tab, then from the old value to the new one only when the value changes.
 * `flash` is "up"/"down" for a moment after a later update (not the first count-up).
 * Users with reduced motion get the final value straight away.
 */
export function useAnimatedNumber(target: number, ready: boolean, key: string, duration = 900) {
  const remembered = lastShown.get(key);
  const [value, setValue] = useState(remembered ?? 0);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const current = useRef(remembered ?? 0);
  const started = useRef(remembered !== undefined);

  useEffect(() => {
    if (!ready || !Number.isFinite(target)) return;
    const from = current.current;
    const first = !started.current;
    started.current = true;
    lastShown.set(key, target);
    if (from === target) {
      setValue(target);
      return;
    }
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let flashTimer: ReturnType<typeof setTimeout> | undefined;
    if (!first) {
      setFlash(target > from ? "up" : "down");
      flashTimer = setTimeout(() => setFlash(null), 1200);
    }
    if (reduce) {
      current.current = target;
      setValue(target);
      return () => clearTimeout(flashTimer);
    }
    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const v = from + (target - from) * easeOutCubic(t);
      current.current = v;
      setValue(v);
      if (t < 1) raf = requestAnimationFrame(step);
      else current.current = target;
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(flashTimer);
      // Leaving mid-roll: the next visit settles on the final value instead of replaying.
      current.current = target;
    };
  }, [target, ready, key, duration]);

  return { value, flash };
}
