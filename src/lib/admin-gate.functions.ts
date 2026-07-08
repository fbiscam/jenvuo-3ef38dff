import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { createHash, timingSafeEqual } from "node:crypto";

type AdminSession = { unlocked?: boolean; username?: string };

const SESSION_NAME = "jenvu-admin-gate";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function sessionConfig() {
  return {
    password: process.env.ADMIN_SESSION_SECRET!,
    name: SESSION_NAME,
    maxAge: MAX_AGE,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "none" as const,
      path: "/",
    },
  };
}

function safeEqual(a: string, b: string): boolean {
  const ah = createHash("sha256").update(a, "utf8").digest();
  const bh = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(ah, bh);
}

async function requireUnlocked() {
  const session = await useSession<AdminSession>(sessionConfig());
  if (!session.data.unlocked) {
    throw new Error("Unauthorized");
  }
  return session;
}

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((data: { username: string; password: string }) => data)
  .handler(async ({ data }) => {
    const expectedUser = process.env.ADMIN_USERNAME;
    const expectedPass = process.env.ADMIN_PASSWORD;
    if (!expectedUser || !expectedPass) {
      return { ok: false as const, error: "Server not configured" };
    }
    const uOk = safeEqual(data.username || "", expectedUser);
    const pOk = safeEqual(data.password || "", expectedPass);
    if (!uOk || !pOk) {
      return { ok: false as const, error: "Invalid credentials" };
    }
    const session = await useSession<AdminSession>(sessionConfig());
    await session.update({ unlocked: true, username: expectedUser });
    return { ok: true as const };
  });

export const adminLogout = createServerFn({ method: "POST" }).handler(async () => {
  const session = await useSession<AdminSession>(sessionConfig());
  await session.clear();
  return { ok: true as const };
});

export const adminMe = createServerFn({ method: "GET" }).handler(async () => {
  const session = await useSession<AdminSession>(sessionConfig());
  return {
    unlocked: !!session.data.unlocked,
    username: session.data.username ?? null,
  };
});

// ---- Chat inbox data (gated) ----

export const adminListSessions = createServerFn({ method: "GET" }).handler(async () => {
  await requireUnlocked();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("chat_sessions")
    .select("id,guest_name,guest_email,status,last_message_at,unread_admin,created_at")
    .order("last_message_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return { sessions: data ?? [] };
});

export const adminGetMessages = createServerFn({ method: "POST" })
  .inputValidator((data: { sessionId: string }) => data)
  .handler(async ({ data }) => {
    await requireUnlocked();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("chat_messages")
      .select("id,sender,content,created_at")
      .eq("session_id", data.sessionId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    // mark read
    await supabaseAdmin
      .from("chat_sessions")
      .update({ unread_admin: 0 })
      .eq("id", data.sessionId);
    return { messages: rows ?? [] };
  });

export const adminReply = createServerFn({ method: "POST" })
  .inputValidator((data: { sessionId: string; content: string }) => {
    const content = (data.content ?? "").trim();
    if (!content) throw new Error("Empty message");
    if (content.length > 4000) throw new Error("Message too long");
    return { sessionId: data.sessionId, content };
  })
  .handler(async ({ data }) => {
    await requireUnlocked();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date().toISOString();
    const { error: mErr } = await supabaseAdmin.from("chat_messages").insert({
      session_id: data.sessionId,
      sender: "admin",
      content: data.content,
    });
    if (mErr) throw new Error(mErr.message);
    const { error: sErr } = await supabaseAdmin
      .from("chat_sessions")
      .update({ last_message_at: now, status: "open" })
      .eq("id", data.sessionId);
    if (sErr) throw new Error(sErr.message);
    return { ok: true as const };
  });

export const adminCloseSession = createServerFn({ method: "POST" })
  .inputValidator((data: { sessionId: string }) => data)
  .handler(async ({ data }) => {
    await requireUnlocked();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("chat_sessions")
      .update({ status: "closed" })
      .eq("id", data.sessionId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
