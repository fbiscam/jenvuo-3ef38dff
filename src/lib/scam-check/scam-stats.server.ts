/** Server-only counters for the Scam Protection report. Never throws. */
export async function recordScamEvent(kind: "view" | "scan", verdict?: string): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.rpc("bump_scam_stat", verdict ? { _kind: kind, _verdict: verdict } : { _kind: kind });
  } catch {
    // counting must never break the page or the check
  }
}
