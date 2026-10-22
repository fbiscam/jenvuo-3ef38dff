import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldCheck, X } from "lucide-react";
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
    <section className="mb-6 flex items-start gap-4 rounded-lg border border-gc-line bg-gc-blue-soft p-5">
      <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-gc-blue" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <h2 className="text-[17px] font-medium text-gc-ink">Protect your account with 2FA</h2>
        <p className="mt-1 text-[14px] text-gc-ink-muted">
          Turn on two-factor sign-in with an authenticator app. Even if someone gets your password, they can't sign in without your phone.
        </p>
        <Link
          to="/dashboard/profile"
          className="mt-3 inline-flex items-center rounded-md bg-gc-blue px-4 py-2 text-[14px] font-medium text-gc-on-blue hover:bg-gc-blue-hover"
        >
          Turn on 2FA
        </Link>
      </div>
      <button type="button" onClick={dismiss} aria-label="Remind me tomorrow" className="rounded p-1 text-gc-ink-muted hover:bg-gc-canvas">
        <X className="h-4 w-4" />
      </button>
    </section>
  );
}
