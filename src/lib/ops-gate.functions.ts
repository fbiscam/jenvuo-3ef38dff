import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { redirect } from "@tanstack/react-router";
import { createHash, timingSafeEqual } from "node:crypto";

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
      sameSite: "lax" as const,
      path: "/",
    },
  };
}

function equalsCT(input: string, expected: string): boolean {
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

export const opsUnlock = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; password: string }) => data)
  .handler(async ({ data }) => {
    const expectedId = process.env.OPS_CONSOLE_ID;
    const expectedPass = process.env.OPS_CONSOLE_PASS;
    if (!expectedId || !expectedPass || !process.env.OPS_CONSOLE_SESSION_SECRET) {
      throw new Error("Ops console not configured");
    }
    const okId = equalsCT(String(data.id ?? "").trim(), expectedId);
    const okPw = equalsCT(String(data.password ?? ""), expectedPass);
    if (!(okId && okPw)) {
      return { ok: false as const };
    }
    const session = await useSession<OpsSession>(sessionConfig());
    await session.update({ unlocked: true, who: expectedId });
    return { ok: true as const };
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
