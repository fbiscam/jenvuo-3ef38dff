import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const DISMISS_KEY = "jenvu_2fa_reminder_day";
const today = () => new Date().toISOString().slice(0, 10);

/** Daily card asking accounts without an authenticator app to turn on 2FA. */
export default function TwoFactorReminder() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY) === today()) return;
    let live = true;
    void supabase.auth.mfa.listFactors().then(({ data }) => {
      const hasVerified = (data?.all ?? []).some((f) => f.status === "verified");
      if (live && !hasVerified) setShow(true);
    });
    return () => { live = false; };
  }, []);

  if (!show) return null;
  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, today());
    setShow(false);
  };

  return (
    <section className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-gc-line bg-background py-2 pl-4 pr-4 sm:pl-5 md:pr-5">
      <ShieldCheck className="h-5 w-5 shrink-0 text-gc-ink-muted" aria-hidden="true" />
      <p className="min-w-0 flex-1 text-[13px] text-gc-ink sm:text-[14px]">
        <span className="font-medium">Protect your account with 2FA</span>
        <span className="text-gc-ink-muted"> — Turn on sign-in with an authenticator app so only your phone can sign in.</span>
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={dismiss}
          className="h-8 rounded-full border border-gc-line bg-background px-4 text-[13px] font-medium text-gc-ink hover:bg-gc-surface"
        >
          Dismiss
        </button>
        <Link
          to="/dashboard/profile"
          className="inline-flex h-8 items-center rounded-full bg-gc-blue-deep px-4 text-[13px] font-medium text-gc-on-blue hover:bg-gc-navy"
        >
          Turn on 2FA
        </Link>
      </div>
    </section>
  );
}
