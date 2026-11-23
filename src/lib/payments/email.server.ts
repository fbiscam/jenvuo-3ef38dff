// Server-only: transactional emails for crypto top-up payments.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { networkMeta } from "./shared";
import { render } from "@react-email/render";
import { createElement } from "react";
import { PaymentEmail } from "../email-templates/payment";

const FROM = "Jenvu Billing <billing@notify.jenvu.com>";

type OrderLike = {
  id: string;
  user_id: string;
  email?: string | null;
  network: string;
  pay_amount_usd: number | string;
  credit_usd: number | string;
  bonus_usd?: number | string | null;
  promo_code?: string | null;
  tx_hash?: string | null;
  credited_usd?: number | string | null;
  reject_reason?: string | null;
};

async function resolveEmail(order: OrderLike): Promise<string | null> {
  if (order.email) return order.email.toLowerCase().trim();
  try {
    const { data } = await supabaseAdmin.auth.admin.getUserById(order.user_id);
    return (data.user?.email ?? "").toLowerCase().trim() || null;
  } catch {
    return null;
  }
}

export async function sendPaymentEmail(args: {
  kind: "submitted" | "approved" | "rejected";
  order: OrderLike;
}): Promise<{ ok: boolean }> {
  const to = await resolveEmail(args.order);
  if (!to) return { ok: false };

  const net = networkMeta(String(args.order.network));
  const pay = Number(args.order.pay_amount_usd).toFixed(2);
  const credit = Number(args.order.credited_usd ?? args.order.credit_usd).toFixed(2);
  const bonus = Number(args.order.bonus_usd ?? 0);
  const ref = args.order.id.slice(0, 8).toUpperCase();

  const subject = args.kind === "submitted" ? `We received your $${pay} payment — verifying` : args.kind === "approved" ? `$${credit} added to your Jenvu wallet` : `Your $${pay} payment could not be approved`;
  const element = createElement(PaymentEmail, {
    kind: args.kind, recipient: to, amount: pay, credit, reference: ref, network: net.chain,
    ...(args.order.tx_hash ? { transaction: args.order.tx_hash } : {}),
    ...(args.kind === "rejected" ? { reason: args.order.reject_reason ?? "Verification failed" } : {}),
    ...(bonus > 0 ? { bonus: bonus.toFixed(2) } : {}),
    ...(args.order.promo_code ? { promo: args.order.promo_code } : {}),
  });
  const html = await render(element);
  const text = await render(element, { plainText: true });
  const { sendManagedEmailLogged } = await import("@/lib/email/managed.server");
  const ok = await sendManagedEmailLogged(supabaseAdmin, {
    to,
    from: FROM,
    subject,
    html,
    text,
    label: `payment-${args.kind}`,
    templateName: `payment-${args.kind}`,
    idempotencyKey: `payment-${args.kind}-${args.order.id}`,
  });
  return { ok };
}
