import { useEffect, useState } from "react";
import { Gift, Loader2 } from "lucide-react";
import { useFreeTrial } from "@/hooks/useFreeTrial";
import { BANNER_PRIORITY, useBannerSlot } from "@/lib/banner-slot";

const DISMISS_KEY = "jenvu:start-trial-banner-dismissed";

/** Thin top strip offering the one-time free trial ($100 credit + 14 days Pro). */
export default function StartTrialBanner() {
  const { user, eligible, starting, start } = useFreeTrial();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(window.localStorage.getItem(`${DISMISS_KEY}:${user?.id ?? ""}`) === "1");
  }, [user?.id]);

  const active = useBannerSlot("trial", BANNER_PRIORITY.trial, !!user && eligible && !dismissed);
  if (!user || !eligible || dismissed || !active) return null;

  const dismiss = () => {
    window.localStorage.setItem(`${DISMISS_KEY}:${user.id}`, "1");
    setDismissed(true);
  };

  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 border-b border-gc-line bg-background py-1 pl-3.5 pr-4 sm:gap-x-4 sm:pl-5 md:pr-5">
      <Gift className="h-4 w-4 shrink-0 text-gc-ink-muted" aria-hidden="true" />
      <p className="min-w-0 line-clamp-2 text-[12px] leading-snug sm:line-clamp-none sm:truncate text-gc-ink sm:text-[12.5px]">
        <span className="font-medium">Free trial</span>
        <span className="text-gc-ink-muted"> — $100 in credit and 14 days of Pro. You won't be charged when it ends.</span>
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={dismiss}
          className="h-6 rounded-full border border-gc-line bg-background px-3 text-[12px] font-medium text-gc-ink hover:bg-gc-surface"
        >
          Dismiss
        </button>
        <button
          type="button"
          onClick={() => void start()}
          disabled={starting}
          className="inline-flex h-6 items-center gap-1.5 rounded-full bg-gc-blue-deep px-3 text-[12px] font-medium text-gc-on-blue hover:bg-gc-navy disabled:opacity-60"
        >
          {starting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Start free
        </button>
      </div>
    </div>
  );
}
