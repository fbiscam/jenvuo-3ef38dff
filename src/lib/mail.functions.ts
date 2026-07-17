import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type MailFolder = "inbox" | "sent" | "archive" | "trash";

export type MailListItem = {
  message_id: string;
  folder: MailFolder;
  is_read: boolean;
  is_starred: boolean;
  subject: string;
  body: string;
  sender_address: string;
  recipient_address: string;
  sender_id: string | null;
  recipient_id: string | null;
  created_at: string;
  sender_name: string | null;
  sender_avatar: string | null;
};

export type MailAddress = {
  address: string;
  local_part: string;
  is_primary: boolean;
  created_at: string;
};

export const getMyMailAddress = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("mail_addresses")
      .select("address, local_part, created_at, is_primary")
      .eq("user_id", context.userId)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as MailAddress[];
    const primary = rows.find((r) => r.is_primary) ?? rows[0] ?? null;
    return primary ? { ...primary, all: rows } : null;
  });

export const listMyMailAddresses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MailAddress[]> => {
    const { data, error } = await context.supabase
      .from("mail_addresses")
      .select("address, local_part, created_at, is_primary")
      .eq("user_id", context.userId)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as MailAddress[];
  });


export const claimMailAddress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { local_part: string }) => {
    const lp = String(data?.local_part ?? "").toLowerCase().trim();
    if (!/^[a-z0-9][a-z0-9._-]{2,30}[a-z0-9]$/.test(lp)) {
      throw new Error("Username must be 4-32 chars: letters, numbers, . _ -");
    }
    return { local_part: lp };
  })
  .handler(async ({ context, data }) => {
    const { data: address, error } = await context.supabase.rpc("mail_claim_address", {
      _local_part: data.local_part,
    });
    if (error) throw new Error(error.message);
    return { address: address as string };
  });

export const checkUsernameAvailable = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { local_part: string }) => ({
    local_part: String(data?.local_part ?? "").toLowerCase().trim(),
  }))
  .handler(async ({ context, data }) => {
    if (!/^[a-z0-9][a-z0-9._-]{2,30}[a-z0-9]$/.test(data.local_part)) {
      return { available: false, reason: "invalid" as const };
    }
    const { data: row } = await context.supabase
      .from("mail_addresses")
      .select("local_part")
      .eq("local_part", data.local_part)
      .maybeSingle();
    return { available: !row, reason: row ? ("taken" as const) : ("ok" as const) };
  });

export const listMail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { folder?: MailFolder }) => ({
    folder: (data?.folder ?? "inbox") as MailFolder,
  }))
  .handler(async ({ context, data }): Promise<MailListItem[]> => {
    const { data: states, error } = await context.supabase
      .from("mail_message_state")
      .select(
        `message_id, folder, is_read, is_starred,
         mail_messages:message_id ( id, sender_id, sender_address, recipient_id, recipient_address, subject, body, created_at )`,
      )
      .eq("user_id", context.userId)
      .eq("folder", data.folder)
      .order("updated_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);

    const rows = (states ?? []) as any[];
    const senderIds = Array.from(
      new Set(rows.map((r) => r.mail_messages?.sender_id).filter(Boolean)),
    );
    let profileMap = new Map<string, { full_name: string | null; avatar_url: string | null }>();
    if (senderIds.length) {
      const { data: profiles } = await context.supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", senderIds);
      profileMap = new Map(
        (profiles ?? []).map((p: any) => [p.id, { full_name: p.full_name, avatar_url: p.avatar_url }]),
      );
    }

    return rows
      .filter((r) => r.mail_messages)
      .map((r) => {
        const m = r.mail_messages;
        const p = m.sender_id ? profileMap.get(m.sender_id) : null;
        return {
          message_id: r.message_id,
          folder: r.folder,
          is_read: r.is_read,
          is_starred: r.is_starred,
          subject: m.subject,
          body: m.body,
          sender_address: m.sender_address,
          recipient_address: m.recipient_address,
          sender_id: m.sender_id,
          recipient_id: m.recipient_id,
          created_at: m.created_at,
          sender_name: p?.full_name ?? null,
          sender_avatar: p?.avatar_url ?? null,
        };
      });
  });

export const getUnreadMailCount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { count } = await context.supabase
      .from("mail_message_state")
      .select("message_id", { count: "exact", head: true })
      .eq("user_id", context.userId)
      .eq("folder", "inbox")
      .eq("is_read", false);
    return { count: count ?? 0 };
  });

export const sendMail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { to: string; subject: string; body: string }) => {
    const to = String(data?.to ?? "").toLowerCase().trim();
    const subject = String(data?.subject ?? "").slice(0, 300);
    const body = String(data?.body ?? "").slice(0, 50000);
    if (!to.endsWith("@jenvu.email")) throw new Error("Recipient must be a @jenvu.email address");
    if (!body.trim() && !subject.trim()) throw new Error("Message is empty");
    return { to, subject, body };
  })
  .handler(async ({ context, data }) => {
    const { data: id, error } = await context.supabase.rpc("mail_send", {
      _to_address: data.to,
      _subject: data.subject,
      _body: data.body,
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const setMailState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      message_id: string;
      folder?: MailFolder;
      is_read?: boolean;
      is_starred?: boolean;
    }) => data,
  )
  .handler(async ({ context, data }) => {
    const patch: {
      updated_at: string;
      folder?: MailFolder;
      is_read?: boolean;
      is_starred?: boolean;
    } = { updated_at: new Date().toISOString() };
    if (data.folder) patch.folder = data.folder;
    if (typeof data.is_read === "boolean") patch.is_read = data.is_read;
    if (typeof data.is_starred === "boolean") patch.is_starred = data.is_starred;
    const { error } = await context.supabase
      .from("mail_message_state")
      .update(patch)
      .eq("message_id", data.message_id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const searchMailDirectory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { q: string }) => ({ q: String(data?.q ?? "").slice(0, 60) }))
  .handler(async ({ context, data }) => {
    if (!data.q.trim()) return [];
    const { data: rows, error } = await context.supabase.rpc("mail_directory_search", { _q: data.q });
    if (error) throw new Error(error.message);
    return (rows ?? []) as { address: string; full_name: string | null }[];
  });

export type MailBadgeTier = "gold" | "blue" | null;

export const getMailBadges = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { addresses: string[] }) => ({
    addresses: Array.from(new Set((data?.addresses ?? []).map((a) => String(a).toLowerCase().trim()).filter(Boolean))).slice(0, 200),
  }))
  .handler(async ({ context, data }) => {
    if (!data.addresses.length) return {} as Record<string, MailBadgeTier>;
    const { data: rows, error } = await context.supabase.rpc("mail_get_badges", { _addresses: data.addresses });
    if (error) throw new Error(error.message);
    const map: Record<string, MailBadgeTier> = {};
    for (const r of (rows ?? []) as { address: string; tier: MailBadgeTier }[]) {
      map[r.address] = r.tier;
    }
    return map;
  });

