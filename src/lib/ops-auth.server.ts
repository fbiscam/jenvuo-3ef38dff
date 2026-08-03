// Server-only helper: verify the Ops Console session/token.
import { useSession } from "@tanstack/react-start/server";

type OpsSession = { unlocked?: boolean; who?: string };

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return toBase64Url(new Uint8Array(sig));
}

async function verifyToken(token: string | undefined, secret: string | undefined): Promise<boolean> {
  if (!token || !secret || !token.includes(".")) return false;
  const [payload, sig] = token.split(".");
  if (sig !== (await sign(payload, secret))) return false;
  try {
    const data = JSON.parse(new TextDecoder().decode(fromBase64Url(payload))) as { exp?: number };
    return typeof data.exp === "number" && data.exp > Date.now();
  } catch {
    return false;
  }
}

export async function assertOpsUnlocked(token?: string): Promise<void> {
  const secret = process.env.OPS_CONSOLE_SESSION_SECRET;
  const session = await useSession<OpsSession>({
    password: secret!,
    name: "jenvu-ops",
    maxAge: 60 * 60 * 8,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "none" as const,
      partitioned: true,
      path: "/",
    },
  });
  if (session.data.unlocked) return;
  if (await verifyToken(token, secret)) return;
  throw new Error("Ops console is locked.");
}
