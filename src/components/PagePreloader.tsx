import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";

/** Animated Jenvu logo shown only when a page change takes longer than 250ms. */
export function PagePreloader() {
  const loading = useRouterState({ select: (s) => s.status === "pending" });
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!loading) {
      setShow(false);
      return;
    }
    const t = window.setTimeout(() => setShow(true), 250);
    return () => window.clearTimeout(t);
  }, [loading]);
  if (!show) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center bg-background/70 backdrop-blur-sm" role="status" aria-label="Loading">
      <div className="relative h-16 w-16">
        <span className="absolute inset-0 animate-ping rounded-full bg-gc-blue/20" />
        <img src="/favicon.png" alt="" className="relative h-16 w-16 animate-pulse rounded-2xl object-contain" />
      </div>
    </div>
  );
}
