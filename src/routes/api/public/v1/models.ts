// Lists the model aliases available to Jenvu API keys (OpenAI-compatible shape).
import { createFileRoute } from "@tanstack/react-router";
import {
  authenticateExtensionRequest,
  extJson,
  EXT_CORS_HEADERS,
} from "@/lib/extension-auth.server";

const MODELS = ["jenvu-fast", "jenvu-pro", "jenvu-vision"];

export const Route = createFileRoute("/api/public/v1/models")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: EXT_CORS_HEADERS }),
      GET: async ({ request }) => {
        const auth = await authenticateExtensionRequest(request);
        if (!auth.ok) {
          return extJson({ error: { message: auth.error, type: "invalid_request_error" } }, auth.status);
        }
        return extJson({
          object: "list",
          data: MODELS.map((id) => ({ id, object: "model", owned_by: "jenvu" })),
        });
      },
    },
  },
});
