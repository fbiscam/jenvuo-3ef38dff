import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { renewalState, type RenewalRow, type RenewalState } from "@/lib/renewal";

const name = (id: string) => id.charAt(0).toUpperCase() + id.slice(1);

/** Dashboard strip: founding renewal due (3-day notice) or plan moved to Free. */
export default function RenewalNotice() {
  const [state, setState] = useState<RenewalState>(null);

  useEffect(() => {
    let live = true;
    const load = async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await (supabase as any)
        .from("user_subscriptions")
        .select("plan_id, renewal_due_at, lapsed_plan_id")
        .eq("user_id", u.user.id)
        .maybeSingle();
      if (live) setState(renewalState((data as RenewalRow) ?? null));
    };
    load();
    const t = setInterval(load, 5 * 60_000);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, []);

  if (!state) return null;
  const text =
    state.kind === "due"
      ? `Your ${name(state.plan)} renewal is due. Pay by ${new Date(state.deadline).toLocaleString()} or your account moves to the Free plan.`
      : `Your ${name(state.plan)} renewal wasn't paid, so you're on the Free plan. Pay the renewal to get ${name(state.plan)} back.`;

  return (
    <div role="alert" className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-gc-line bg-gc-surface py-2 pl-4 pr-4 sm:pl-5">
      <AlertTriangle className="h-5 w-5 shrink-0 text-gc-red" aria-hidden="true" />
      <p className="min-w-0 flex-1 text-[13px] text-gc-ink sm:text-[14px]">{text}</p>
      <Link
        to="/dashboard/pay"
        search={{ purchase: "plan", renew: state.plan } as never}
        className="inline-flex h-8 shrink-0 items-center rounded-full bg-gc-blue px-4 text-[13px] font-medium text-gc-on-blue hover:bg-gc-blue-hover"
      >
        Pay renewal
      </Link>
    </div>
  );
}
