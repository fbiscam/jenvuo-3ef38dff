// Tokens for community photos and post media. A token names the viewer, the owner and
// the stored file; /api/community-media re-checks blocks on every load, so access ends
// the moment either member blocks the other (no long-lived storage links are handed out).

export type MediaBucket = "avatars" | "community-media";
type Payload = { b: MediaBucket; p: string; v: string; o: string; e: number };

const TTL_MS = 60 * 60 * 1000;
const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const x of bytes) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(s: string): Uint8Array {
  const pad = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(pad);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function hmac(data: string): Promise<string> {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("media signing unavailable");
  const key = await crypto.subtle.importKey("raw", enc.encode(`community-media-v1:${secret}`), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(data))));
}

export async function communityMediaUrl(bucket: MediaBucket, path: string, viewerId: string, ownerId: string): Promise<string> {
  const payload = b64url(enc.encode(JSON.stringify({ b: bucket, p: path, v: viewerId, o: ownerId, e: Date.now() + TTL_MS } satisfies Payload)));
  return `/api/community-media?t=${payload}.${await hmac(payload)}`;
}

export async function readCommunityMediaToken(token: string): Promise<Payload | null> {
  const [payload, sig] = String(token || "").split(".");
  if (!payload || !sig || payload.length > 2000) return null;
  if ((await hmac(payload)) !== sig) return null;
  try {
    const p = JSON.parse(new TextDecoder().decode(fromB64url(payload))) as Payload;
    if (p.b !== "avatars" && p.b !== "community-media") return null;
    if (typeof p.e !== "number" || p.e < Date.now()) return null;
    if (!p.p || p.p.includes("..") || !p.p.startsWith(`${p.o}/`)) return null;
    return p;
  } catch {
    return null;
  }
}
