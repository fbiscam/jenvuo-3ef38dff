import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listMyOrders } from "@/lib/payments.functions";
import { networkMeta, type PaymentOrder } from "@/lib/payments/shared";
import { supabase } from "@/integrations/supabase/client";
import { ListFilter } from "lucide-react";
import { ConsoleSelect } from "@/components/dashboard/ConsoleSelect";

const MONO = "font-sans";

function invoiceNo(o: PaymentOrder) {
  return `JV-${new Date(o.created_at).getFullYear()}-${o.id.slice(0, 8).toUpperCase()}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function fmtDateLong(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

async function loadLogo(): Promise<string | null> {
  try {
    const res = await fetch("/favicon.png");
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = () => resolve(null);
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
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
      const [{ jsPDF }, logo] = await Promise.all([import("jspdf"), loadLogo()]);
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const W = doc.internal.pageSize.getWidth();
      const L = 48;
      const R = W - L;
      const net = networkMeta(o.network);
      // Built-in Helvetica renders crisp vector text in every PDF viewer.
      const F = "helvetica";

      const date = fmtDateLong(o.decided_at ?? o.created_at);
      const paid = Number(o.pay_amount_usd);
      const bonus = Number(o.bonus_usd);
      const credit = Number(o.credit_usd);

      // ── Header: big INVOICE title left, company block + logo right ──────
      if (logo) {
        try {
          doc.addImage(logo, "PNG", R - 34, 30, 34, 34, undefined, "NONE");
        } catch {
          /* ignore */
        }
      }

      doc.setFont(F, "bold");
      doc.setFontSize(30);
      doc.setTextColor(17, 17, 17);
      doc.text("INVOICE", L, 108);

      doc.setFont(F, "normal");
      doc.setFontSize(13);
      doc.setTextColor(17, 17, 17);
      doc.text("Jenvu", R, 96, { align: "right" });
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      doc.text("jenvu.com · info@jenvu.com", R, 116, { align: "right" });
      doc.text("Florida, United States", R, 131, { align: "right" });

      // ── Grey band: invoice for (left) / meta (right) ─────────────────────
      const bandY = 172;
      const bandH = 152;
      doc.setFillColor(226, 232, 238);
      doc.rect(0, bandY, W, bandH, "F");

      doc.setFont(F, "normal");
      doc.setFontSize(10);
      doc.setTextColor(40, 40, 40);
      doc.text("Invoice for", L, bandY + 34);

      doc.setFontSize(16);
      doc.setTextColor(17, 17, 17);
      doc.text(fullName || email || "Account holder", L, bandY + 72);

      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);
      doc.text(email || "—", L, bandY + 100);
      doc.text("Jenvu account credit top-up", L, bandY + 116);

      const metaLabelX = R - 250;
      const metaValueX = R - 230;
      const metaRows: [string, string][] = [
        ["Invoice number", invoiceNo(o)],
        ["Invoice date", date],
        ["Payment method", `${net.asset} on ${net.chain}`],
      ];
      if (o.tx_hash) {
        metaRows.push([
          "Transaction",
          `${o.tx_hash.slice(0, 18)}${o.tx_hash.length > 18 ? "…" : ""}`,
        ]);
      }
      let my = bandY + 52;
      metaRows.forEach(([label, value]) => {
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        doc.text(label, metaLabelX, my, { align: "right" });
        doc.setTextColor(17, 17, 17);
        doc.text(value, metaValueX, my);
        my += 22;
      });

      // ── Line item table ─────────────────────────────────────────────────
      let y = bandY + bandH + 48;
      doc.setFont(F, "bold");
      doc.setFontSize(11);
      doc.setTextColor(17, 17, 17);
      doc.text("Date", L, y);
      doc.text("Description", L + 250, y);
      doc.text("Total amount in (USD $)", R, y, { align: "right" });

      y += 14;
      doc.setDrawColor(30, 30, 30);
      doc.setLineWidth(1);
      doc.line(L, y, R, y);

      doc.setFont(F, "normal");
      doc.setFontSize(11);
      y += 30;
      doc.text(date, L, y);
      doc.text("Account credit top-up", L + 250, y);
      doc.text(`$${paid.toFixed(2)}`, R, y, { align: "right" });

      if (bonus > 0) {
        y += 26;
        doc.text(date, L, y);
        doc.text(`Bonus credit${o.promo_code ? ` (${o.promo_code})` : ""}`, L + 250, y);
        doc.text(`$${bonus.toFixed(2)}`, R, y, { align: "right" });
      }

      y += 24;
      doc.line(L, y, R, y);

      // ── Total ───────────────────────────────────────────────────────────
      y += 34;
      doc.setFont(F, "normal");
      doc.setFontSize(12);
      doc.setTextColor(17, 17, 17);
      doc.text("Total", R - 160, y, { align: "right" });
      doc.text(`$${paid.toFixed(2)}`, R, y, { align: "right" });

      y += 26;
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.text("Credited to balance", R - 160, y, { align: "right" });
      doc.text(`$${credit.toFixed(2)}`, R, y, { align: "right" });

      // ── Footer ──────────────────────────────────────────────────────────
      const H = doc.internal.pageSize.getHeight();
      doc.setFontSize(9);
      doc.setTextColor(140, 140, 140);
      doc.text(
        "Paid in full. Credits are applied to your Jenvu account balance immediately after approval.",
        L,
        H - 64,
      );
      doc.text(
        "info@jenvu.com · This invoice was generated electronically and is valid without signature.",
        L,
        H - 48,
      );

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
                <th className="px-2 py-3 font-normal">Invoice Reference</th>
                <th className="px-2 py-3 font-normal">Date</th>
                <th className="px-2 py-3 font-normal">Type</th>
                <th className="px-2 py-3 font-normal">Amount</th>
                <th className="px-2 py-3 font-normal">Status</th>
                <th className="px-2 py-3" aria-label="Receipt" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gc-line">
              {rows.length === 0 ? (
                <tr><td colSpan={6} className="px-2 py-4 text-center text-gc-ink-muted">No invoices found.</td></tr>
              ) : rows.map((o) => {
                const st = STATUS[o.status] ?? { label: o.status, cls: "bg-gc-surface text-gc-ink-muted" };
                return (
                  <tr key={o.id}>
                    <td className="px-2 py-3 text-gc-ink">{invoiceNo(o)}</td>
                    <td className="px-2 py-3 text-gc-ink-muted">{fmtDate(o.created_at)}</td>
                    <td className="px-2 py-3 text-gc-ink">{o.target_plan_id ? `${o.target_plan_id.charAt(0).toUpperCase()}${o.target_plan_id.slice(1)} plan` : "Credit top-up"}</td>
                    <td className="px-2 py-3 tabular-nums text-gc-ink">${Number(o.pay_amount_usd).toFixed(2)}</td>
                    <td className="px-2 py-3"><span className={`rounded-full px-2.5 py-0.5 text-[12px] font-medium ${st.cls}`}>{st.label}</span></td>
                    <td className="px-2 py-3 text-right">
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
