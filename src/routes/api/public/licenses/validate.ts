import { createFileRoute } from "@tanstack/react-router";
import { checkBotByIp } from "@/lib/mt5-ip-license.server";

// Always HTTP 200: the MT5 bot reads the JSON body only.
// The bot sends the IP the user registered on the website plus its MT5 account; the server checks it is the same IP.
const ok = (body: unknown) => Response.json(body, { status: 200 });

export const Route = createFileRoute("/api/public/licenses/validate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          let body: any = null;
          try {
            body = JSON.parse((await request.text()).replace(/\0+$/, ""));
          } catch {
            return ok({ valid: false, reason: "malformed" });
          }
          const { r } = await checkBotByIp(body, request.headers);
          if (!r.valid) return ok(r);
          const { bind: _b, ...out } = r;
          return ok(out);
        } catch {
          return ok({ valid: false, reason: "server_error" });
        }
      },
    },
  },
});
