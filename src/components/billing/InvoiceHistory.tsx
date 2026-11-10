import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listMyOrders } from "@/lib/payments.functions";
import { networkMeta, type PaymentOrder } from "@/lib/payments/shared";
import { supabase } from "@/integrations/supabase/client";
import { ListFilter } from "lucide-react";
import { ConsoleSelect } from "@/components/dashboard/ConsoleSelect";

const MONO = "font-sans";

import { invoiceNo } from "@/lib/invoice-pdf";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}



export default function InvoiceHistory({ variant = "list" }: { variant?: "list" | "table" } = {}) {
  const listFn = useServerFn(listMyOrders);
  const [email, setEmail] = useState<string>("");
  const [fullName, setFullName] = useState<string>("");
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setEmail(data.user?.email ?? "");
      if (!data.user) return;
      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", data.user.id)
        .maybeSingle();
      setFullName(prof?.full_name ?? "");
    });
  }, []);

  const { data } = useQuery({
    queryKey: ["my-payment-orders"],
    queryFn: () => listFn({} as never),
    refetchInterval: 120_000,
    refetchIntervalInBackground: false,
  });


  // Every payment, newest first — successful, waiting, rejected or expired.
  const history = useMemo(
    () => [...(data ?? [])].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)),
    [data],
  );

  async function download(o: PaymentOrder) {
    setBusy(o.id);
    try {
      const { buildInvoicePdf } = await import("@/lib/invoice-pdf");
      const doc = await buildInvoicePdf(o, { fullName, email });
      doc.save(`${invoiceNo(o)}.pdf`);
    } finally {
      setBusy(null);
    }
  }


  if (variant === "table") {
    const rows = filter === "all" ? history : history.filter((o) => o.status === filter);
    const present = Array.from(new Set(history.map((o) => o.status)));
    return (
      <section id="invoices" className="scroll-mt-24">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-[20px] font-normal text-gc-ink">Invoices</h2>
          <ConsoleSelect
            open={filterOpen}
            onToggle={() => setFilterOpen((v) => !v)}
            plain
            hideArrows
            align="right"
            ariaLabel="Filter invoices"
            icon={<ListFilter className="h-4 w-4" />}
            valueLabel={filter === "all" ? "Filter" : (STATUS[filter]?.label ?? filter)}
            value={filter}
            options={[{ value: "all", label: "All" }, ...present.map((st) => ({ value: st, label: STATUS[st]?.label ?? st }))]}
            onSelect={(v) => { setFilter(v); setFilterOpen(false); }}
          />
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-[14px]">
            <thead>
              <tr className="border-b border-gc-line text-[12px] text-gc-ink-muted">
                <th className="px-2 py-3 first:pl-0 last:pr-0 font-normal">Invoice Reference</th>
                <th className="px-2 py-3 first:pl-0 last:pr-0 font-normal">Date</th>
                <th className="px-2 py-3 first:pl-0 last:pr-0 font-normal">Type</th>
                <th className="px-2 py-3 first:pl-0 last:pr-0 font-normal">Amount</th>
                <th className="px-2 py-3 first:pl-0 last:pr-0 font-normal">Status</th>
                <th className="px-2 py-3 first:pl-0 last:pr-0" aria-label="Receipt" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gc-line">
              {rows.length === 0 ? (
                <tr><td colSpan={6} className="px-2 py-4 text-center text-gc-ink-muted">No invoices found.</td></tr>
              ) : rows.map((o) => {
                const st = STATUS[o.status] ?? { label: o.status, cls: "bg-gc-surface text-gc-ink-muted" };
                return (
                  <tr key={o.id}>
                    <td className="px-2 py-3 first:pl-0 last:pr-0 text-gc-ink">{invoiceNo(o)}</td>
                    <td className="px-2 py-3 first:pl-0 last:pr-0 text-gc-ink-muted">{fmtDate(o.created_at)}</td>
                    <td className="px-2 py-3 first:pl-0 last:pr-0 text-gc-ink">{o.target_plan_id ? `${o.target_plan_id.charAt(0).toUpperCase()}${o.target_plan_id.slice(1)} plan` : "Credit top-up"}</td>
                    <td className="px-2 py-3 first:pl-0 last:pr-0 tabular-nums text-gc-ink">${Number(o.pay_amount_usd).toFixed(2)}</td>
                    <td className="px-2 py-3 first:pl-0 last:pr-0"><span className={`rounded-full px-2.5 py-0.5 text-[12px] font-medium ${st.cls}`}>{st.label}</span></td>
                    <td className="px-2 py-3 first:pl-0 last:pr-0 text-right">
                      {o.status === "approved" && (
                        <button type="button" onClick={() => download(o)} disabled={busy === o.id} className="text-[13px] text-gc-ink hover:underline disabled:opacity-50">
                          {busy === o.id ? "Preparing…" : "Receipt"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900">&nbsp; Transaction history</h2>
        <p className="mt-0.5 text-xs text-zinc-500">Every payment you start shows here. Successful ones have a receipt.</p>
        {history.length === 0 ? (
          <p className="mt-4 text-xs text-zinc-500">No transactions yet.</p>
        ) : (
          <div className="mt-3 divide-y divide-zinc-100">
            {history.map((o) => {
              const st = STATUS[o.status] ?? { label: o.status, cls: "bg-zinc-100 text-zinc-700" };
              return (
                <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <div className="text-[12px] font-medium text-zinc-900">
                      {o.target_plan_id ? `${o.target_plan_id.charAt(0).toUpperCase()}${o.target_plan_id.slice(1)} plan` : "Credit top-up"}
                      <span className={`${MONO} ml-2 text-[10px] text-zinc-500`}>{invoiceNo(o)}</span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-zinc-500">
                      {fmtDate(o.created_at)} · {networkMeta(o.network).label}
                      {o.status === "rejected" && o.reject_reason ? ` · ${o.reject_reason}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`${MONO} text-[12px] font-semibold text-zinc-900`}>${Number(o.pay_amount_usd).toFixed(2)}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${st.cls}`}>{st.label}</span>
                    {o.status === "approved" && (
                      <button
                        type="button"
                        onClick={() => download(o)}
                        disabled={busy === o.id}
                        className="rounded-lg border border-black/10 bg-white px-3 py-1.5 text-[11px] font-medium text-black transition hover:bg-zinc-50 disabled:opacity-50"
                      >
                        {busy === o.id ? "Preparing…" : "Receipt"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

const STATUS: Record<string, { label: string; cls: string }> = {
  approved: { label: "Paid", cls: "bg-emerald-50 text-emerald-700" },
  pending: { label: "Waiting for payment", cls: "bg-amber-50 text-amber-700" },
  submitted: { label: "Checking payment", cls: "bg-blue-50 text-blue-700" },
  rejected: { label: "Rejected", cls: "bg-red-50 text-red-700" },
  expired: { label: "Expired", cls: "bg-zinc-100 text-zinc-600" },
  cancelled: { label: "Cancelled", cls: "bg-zinc-100 text-zinc-600" },
};
