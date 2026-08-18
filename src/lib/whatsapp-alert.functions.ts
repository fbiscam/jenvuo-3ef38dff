import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getWhatsappAlertLink = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await supabaseAdmin
      .from("whatsapp_alert_links")
      .select("phone_number, whatsapp_enabled, verified_at, last_error")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (error) throw new Error(error.message);

    return {
      linked: !!data,
      phoneNumber: data?.phone_number ?? null,
      enabled: data?.whatsapp_enabled ?? false,
      verifiedAt: data?.verified_at ?? null,
      lastError: data?.last_error ?? null,
    };
  });

export const connectWhatsappAlertLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ phoneNumber: z.string().min(10).max(20) }).parse(d))
  .handler(async ({ data, context }) => {
    // Basic normalization: remove anything that isn't a digit or +
    const phone = data.phoneNumber.replace(/[^\d+]/g, "");
    
    // In a real scenario, we'd send a verification code here.
    // For now, since the user has their "own API", we assume they just want to link it.
    // We'll mark it as verified immediately for this implementation.
    const { error } = await supabaseAdmin
      .from("whatsapp_alert_links")
      .upsert({
        user_id: context.userId,
        phone_number: phone,
        whatsapp_enabled: true,
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (error) throw new Error(error.message);

    // Try to send a welcome message
    try {
      const { sendSignalAlertWhatsApp } = await import("./whatsapp-alert.server");
      // Send a dummy alert as test
      await sendSignalAlertWhatsApp({
        alertId: "test",
        pair: "WELCOME",
        grade: "A+",
        direction: "BUY",
        entry: 0,
        sl: 0,
        tp: 0,
        rr: 0,
        confidence: 100,
        decimals: 2,
        rationale: "Welcome to Jenvu WhatsApp Alerts! Your connection is active.",
      } as any);
    } catch (e) {
      console.error("[WhatsApp] Welcome message failed:", e);
    }

    return { ok: true, phoneNumber: phone };
  });

export const setWhatsappAlertEnabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ enabled: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin
      .from("whatsapp_alert_links")
      .update({ whatsapp_enabled: data.enabled, updated_at: new Date().toISOString() })
      .eq("user_id", context.userId);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const disconnectWhatsappAlertLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await supabaseAdmin
      .from("whatsapp_alert_links")
      .delete()
      .eq("user_id", context.userId);

    if (error) throw new Error(error.message);
    return { ok: true };
  });
