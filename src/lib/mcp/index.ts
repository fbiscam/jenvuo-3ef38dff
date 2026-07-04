import { defineMcp } from "@lovable.dev/mcp-js";
import getMarketContext from "./tools/get-market-context";
import listPairs from "./tools/list-pairs";

export default defineMcp({
  name: "jenvu-mcp",
  title: "Jenvu AI MCP",
  version: "0.1.0",
  instructions:
    "Tools for Jenvu AI — an institutional-grade voice intelligence platform for gold traders. Use `list_pairs` to see supported XAU cross-pairs and `get_market_context` to fetch killzone timing and ICT/SMC session context for a pair.",
  tools: [listPairs, getMarketContext],
});
