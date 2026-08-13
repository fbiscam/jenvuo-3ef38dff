import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listMyOrders } from "@/lib/payments.functions";
import { networkMeta, type PaymentOrder } from "@/lib/payments/shared";
import { supabase } from "@/integrations/supabase/client";

const MONO = "font-['JetBrains_Mono',ui-monospace,monospace]";

function invoiceNo(o: PaymentOrder) {
  return `JV-${new Date(o.created_at).getFullYear()}-${o.id.slice(0, 8).toUpperCase()}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
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

export default function InvoiceHistory() {
  const listFn = useServerFn(listMyOrders);
  const [email, setEmail] = useState<string>("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  const { data } = useQuery({
    queryKey: ["my-payment-orders"],
    queryFn: () => listFn({} as never),
    refetchInterval: 30_000,
  });

  const invoices = useMemo(
    () => (data ?? []).filter((o) => o.status === "approved"),
    [data],
  );

  async function download(o: PaymentOrder) {
    setBusy(o.id);
    try {
      const [{ jsPDF }, logo] = await Promise.all([import("jspdf"), loadLogo()]);
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const W = doc.internal.pageSize.getWidth();
      const L = 48;
      const net = networkMeta(o.network);

      // Header band
      doc.setFillColor(250, 250, 250);
      doc.rect(0, 0, W, 110, "F");
      if (logo) {
        try {
          doc.addImage(logo, "PNG", L, 32, 40, 40);
        } catch {
          /* ignore */
        }
      }
      doc.setTextColor(10, 10, 10);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("Jenvu", L + (logo ? 52 : 0), 52);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(110, 110, 110);
      doc.text("jenvu.com · support@jenvu.net", L + (logo ? 52 : 0), 68);

      doc.setTextColor(10, 10, 10);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("INVOICE", W - L, 52, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(110, 110, 110);
      doc.text(invoiceNo(o), W - L, 68, { align: "right" });
      doc.text(`Issued ${fmtDate(o.decided_at ?? o.created_at)}`, W - L, 82, { align: "right" });

      // Billed to
      let y = 150;
      doc.setFontSize(8);
      doc.setTextColor(140, 140, 140);
      doc.text("BILLED TO", L, y);
      doc.text("PAYMENT", W / 2, y);
      doc.setFontSize(10);
      doc.setTextColor(20, 20, 20);
      doc.text(email || "Account holder", L, y + 16);
      doc.text(`${net.asset} · ${net.chain}`, W / 2, y + 16);
      doc.setFontSize(8);
      doc.setTextColor(110, 110, 110);
      doc.text("Jenvu account credit top-up", L, y + 30);
      if (o.tx_hash) {
        doc.text(`Tx ${o.tx_hash.slice(0, 22)}${o.tx_hash.length > 22 ? "…" : ""}`, W / 2, y + 30);
      }

      // Table
      y += 62;
      doc.setDrawColor(230, 230, 230);
      doc.line(L, y, W - L, y);
      y += 18;
      doc.setFontSize(8);
      doc.setTextColor(140, 140, 140);
      doc.text("DESCRIPTION", L, y);
      doc.text("AMOUNT", W - L, y, { align: "right" });
      y += 10;
      doc.line(L, y, W - L, y);

      const rows: Array<[string, string]> = [
        ["Account credit top-up", `$${Number(o.pay_amount_usd).toFixed(2)}`],
      ];
      if (Number(o.bonus_usd) > 0) {
        rows.push([`Bonus credit${o.promo_code ? ` (${o.promo_code})` : ""}`, `$${Number(o.bonus_usd).toFixed(2)}`]);
      }

      doc.setTextColor(20, 20, 20);
      doc.setFontSize(10);
      for (const [label, amt] of rows) {
        y += 22;
        doc.text(label, L, y);
        doc.text(amt, W - L, y, { align: "right" });
      }

      y += 16;
      doc.setDrawColor(230, 230, 230);
      doc.line(L, y, W - L, y);
      y += 24;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(110, 110, 110);
      doc.text("Paid", W - L - 120, y, { align: "right" });
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(10, 10, 10);
      doc.text(`$${Number(o.pay_amount_usd).toFixed(2)} USD`, W - L, y, { align: "right" });
      y += 20;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(110, 110, 110);
      doc.text("Credited to balance", W - L - 120, y, { align: "right" });
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(16, 122, 76);
      doc.text(`$${Number(o.credit_usd).toFixed(2)} USD`, W - L, y, { align: "right" });

      // Paid stamp
      y += 40;
      doc.setFillColor(240, 250, 245);
      doc.roundedRect(L, y - 14, 78, 22, 6, 6, "F");
      doc.setFontSize(9);
      doc.setTextColor(16, 122, 76);
      doc.setFont("helvetica", "bold");
      doc.text("PAID", L + 39, y + 1, { align: "center" });

      // Footer
      const H = doc.internal.pageSize.getHeight();
      doc.setDrawColor(235, 235, 235);
      doc.line(L, H - 78, W - L, H - 78);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        "Thank you for your payment. Credits are applied to your Jenvu account balance immediately after approval.",
        L,
        H - 58,
      );
      doc.text("Jenvu · support@jenvu.net · This invoice was generated electronically and is valid without signature.", L, H - 44);

      doc.save(`${invoiceNo(o)}.pdf`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">&nbsp; Invoices</h2>
          <p className="mt-0.5 text-xs text-zinc-500">Successful payments with downloadable PDF receipts.</p>
        </div>
      </div>

      {invoices.length === 0 ? (
        <p className="mt-5 text-xs text-zinc-500">No successful payments yet. Approved top-ups will appear here.</p>
      ) : (
        <div className="mt-4 divide-y divide-zinc-100">
          {invoices.map((o) => {
            const net = networkMeta(o.network);
            return (
              <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className={`${MONO} text-[11px] tracking-wider text-zinc-900`}>{invoiceNo(o)}</div>
                  <div className="mt-0.5 text-[11px] text-zinc-500">
                    {fmtDate(o.decided_at ?? o.created_at)} · {net.label}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className={`${MONO} text-[12px] font-semibold text-zinc-900`}>
                      ${Number(o.pay_amount_usd).toFixed(2)}
                    </div>
                    <div className="text-[10px] text-emerald-600">
                      +${Number(o.credit_usd).toFixed(2)} credited
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => download(o)}
                    disabled={busy === o.id}
                    className="rounded-lg border border-black/10 bg-white px-3 py-1.5 text-[11px] font-medium text-black transition hover:bg-zinc-50 disabled:opacity-50"
                  >
                    {busy === o.id ? "Preparing…" : "Download PDF"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
