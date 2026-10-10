import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_credit_balance",
  title: "Get credit balance",
  description: "Get the signed-in user's current Jenvu credit balance and monthly allowance.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const { data, error } = await supabaseForUser(ctx)
      .from("credit_balances")
      .select("balance,monthly_allowance,period_resets_at")
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const credits = {
      balance: data?.balance ?? 0,
      monthly_allowance: data?.monthly_allowance ?? 0,
      period_resets_at: data?.period_resets_at ?? null,
    };
    return { content: [{ type: "text", text: JSON.stringify(credits) }], structuredContent: { credits } };
  },
});
