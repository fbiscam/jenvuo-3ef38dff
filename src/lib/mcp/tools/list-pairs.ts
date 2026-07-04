import { defineTool } from "@lovable.dev/mcp-js";

const PAIRS = [
  { symbol: "XAUUSD", display: "XAU/USD", quote: "USD" },
  { symbol: "XAUEUR", display: "XAU/EUR", quote: "EUR" },
  { symbol: "XAUGBP", display: "XAU/GBP", quote: "GBP" },
  { symbol: "XAUJPY", display: "XAU/JPY", quote: "JPY" },
  { symbol: "XAUAUD", display: "XAU/AUD", quote: "AUD" },
  { symbol: "XAUCHF", display: "XAU/CHF", quote: "CHF" },
];

export default defineTool({
  name: "list_pairs",
  title: "List supported gold pairs",
  description:
    "Lists the gold cross-pairs Jenvu covers (XAU vs USD/EUR/GBP/JPY/AUD/CHF).",
  inputSchema: {},
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: () => ({
    content: [
      {
        type: "text",
        text: `Supported pairs:\n${PAIRS.map((p) => `- ${p.display}`).join("\n")}`,
      },
    ],
    structuredContent: { pairs: PAIRS },
  }),
});
