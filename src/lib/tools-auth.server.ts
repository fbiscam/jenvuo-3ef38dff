// Worker-safe password hashing + session helpers for the public Tools area.
// Format: pbkdf2$<iterations>$<saltHex>$<hashHex>
import { useSession } from "@tanstack/react-start/server";

export type ToolsSession = { toolUserId?: string; username?: string };

const ITERATIONS = 100_000;

function toHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as unknown as BufferSource, iterations, hash: "SHA-256" },
    key,
    256,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const dk = await pbkdf2(password, salt, ITERATIONS);
  return `pbkdf2$${ITERATIONS}$${toHex(salt)}$${toHex(dk)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [scheme, iterStr, saltHex, hashHex] = stored.split("$");
    if (scheme !== "pbkdf2") return false;
    const dk = await pbkdf2(password, fromHex(saltHex), Number(iterStr) || ITERATIONS);
    const expected = fromHex(hashHex);
    if (dk.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < dk.length; i++) diff |= dk[i] ^ expected[i];
    return diff === 0;
  } catch {
    return false;
  }
}

export function toolsSessionConfig() {
  return {
    password: process.env.TOOLS_SESSION_SECRET!,
    name: "jenvu-tools",
    maxAge: 60 * 60 * 12,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "none" as const,
      partitioned: true,
      path: "/",
    },
  };
}

export async function getToolsSession() {
  return useSession<ToolsSession>(toolsSessionConfig());
}
