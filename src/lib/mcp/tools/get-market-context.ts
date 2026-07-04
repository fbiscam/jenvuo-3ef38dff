import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "get_market_context",
  title: "Get gold market context",
  description:
    "Returns Jenvu's institutional-grade market context for a given gold pair — killzone timing, session bias hints, and which XAU pair the user asked about. Read-only informational tool.",
  inputSchema: {
    pair: z
      .enum(["XAUUSD", "XAUEUR", "XAUGBP", "XAUJPY", "XAUAUD", "XAUCHF"])
      .describe("Gold pair symbol (XAU vs quote currency)."),
  },
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: ({ pair }) => {
    const killzones = [
      "Asia: 00:00–03:00 UTC",
      "London Open: 07:00–10:00 UTC",
      "NY Open: 12:30–15:00 UTC",
      "London Close: 15:00–16:00 UTC",
    ];
    return {
      content: [
        {
          type: "text",
          text: `Jenvu context for ${pair}\n\nActive killzones (UTC):\n- ${killzones.join(
            "\n- ",
          )}\n\nJenvu applies ICT & SMC analysis (order blocks, FVGs, liquidity sweeps) around these windows. Ask the app for the live signal desk or narration for real-time entries, stops, and targets.`,
        },
      ],
      structuredContent: { pair, killzones },
    };
  },
});
