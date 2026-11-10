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

// Jenvu "J" mark as vector polygons (same shape as JenvuMark), drawn straight into the PDF.
const MARK_POLYGONS: [number, number][][] = [
  [[9.2, 1.5], [22.6, 1.5], [21.4, 4.9], [8, 4.9]],
  [[15.5, 4.9], [19.5, 4.9], [13.6, 22.5], [2.6, 22.5], [3.9, 18.9], [10.9, 18.9]],
  [[3.6, 9.4], [7.4, 9.4], [5.7, 14.6], [1.9, 14.6]],
];

type PdfDoc = InstanceType<typeof import("jspdf").jsPDF>;

function drawMark(doc: PdfDoc, x: number, y: number, size: number) {
  const s = size / 24;
  doc.setFillColor(0, 0, 0);
  for (const poly of MARK_POLYGONS) {
    const [x0, y0] = poly[0];
    const segs = poly.slice(1).map(([px, py], i) => [px - poly[i][0], py - poly[i][1]]);
    doc.lines(segs, x + x0 * s, y + y0 * s, [s, s], "F", true);
  }
}

async function fontBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) {
      bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return btoa(bin);
  } catch {
    return null;
  }
}

/** Registers the site font (Google Sans Flex) in the PDF; returns the family name to use. */
async function useSiteFont(doc: PdfDoc): Promise<{ family: string; medium: string }> {
  const [regular, medium, bold] = await Promise.all([
    fontBase64("/fonts/invoice/google-sans-flex-400.ttf"),
    fontBase64("/fonts/invoice/google-sans-flex-500.ttf"),
    fontBase64("/fonts/invoice/google-sans-flex-700.ttf"),
  ]);
  if (!regular || !bold) return { family: "helvetica", medium: "normal" };
  doc.addFileToVFS("GoogleSansFlex-Regular.ttf", regular);
  doc.addFont("GoogleSansFlex-Regular.ttf", "GoogleSansFlex", "normal");
  doc.addFileToVFS("GoogleSansFlex-Bold.ttf", bold);
  doc.addFont("GoogleSansFlex-Bold.ttf", "GoogleSansFlex", "bold");
  if (medium) {
    doc.addFileToVFS("GoogleSansFlex-Medium.ttf", medium);
    doc.addFont("GoogleSansFlex-Medium.ttf", "GoogleSansFlex", "medium");
  }
  return { family: "GoogleSansFlex", medium: medium ? "medium" : "normal" };
}

function planLabel(id: string) {
  return id.charAt(0).toUpperCase() + id.slice(1);
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
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const { family: F, medium: MED } = await useSiteFont(doc);
      const W = doc.internal.pageSize.getWidth();
      const H = doc.internal.pageSize.getHeight();
      const L = 42; // text margin
      const TL = 28; // table rule start
      const TR = W - 34; // table rule end
      const R = W - 48; // right text edge
      const net = networkMeta(o.network);

      const date = fmtDateLong(o.decided_at ?? o.created_at);
      const paid = Number(o.pay_amount_usd);
      const bonus = Number(o.bonus_usd);
      const credit = Number(o.credit_usd);
      const item = o.target_plan_id
        ? `Jenvu ${planLabel(o.target_plan_id)} plan${o.is_upgrade ? " upgrade" : ""}`
        : "Account credit top-up";

      const ink = () => doc.setTextColor(17, 17, 17);
      const soft = () => doc.setTextColor(70, 70, 70);

      // ── Header: INVOICE left, logo + company block right ───────────────
      drawMark(doc, R - 30, 18, 32);

      doc.setFont(F, "bold");
      doc.setFontSize(24);
      ink();
      doc.text("INVOICE", L, 88);

      const CX = W - 170;
      doc.setFont(F, "normal");
      doc.setFontSize(12);
      ink();
      doc.text("Jenvu", CX, 75);
      doc.setFontSize(9.5);
      soft();
      doc.text("jenvu.com · info@jenvu.com", CX, 98);
      doc.text("Florida, United States", CX, 111);

      // ── Grey band: invoice for (left) / meta (right) ─────────────────
      const bandY = 144;
      const bandH = 130;
      doc.setFillColor(236, 237, 239);
      doc.rect(6, bandY, W - 6, bandH, "F");

      doc.setFont(F, "normal");
      doc.setFontSize(9.5);
      ink();
      doc.text("Invoice for", L, bandY + 26);

      doc.setFontSize(12);
      doc.text(fullName || email || "Account holder", L, bandY + 57);

      doc.setFontSize(9.5);
      soft();
      doc.text(email || "—", L, bandY + 80);
      doc.text("Jenvu account", L, bandY + 92);

      const metaLabelX = W - 203;
      const metaValueX = W - 191;
      const metaRows: [string, string][] = [
        ["Invoice number", invoiceNo(o)],
        ["Invoice date", date],
        ["Payment method", `${net.asset} on ${net.chain}`],
      ];
      if (o.tx_hash) {
        metaRows.push(["Transaction", `${o.tx_hash.slice(0, 18)}${o.tx_hash.length > 18 ? "…" : ""}`]);
      }
      let my = bandY + 51;
      doc.setFontSize(9.5);
      for (const [label, value] of metaRows) {
        soft();
        doc.text(label, metaLabelX, my, { align: "right" });
        ink();
        doc.text(value, metaValueX, my);
        my += 14.5;
      }

      // ── Line item table ───────────────────────────────────────────────
      const descX = 225;
      let y = bandY + bandH + 30;
      doc.setFont(F, "bold");
      doc.setFontSize(9.5);
      ink();
      doc.text("Date", L, y);
      doc.text("Description", descX, y);
      doc.text("Total amount in (USD $)", R, y, { align: "right" });

      y += 14;
      doc.setDrawColor(17, 17, 17);
      doc.setLineWidth(0.8);
      doc.line(TL, y, TR, y);

      doc.setFont(F, "normal");
      y += 19;
      doc.text(date, L, y);
      doc.text(item, descX, y);
      doc.text(`$${paid.toFixed(2)}`, R, y, { align: "right" });

      if (bonus > 0) {
        y += 18;
        doc.text(date, L, y);
        doc.text(`Bonus credit${o.promo_code ? ` (${o.promo_code})` : ""}`, descX, y);
        doc.text(`$${bonus.toFixed(2)}`, R, y, { align: "right" });
      }

      y += 15;
      doc.line(TL, y, TR, y);

      // ── Total ─────────────────────────────────────────────────────────
      const TX = W - 194;
      y += 21;
      doc.setFont(F, MED);
      doc.setFontSize(9.5);
      ink();
      doc.text("Total", TX, y);
      doc.text(`$${paid.toFixed(2)}`, R, y, { align: "right" });

      if (credit > 0) {
        y += 16;
        doc.setFont(F, "normal");
        soft();
        doc.text("Credited to balance", TX, y);
        doc.text(`$${credit.toFixed(2)}`, R, y, { align: "right" });
      }

      // ── Footer ────────────────────────────────────────────────────────
      doc.setFont(F, "normal");
      doc.setFontSize(8);
      doc.setTextColor(140, 140, 140);
      doc.text("Credits are applied to your Jenvu account balance after the payment is approved.", L, H - 52);
      doc.text("info@jenvu.com · This invoice was generated electronically and is valid without signature.", L, H - 40);

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
