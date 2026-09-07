// Publishes qualifying (>=70% confidence) XAU/USD terminal signals to the
// live signals feed and broadcasts them to WhatsApp recipients.
//
// The homepage/dashboard terminal engine runs every 45s. Only a real
// ACTIVE signal is persisted, and only once per cooldown window, so the
// Live Signals page and WhatsApp broadcast stay in sync with the terminal.

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendSignalAlertWhatsApp } from "@/lib/whatsapp-alert.server";

const MIN_CONFIDENCE = 70;
const COOLDOWN_MIN = 45;

export type PublishInput = {
  direction: "long" | "short";
  entry: number;
  sl: number;
  tp: number;
  rr: number;
  confidence: number;
  rationale?: string | null;
  session?: string | null;
  killzone?: string | null;
  htfBias?: string | null;
  setupScore?: number | null;
};

function gradeOf(confidence: number): string {
  if (confidence >= 88) return "A+";
  if (confidence >= 80) return "A";
  if (confidence >= 74) return "B";
  return "C";
}

/**
 * Idempotent per cooldown window: if an alert for the same pair+direction
 * already fired within COOLDOWN_MIN, nothing is written or broadcast.
 */
export async function publishXauSignal(
  input: PublishInput,
): Promise<{ published: boolean; alertId?: string; sent?: number; reason?: string }> {
  try {
    if (!Number.isFinite(input.confidence) || input.confidence < MIN_CONFIDENCE) {
      return { published: false, reason: "below_min_confidence" };
    }
    const dir = input.direction === "long" ? "BUY" : "SELL";
    const pair = "XAUUSD";
    const since = new Date(Date.now() - COOLDOWN_MIN * 60_000).toISOString();

    const { data: recent } = await supabaseAdmin
      .from("signal_alerts")
      .select("id")
      .eq("pair", pair)
      .eq("direction", dir)
      .gte("fired_at", since)
      .limit(1)
      .maybeSingle();
    if (recent?.id) return { published: false, reason: "cooldown" };

    const grade = gradeOf(input.confidence);
    const { data: inserted, error } = await supabaseAdmin
      .from("signal_alerts")
      .insert({
        pair,
        grade,
        direction: dir,
        entry: input.entry,
        sl: input.sl,
        tp: input.tp,
        rr: input.rr,
        confidence: Math.round(input.confidence),
        setup_score: input.setupScore ?? Math.round(input.confidence),
        htf_bias: input.htfBias ?? null,
        session: input.session ?? null,
        killzone: input.killzone ?? null,
        rationale: input.rationale ?? null,
        fired_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error || !inserted?.id) {
      console.warn("publishXauSignal insert failed:", error?.message);
      return { published: false, reason: "insert_failed" };
    }

    let sent = 0;
    try {
      const res = await sendSignalAlertWhatsApp({
        alertId: inserted.id,
        pair,
        grade,
        direction: dir,
        entry: input.entry,
        sl: input.sl,
        tp: input.tp,
        rr: input.rr,
        confidence: Math.round(input.confidence),
        decimals: 2,
        rationale: input.rationale ?? null,
        session: input.session ?? null,
        killzone: input.killzone ?? null,
        htfBias: input.htfBias ?? null,
      });
      sent = res.sent;
    } catch (e) {
      console.warn("publishXauSignal broadcast failed:", (e as Error)?.message ?? e);
    }

    try {
      const { sendSignalAlertTelegram } = await import("@/lib/telegram-alert.server");
      await sendSignalAlertTelegram({
        alertId: inserted.id,
        pair,
        grade,
        direction: dir,
        entry: input.entry,
        sl: input.sl,
        tp: input.tp,
        rr: input.rr,
        confidence: Math.round(input.confidence),
        decimals: 2,
        rationale: input.rationale ?? null,
        session: input.session ?? null,
        killzone: input.killzone ?? null,
        htfBias: input.htfBias ?? null,
      });
    } catch (e) {
      console.warn("publishXauSignal telegram failed:", (e as Error)?.message ?? e);
    }

    return { published: true, alertId: inserted.id, sent };
  } catch (e) {
    console.warn("publishXauSignal failed:", (e as Error)?.message ?? e);
    return { published: false, reason: "error" };
  }
}
