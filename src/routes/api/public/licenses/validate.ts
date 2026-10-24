import { createFileRoute } from "@tanstack/react-router";
import { evaluateLicense } from "@/lib/mt5-licenses";

// Always HTTP 200: the MT5 bot reads the JSON body only.
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
          const key = String(body?.key ?? "").trim().toUpperCase().slice(0, 40);
          const account = String(body?.mt5_account ?? "").trim().slice(0, 20);
          const pre = evaluateLicense(key, account, { mt5_account: null, revoked_at: null }, null);
          if (!pre.valid && pre.reason === "malformed") return ok(pre);

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const db = supabaseAdmin as any;
          const { data: lic } = await db.from("mt5_licenses").select("id,user_id,mt5_account,revoked_at").eq("license_key", key).maybeSingle();
          let sub = null;
          if (lic) {
            const { data } = await db.from("user_subscriptions").select("plan_id,status,is_trial,current_period_end").eq("user_id", lic.user_id).maybeSingle();
            sub = data ?? null;
          }
          const r = evaluateLicense(key, account, lic ?? null, sub);
          if (!r.valid) return ok(r);
          await db.from("mt5_licenses").update({ last_validated_at: new Date().toISOString(), ...(r.bind ? { mt5_account: account } : {}) }).eq("id", lic.id);
          const { bind: _b, ...out } = r;
          return ok(out);
        } catch {
          return ok({ valid: false, reason: "server_error" });
        }
      },
    },
  },
});
