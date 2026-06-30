import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/seed-admin")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const email = "support@jenvu.com";
        const password = "Hasee12@#";

        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });

        if (error) {
          if (error.message?.toLowerCase().includes("already")) {
            return new Response(JSON.stringify({ ok: true, message: "exists" }), {
              headers: { "content-type": "application/json" },
            });
          }
          return new Response(JSON.stringify({ ok: false, error: error.message }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ ok: true, userId: data.user?.id }), {
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
