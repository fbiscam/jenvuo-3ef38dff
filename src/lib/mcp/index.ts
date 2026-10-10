import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listJournalTrades from "./tools/list-journal-trades";
import getCreditBalance from "./tools/get-credit-balance";

// Vite inlines the stable ref; the published SUPABASE_URL may be a proxy.
const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "jenvu",
  title: "Jenvu",
  version: "0.1.0",
  instructions:
    "Tools for Jenvu, an XAU/USD trading platform. Read the signed-in user's trade journal and credit balance.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listJournalTrades, getCreditBalance],
});
