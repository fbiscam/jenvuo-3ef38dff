import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useAuthUser } from "@/hooks/useAuthUser";
import CreditsPill from "@/components/CreditsPill";


const MONO = "font-['JetBrains_Mono',ui-monospace,monospace]";

export default function HeaderAuthButtons({ signInOnly = false }: { signInOnly?: boolean } = {}) {
  const { user } = useAuthUser();
  // Avoid SSR/CSR hydration mismatch: server has no localStorage, so it
  // always renders the signed-out UI. Only reveal the signed-in variant
  // after the client has mounted.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (mounted && user) {

    return (
      <div className="flex shrink-0 items-center gap-2">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted sm:gap-2 sm:px-3.5 sm:text-sm"
        >
          Dashboard
          <span className={`${MONO} text-[10px] opacity-70`}>↗</span>
        </Link>
      </div>
    );
  }

  if (signInOnly) {
    return (
      <div className="flex shrink-0 items-center gap-2">
        <Link
          to="/auth"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted sm:gap-2 sm:px-3.5 sm:text-sm"
        >
          Sign In
          <span className={`${MONO} text-[10px] opacity-70`}>→</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      <Link
        to="/auth"
        className="hidden items-center rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted sm:inline-flex"
      >
        Sign In
      </Link>
      <Link
        to="/founding"
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted sm:gap-2 sm:px-3.5 sm:text-sm"
      >
        Apply
        <span className={`${MONO} text-[10px] opacity-70`}>→</span>
      </Link>
    </div>
  );
}
