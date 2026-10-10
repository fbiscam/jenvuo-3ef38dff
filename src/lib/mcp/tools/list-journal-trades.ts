import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_journal_trades",
  title: "List journal trades",
  description: "List the signed-in user's most recent trade journal entries.",
  inputSchema: {
    limit: z.number().int().min(1).max(100).optional().describe("How many trades to return (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const { data, error } = await supabaseForUser(ctx)
      .from("trade_journal")
      .select("id,pair,direction,entry,stop_loss,take_profit,outcome,pnl,notes,opened_at,closed_at")
      .order("opened_at", { ascending: false })
      .limit(limit ?? 20);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const trades = (data ?? []).map((t) => ({
      id: t.id, pair: t.pair, direction: t.direction, entry: t.entry, stop_loss: t.stop_loss,
      take_profit: t.take_profit, outcome: t.outcome, pnl: t.pnl, notes: t.notes,
      opened_at: t.opened_at, closed_at: t.closed_at,
    }));
    return { content: [{ type: "text", text: JSON.stringify(trades) }], structuredContent: { trades } };
  },
});
