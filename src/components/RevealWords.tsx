import * as React from "react";

/** Plain headings: kept as a pass-through so existing heading markup stays unchanged. */
export function RevealWords({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
