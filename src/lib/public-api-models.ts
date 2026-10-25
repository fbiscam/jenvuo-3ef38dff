// The only models exposed through the public Jenvu API (/api/public/v1).
// Catalog verified against the configured service on 2026-10-25.
export const PUBLIC_API_MODEL_IDS = [
  "claude-opus-5",
  "claude-fable-5.1",
  "gpt-5.5",
  "seed-2.1-turbo", "glm-5.3", "qwen3.8-27b", "gpt-5.6-terra",
  "gpt-5.6-luna", "qwen3.8-max", "gemma-2-2b", "claude-mythos-preview",
  "deepseek-v4-pro-0813", "deepseek-v4-flash-0731", "kimi-k2.6",
  "gemini-3.1-pro", "claude-fable-5", "claude-opus-4.8", "seed-2.1-pro",
  "glm-5.2", "qwen3.7-max", "claude-opus-5.5", "gpt-5.5-pro",
  "muse-spark-1.1", "gpt-5.6-sol", "deepseek-v4-pro-max", "kimi-k3",
  "claude-sonnet-5", "grok-4.6", "gemini-3.6-flash", "claude-opus-4.7",
  "gemini-3.7-flash", "grok-4.5", "claude-opus-4.6",
] as const;

export type PublicApiModelId = (typeof PUBLIC_API_MODEL_IDS)[number];

// Legacy / convenience aliases so older integrations keep working.
const ALIASES: Record<string, PublicApiModelId> = {
  "jenvu-fast": "gpt-5.5",
  "jenvu-pro": "claude-opus-5",
  "jenvu-vision": "claude-opus-5",
  "claude-sonnet-4.5": "claude-opus-5",
  "claude-haiku-4.5": "gpt-5.5",
  "glm-5": "gpt-5.5",
  "claude-sonnet-4-5": "claude-opus-5",
  "claude-haiku-4-5": "gpt-5.5",
  "claude-4.5-sonnet": "claude-opus-5",
  "claude-4.5-haiku": "gpt-5.5",
  "glm5": "gpt-5.5",
};

/** Resolve a requested model name to a public model id, or null if unknown. */
export function resolvePublicModel(model: unknown): PublicApiModelId | null {
  const key = typeof model === "string" ? model.trim().toLowerCase() : "";
  if (!key) return "claude-opus-5";
  if ((PUBLIC_API_MODEL_IDS as readonly string[]).includes(key)) return key as PublicApiModelId;
  return ALIASES[key] ?? null;
}

export function gatewayChainFor(id: PublicApiModelId): string[] {
  // Never silently substitute a different model or provider for API callers.
  return [`codecraft/${id}`];
}
