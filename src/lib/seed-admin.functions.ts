import { createServerFn } from "@tanstack/react-start";

export const seedAdmin = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const email = "haseeb@jenvu.com";
  const password = "Hasee12@#";

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    if (error.message?.toLowerCase().includes("already")) {
      return { ok: true, message: "User already exists" };
    }
    throw new Error(error.message);
  }

  return { ok: true, userId: data.user?.id };
});
