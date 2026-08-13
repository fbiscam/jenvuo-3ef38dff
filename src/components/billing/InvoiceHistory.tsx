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

async function loadFontBase64(path: string): Promise<string | null> {
  try {
    const res = await fetch(path);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const fr = new FileReader();
      fr.onload = () => {
        const dataUrl = String(fr.result);
        const base64 = dataUrl.split(",")[1];
        resolve(base64 ?? null);
      };
      fr.onerror = () => resolve(null);
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function embedGoogleSans(doc: JsPDF) {
  const [normal, medium, semibold, bold] = await Promise.all([
    loadFontBase64("/fonts/googlesans-400.ttf"),
    loadFontBase64("/fonts/googlesans-500.ttf"),
    loadFontBase64("/fonts/googlesans-600.ttf"),
    loadFontBase64("/fonts/googlesans-700.ttf"),
  ]);

  if (normal) {
    doc.addFileToVFS("GoogleSansNormal.ttf", normal);
    doc.addFont("GoogleSansNormal.ttf", "GoogleSans", "normal");
  }
  if (medium) {
    doc.addFileToVFS("GoogleSansMedium.ttf", medium);
    doc.addFont("GoogleSansMedium.ttf", "GoogleSans", "medium");
  }
  if (semibold) {
    doc.addFileToVFS("GoogleSansSemiBold.ttf", semibold);
    doc.addFont("GoogleSansSemiBold.ttf", "GoogleSans", "semibold");
  }
  if (bold) {
    doc.addFileToVFS("GoogleSansBold.ttf", bold);
    doc.addFont("GoogleSansBold.ttf", "GoogleSans", "bold");
  }

  return { hasFont: Boolean(normal) };
}

type JsPDF = import("jspdf").jsPDF;

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
      const R = W - L;
      const net = networkMeta(o.network);
      const { hasFont } = await embedGoogleSans(doc);
      const F = hasFont ? "GoogleSans" : "helvetica";

      const date = fmtDateLong(o.decided_at ?? o.created_at);
      const paid = Number(o.pay_amount_usd);
      const bonus = Number(o.bonus_usd);
      const credit = Number(o.credit_usd);

      // Clean white background, no heavy band.
      let y = 56;

      // Logo + brand
      if (logo) {
        try {
          doc.addImage(logo, "PNG", L, y, 40, 40);
        } catch {
          /* ignore */
        }
      }
      doc.setFont(F, "semibold");
      doc.setFontSize(20);
      doc.setTextColor(18, 18, 18);
      doc.text("Jenvu", L + (logo ? 52 : 0), y + 22);

      doc.setFont(F, "normal");
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.text("jenvu.com · support@jenvu.net", L + (logo ? 52 : 0), y + 40);

      // Invoice title
      doc.setFont(F, "semibold");
      doc.setFontSize(15);
      doc.setTextColor(18, 18, 18);
      doc.text("INVOICE", R, y + 12, { align: "right" });
      doc.setFont(F, "normal");
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.text(`${invoiceNo(o)} · ${date}`, R, y + 30, { align: "right" });

      y = 130;

      // From / To cards
      doc.setDrawColor(235, 235, 235);
      doc.setFillColor(252, 252, 252);
      doc.roundedRect(L, y, 210, 74, 8, 8, "F");
      doc.roundedRect(L + 230, y, 210, 74, 8, 8, "F");

      doc.setFont(F, "semibold");
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text("BILLED TO", L + 14, y + 18);
      doc.text("PAYMENT METHOD", L + 244, y + 18);

      doc.setFont(F, "medium");
      doc.setFontSize(10);
      doc.setTextColor(30, 30, 30);
      doc.text(email || "Account holder", L + 14, y + 38);
      doc.text(`${net.asset} on ${net.chain}`, L + 244, y + 38);

      doc.setFont(F, "normal");
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text("Jenvu account credit top-up", L + 14, y + 54);
      if (o.tx_hash) {
        doc.text(`Tx ${o.tx_hash.slice(0, 24)}${o.tx_hash.length > 24 ? "…" : ""}`, L + 244, y + 54);
      }

      y = 232;

      // Line items
      doc.setFont(F, "semibold");
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text("DESCRIPTION", L, y);
      doc.text("AMOUNT", R, y, { align: "right" });
      y += 14;
      doc.setDrawColor(235, 235, 235);
      doc.line(L, y, R, y);

      doc.setFont(F, "normal");
      doc.setFontSize(10);
      doc.setTextColor(30, 30, 30);
      y += 26;
      doc.text("Account credit top-up", L, y);
      doc.text(`$${paid.toFixed(2)}`, R, y, { align: "right" });

      if (bonus > 0) {
        y += 22;
        doc.setTextColor(100, 100, 100);
        doc.text(`Bonus credit${o.promo_code ? ` (${o.promo_code})` : ""}`, L, y);
        doc.text(`$${bonus.toFixed(2)}`, R, y, { align: "right" });
      }

      y += 28;
      doc.line(L, y, R, y);

      // Totals
      y += 20;
      doc.setFont(F, "normal");
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.text("Amount paid", R - 130, y, { align: "right" });
      doc.setFont(F, "semibold");
      doc.setFontSize(12);
      doc.setTextColor(18, 18, 18);
      doc.text(`$${paid.toFixed(2)} USD`, R, y, { align: "right" });

      y += 22;
      doc.setFont(F, "normal");
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.text("Credited to balance", R - 130, y, { align: "right" });
      doc.setFont(F, "bold");
      doc.setFontSize(11);
      doc.setTextColor(16, 122, 76);
      doc.text(`$${credit.toFixed(2)} USD`, R, y, { align: "right" });

      // Paid badge
      y += 48;
      doc.setFillColor(240, 249, 244);
      doc.roundedRect(L, y - 14, 72, 26, 10, 10, "F");
      doc.setFont(F, "bold");
      doc.setFontSize(9);
      doc.setTextColor(16, 122, 76);
      doc.text("PAID", L + 36, y + 2, { align: "center" });

      // Footer
      const H = doc.internal.pageSize.getHeight();
      y = H - 78;
      doc.setDrawColor(235, 235, 235);
      doc.line(L, y, R, y);
      doc.setFont(F, "normal");
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        "Thank you for your payment. Credits are applied to your Jenvu account balance immediately after approval.",
        L,
        y + 22,
      );
      doc.text("support@jenvu.net · This invoice was generated electronically and is valid without signature.", L, y + 38);

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
