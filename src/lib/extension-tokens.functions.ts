import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type ExtensionToken = {
  id: string;
  name: string;
  token_prefix: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const b64 = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
  return `jext_${b64}`;
}

export const listExtensionTokens = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ tokens: ExtensionToken[] }> => {
    const { data, error } = await context.supabase
      .from("extension_tokens")
      .select("id, name, token_prefix, created_at, last_used_at, revoked_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { tokens: (data ?? []) as ExtensionToken[] };
  });

export const mintExtensionToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ name: z.string().trim().min(1).max(60).default("Chrome Extension") }).parse(d ?? {}))
  .handler(async ({ data, context }): Promise<{ id: string; token: string }> => {
    const token = randomToken();
    const token_hash = await sha256Hex(token);
    const token_prefix = token.slice(0, 12);
    const { data: row, error } = await context.supabase
      .from("extension_tokens")
      .insert({ user_id: context.userId, name: data.name, token_hash, token_prefix })
      .select("id")
      .single();
    if (error || !row) throw new Error(error?.message ?? "Failed to mint token");
    return { id: row.id, token };
  });

export const revokeExtensionToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { error } = await context.supabase
      .from("extension_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
