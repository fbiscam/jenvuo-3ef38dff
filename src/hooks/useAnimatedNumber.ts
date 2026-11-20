import { useEffect, useRef, useState } from "react";

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Smoothly rolls a number to its new value: counts up from 0 on first show,
 * then from the old value to the new one whenever it changes.
 * `flash` is "up"/"down" for a moment after a later update (not the first count-up).
 * Users with reduced motion get the final value straight away.
 */
export function useAnimatedNumber(target: number, ready: boolean, duration = 900) {
  const [value, setValue] = useState(0);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const current = useRef(0);
  const started = useRef(false);

  useEffect(() => {
    if (!ready || !Number.isFinite(target)) return;
    const from = current.current;
    const first = !started.current;
    started.current = true;
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
    };
  }, [target, ready, duration]);

  return { value, flash };
}
