// Lists the models available to Jenvu API keys (OpenAI-compatible shape).
// Auth is optional here: many clients (Claude Desktop, OpenAI SDKs, LibreChat)
// probe /v1/models before they attach the key, and a 401 makes them fail setup.
import { createFileRoute } from "@tanstack/react-router";
import { extJson, EXT_CORS_HEADERS } from "@/lib/extension-auth.server";
import { PUBLIC_API_MODEL_IDS } from "@/lib/public-api-models";

export const Route = createFileRoute("/api/public/v1/models")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: EXT_CORS_HEADERS }),
      GET: async () =>
        extJson({
          object: "list",
          data: PUBLIC_API_MODEL_IDS.map((id) => ({
            id,
            object: "model",
            created: 1_750_000_000,
            owned_by: "jenvu",
          })),
        }),
    },
  },
});
