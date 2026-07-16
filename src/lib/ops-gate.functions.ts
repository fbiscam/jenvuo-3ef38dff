import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { redirect } from "@tanstack/react-router";

type OpsSession = { unlocked?: boolean; who?: string };

const OPS_UNLOCK_PATH = "/ops-x9k2-7m4n";

function sessionConfig() {
  return {
    password: process.env.OPS_CONSOLE_SESSION_SECRET!,
    name: "jenvu-ops",
    maxAge: 60 * 60 * 8, // 8 hours
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "none" as const,
      path: "/",
    },
  };
}

// Constant-time-ish equality using Web Crypto (works in Cloudflare Workers).
// node:crypto's timingSafeEqual/createHash can throw non-serializable errors
// in the Worker runtime — avoid it here.
async function sha256Bytes(s: string): Promise<Uint8Array> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return new Uint8Array(buf);
}

async function equalsCT(input: string, expected: string): Promise<boolean> {
  const a = await sha256Bytes(input);
  const b = await sha256Bytes(expected);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export const opsUnlock = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; password: string }) => data)
  .handler(async ({ data }) => {
    try {
      const expectedId = process.env.OPS_CONSOLE_ID;
      const expectedPass = process.env.OPS_CONSOLE_PASS;
      const secret = process.env.OPS_CONSOLE_SESSION_SECRET;
      if (!expectedId || !expectedPass || !secret) {
        return { ok: false as const, error: "not_configured" };
      }
      const okId = await equalsCT(String(data.id ?? "").trim(), expectedId);
      const okPw = await equalsCT(String(data.password ?? ""), expectedPass);
      if (!(okId && okPw)) {
        return { ok: false as const, error: "invalid" };
      }
      const session = await useSession<OpsSession>(sessionConfig());
      await session.update({ unlocked: true, who: expectedId });
      return { ok: true as const };
    } catch (e) {
      return {
        ok: false as const,
        error: "internal",
        message: e instanceof Error ? e.message : String(e),
      };
    }
  });

export const opsLock = createServerFn({ method: "POST" }).handler(async () => {
  const session = await useSession<OpsSession>(sessionConfig());
  await session.clear();
  return { ok: true as const };
});

export const opsStatus = createServerFn({ method: "GET" }).handler(async () => {
  const session = await useSession<OpsSession>(sessionConfig());
  return { unlocked: !!session.data.unlocked };
});

// Loader-side gate. Throws a redirect to the unlock page if not unlocked.
export const requireOpsUnlocked = createServerFn({ method: "GET" }).handler(async () => {
  const session = await useSession<OpsSession>(sessionConfig());
  if (!session.data.unlocked) {
    throw redirect({ to: OPS_UNLOCK_PATH });
  }
  return { ok: true as const };
});
