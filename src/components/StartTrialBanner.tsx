import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Gift, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";

const DISMISS_KEY = "jenvu:start-trial-banner-dismissed";

/** Thin top strip offering the one-time free trial ($100 credit + 14 days Pro). */
export default function StartTrialBanner() {
  const { user } = useAuth();
  const { refresh } = useCredits();
  const [eligible, setEligible] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    setDismissed(window.localStorage.getItem(`${DISMISS_KEY}:${user?.id ?? ""}`) === "1");
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    void supabase.rpc("free_trial_eligible").then(({ data, error }) => {
      if (!cancelled && !error) setEligible(data === true);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (!user || !eligible || dismissed) return null;

  const dismiss = () => {
    window.localStorage.setItem(`${DISMISS_KEY}:${user.id}`, "1");
    setDismissed(true);
  };

  const start = async () => {
    setStarting(true);
    const { error } = await supabase.rpc("claim_free_trial");
    setStarting(false);
    if (error) {
      toast.error(error.message || "Could not start your free trial. Please try again.");
      return;
    }
    setEligible(false);
    void refresh();
    toast.success("Your free trial has started: $100 credit and 14 days of Pro.");
  };

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-gc-line bg-background px-4 py-2 sm:px-5">
      <Gift className="h-5 w-5 shrink-0 text-gc-ink-muted" aria-hidden="true" />
      <p className="min-w-0 flex-1 text-[13px] text-gc-ink sm:text-[14px]">
        Start your Free Trial with $100 in credit and 14 days of Pro. Don't worry, you won't be charged when it ends.{" "}
        <Link to="/pricing" className="text-gc-blue-deep underline underline-offset-2 hover:text-gc-navy">
          Learn more
        </Link>
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={dismiss}
          className="h-8 rounded-full border border-gc-line bg-background px-4 text-[13px] font-medium text-gc-ink hover:bg-gc-surface"
        >
          Dismiss
        </button>
        <button
          type="button"
          onClick={start}
          disabled={starting}
          className="inline-flex h-8 items-center gap-1.5 rounded-full bg-gc-blue-deep px-4 text-[13px] font-medium text-gc-on-blue hover:bg-gc-navy disabled:opacity-60"
        >
          {starting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Start free
        </button>
      </div>
    </div>
  );
}
