import { createHash, timingSafeEqual } from "node:crypto";

function digest(value: string) {
  return createHash("sha256").update(value, "utf8").digest();
}

export function verifyCronRequest(request: Request): Response | null {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return Response.json({ error: "server_misconfigured" }, { status: 500 });
  }

  const provided = request.headers.get("x-cron-secret") ?? "";
  if (!provided || !timingSafeEqual(digest(provided), digest(expected))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  return null;
}