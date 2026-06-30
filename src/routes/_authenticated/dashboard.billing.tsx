import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Check, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/billing")({
  component: Billing,
});

const TIERS = [
  { id: "free", name: "Free", price: "$0", features: ["1 voice query/day", "Delayed alerts (4h)", "Public insights"] },
  { id: "pro", name: "Pro", price: "$49", features: ["Unlimited voice & signal", "Realtime A+ email & push", "Full insights + history", "Trade journal"] },
  { id: "elite", name: "Elite", price: "$149", features: ["Everything in Pro", "Priority A+ alerts (< 30s)", "Multi-pair scanner", "API access", "Priority support"] },
];

function Billing() {
  const [plan, setPlan] = useState<string>("free");

  useEffect(() => {
    (async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      const { data } = await supabase.from("profiles").select("plan").eq("id", user.user.id).maybeSingle();
      if (data?.plan) setPlan(data.plan);
    })();
  }, []);

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-zinc-200 bg-gradient-to-br from-zinc-50 to-white p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-500">Current plan</div>
            <div className="mt-2 flex items-center gap-3">
              <h2 className="text-2xl font-semibold capitalize">{plan}</h2>
              {plan === "free" && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-800">
                  Limited
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-zinc-500">
              {plan === "free"
                ? "Upgrade to unlock realtime A+ alerts, unlimited signals, and the trade journal."
                : "Your plan renews automatically. Manage billing via the customer portal."}
            </p>
          </div>
          <Link to="/pricing" className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800">
            {plan === "free" ? "Upgrade" : "Manage plan"}
          </Link>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Plans</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {TIERS.map((t) => {
            const current = plan === t.id;
            return (
              <div
                key={t.id}
                className={`rounded-2xl border p-5 ${current ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white"}`}
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-semibold">{t.name}</h4>
                  {t.id === "pro" && !current && <Sparkles className="h-4 w-4 text-amber-500" />}
                </div>
                <div className={`mt-2 text-2xl font-bold ${current ? "text-white" : "text-zinc-900"}`}>
                  {t.price}
                  <span className={`text-sm font-normal ${current ? "text-zinc-400" : "text-zinc-500"}`}>/mo</span>
                </div>
                <ul className={`mt-4 space-y-2 text-xs ${current ? "text-zinc-300" : "text-zinc-600"}`}>
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-1.5">
                      <Check className="mt-0.5 h-3 w-3 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                {current && <div className="mt-4 rounded-md bg-white/10 px-2 py-1 text-center text-[10px] uppercase tracking-wider">Current</div>}
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/50 p-6 text-center">
        <p className="text-xs text-zinc-500">
          Invoices and payment method management will be available once billing is fully activated.
        </p>
      </section>
    </div>
  );
}
