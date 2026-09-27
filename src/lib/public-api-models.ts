// The only models exposed through the public Jenvu API (/api/public/v1).
// Claude Opus 5, Claude Fable 5.1 and GPT 5.5 — nothing else.
export const PUBLIC_API_MODEL_IDS = [
  "claude-opus-5",
  "claude-fable-5.1",
  "gpt-5.5",
] as const;

export type PublicApiModelId = (typeof PUBLIC_API_MODEL_IDS)[number];

const GATEWAY_BY_ID: Record<PublicApiModelId, readonly string[]> = {
  "claude-opus-5": ["codecraft/claude-opus-5", "codecraft/claude-fable-5.1"],
  "claude-fable-5.1": ["codecraft/claude-fable-5.1", "codecraft/claude-opus-5.5"],
  "gpt-5.5": ["codecraft/gpt-5.5", "codecraft/grok-4.6"],
};

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
  return [...GATEWAY_BY_ID[id]];
}
