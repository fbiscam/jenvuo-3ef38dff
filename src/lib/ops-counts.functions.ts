// Pending-work counters for the Ops Console hub badges (1, 2, 3 …).
import { createServerFn } from "@tanstack/react-start";

export type OpsCounts = {
  /** Live chats with unread visitor messages + new contact-form messages. */
  inbox: number;
  /** New contact-form messages only. */
  messages: number;
  /** Founding applications waiting for a decision. */
  founding: number;
  /** ID / earning documents waiting for review. */
  documents: number;
  /** Payments waiting for manual review. */
  payments: number;
};

export const opsPendingCounts = createServerFn({ method: "POST" })
  .inputValidator((i?: { token?: string }) => ({ token: i?.token ? String(i.token) : undefined }))
  .handler(async ({ data }): Promise<OpsCounts> => {
    const { isOpsUnlockedOrToken } = await import("./admin-guard.server");
    if (!(await isOpsUnlockedOrToken(data.token))) throw new Error("Locked");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sb = supabaseAdmin as any;
    const head = { count: "exact" as const, head: true };
    const [chats, contact, founding, docs, pays] = await Promise.all([
      sb.from("chat_sessions").select("id", head).gt("unread_admin", 0),
      sb.from("contact_messages").select("id", head).eq("status", "new"),
      sb.from("founding_applications").select("id", head).eq("status", "pending"),
      sb.from("founding_applications").select("id", head).in("document_status", ["pending", "received"]),
      sb.from("payment_orders").select("id", head).in("status", ["needs_review", "verifying"]),
    ]);
    const n = (r: { count: number | null }) => r?.count ?? 0;
    return {
      inbox: n(chats) + n(contact),
      messages: n(contact),
      founding: n(founding),
      documents: n(docs),
      payments: n(pays),
    };
  });
