import { networkMeta, type PaymentOrder } from "@/lib/payments/shared";

/** Invoice reference shown on the billing page and printed on the PDF. */
export function invoiceNo(o: PaymentOrder) {
  return `JV-${new Date(o.created_at).getFullYear()}-${o.id.slice(0, 8).toUpperCase()}`;
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
async function registerSiteFont(
  doc: PdfDoc,
  loadFont: (url: string) => Promise<string | null>,
): Promise<{ family: string; medium: string }> {
  const [regular, medium, bold] = await Promise.all([
    loadFont("/fonts/invoice/google-sans-flex-400.ttf"),
    loadFont("/fonts/invoice/google-sans-flex-500.ttf"),
    loadFont("/fonts/invoice/google-sans-flex-700.ttf"),
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

export async function buildInvoicePdf(
  o: PaymentOrder,
  who: { fullName: string; email: string },
  loadFont: (url: string) => Promise<string | null> = fontBase64,
): Promise<PdfDoc> {
  const { fullName, email } = who;
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const { family: F, medium: MED } = await registerSiteFont(doc, loadFont);
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
    doc.text(`Bonus credit $${bonus.toFixed(2)}${o.promo_code ? ` (${o.promo_code})` : ""} · free`, descX, y);
    doc.text("$0.00", R, y, { align: "right" });
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

  return doc;
}
