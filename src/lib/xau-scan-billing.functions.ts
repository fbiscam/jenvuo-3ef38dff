// Per-scan billing for the XAU/USD terminal (homepage + dashboard).
//
// Every auto-scan cycle charges the signed-in account a flat fee. When the
// wallet balance runs out, the terminal hides live analysis data.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const TERMINAL_SCAN_FEE_USD = 0.3;

export type ScanBillingState = {
  balance: number;
  blocked: boolean;
  charged: boolean;
  fee: number;
};

export const billTerminalScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { scanId: string }) => ({ scanId: String(input?.scanId ?? "") }))
  .handler(async ({ data, context }): Promise<ScanBillingState> => {
    const userId = context.userId;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const readBalance = async (): Promise<number> => {
      const { data: row } = await supabaseAdmin
        .from("credit_balances")
        .select("balance")
        .eq("user_id", userId)
        .maybeSingle();
      return Number(row?.balance ?? 0);
    };

    // Idempotency: one charge per scan id per user.
    if (data.scanId) {
      const { data: dupe } = await supabaseAdmin
        .from("credit_ledger")
        .select("id")
        .eq("user_id", userId)
        .eq("reason", "terminal_scan")
        .contains("metadata", { scanId: data.scanId })
        .limit(1)
        .maybeSingle();
      if (dupe?.id) {
        const balance = await readBalance();
        return { balance, blocked: balance < TERMINAL_SCAN_FEE_USD, charged: false, fee: TERMINAL_SCAN_FEE_USD };
      }
    }

    const before = await readBalance();
    if (before < TERMINAL_SCAN_FEE_USD) {
      return { balance: before, blocked: true, charged: false, fee: TERMINAL_SCAN_FEE_USD };
    }

    const { data: after, error } = await supabaseAdmin.rpc("spend_credits", {
      _user_id: userId,
      _amount: TERMINAL_SCAN_FEE_USD as any,
      _reason: "terminal_scan",
      _metadata: {
        stage: "terminal_scan",
        symbol: "XAUUSD",
        scanId: data.scanId || null,
        charge_usd: TERMINAL_SCAN_FEE_USD,
      } as any,
    });

    if (error) {
      const balance = await readBalance();
      const insufficient = Boolean(error.message?.includes("INSUFFICIENT_CREDITS"));
      return {
        balance,
        blocked: insufficient || balance < TERMINAL_SCAN_FEE_USD,
        charged: false,
        fee: TERMINAL_SCAN_FEE_USD,
      };
    }

    const balance = Number(after ?? before - TERMINAL_SCAN_FEE_USD);
    return { balance, blocked: balance < TERMINAL_SCAN_FEE_USD, charged: true, fee: TERMINAL_SCAN_FEE_USD };
  });
