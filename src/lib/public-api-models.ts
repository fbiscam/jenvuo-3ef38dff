// The only models exposed through the public Jenvu API (/api/public/v1).
// Claude Sonnet 4.5, Claude Haiku 4.5 and GLM-5 — nothing else.
export const PUBLIC_API_MODEL_IDS = [
  "claude-sonnet-4.5",
  "claude-haiku-4.5",
  "glm-5",
] as const;

export type PublicApiModelId = (typeof PUBLIC_API_MODEL_IDS)[number];

const GATEWAY_BY_ID: Record<PublicApiModelId, readonly string[]> = {
  "claude-sonnet-4.5": ["omniroute/kr/claude-sonnet-4.5", "omniroute/kr/claude-sonnet-4"],
  "claude-haiku-4.5": ["omniroute/kr/claude-haiku-4.5", "omniroute/kr/claude-sonnet-4"],
  "glm-5": ["omniroute/kr/glm-5", "omniroute/kr/claude-sonnet-4.5"],
};

// Legacy / convenience aliases so older integrations keep working.
const ALIASES: Record<string, PublicApiModelId> = {
  "jenvu-fast": "claude-haiku-4.5",
  "jenvu-pro": "claude-sonnet-4.5",
  "jenvu-vision": "claude-sonnet-4.5",
  "claude-sonnet-4-5": "claude-sonnet-4.5",
  "claude-haiku-4-5": "claude-haiku-4.5",
  "claude-4.5-sonnet": "claude-sonnet-4.5",
  "claude-4.5-haiku": "claude-haiku-4.5",
  "glm5": "glm-5",
};

/** Resolve a requested model name to a public model id, or null if unknown. */
export function resolvePublicModel(model: unknown): PublicApiModelId | null {
  const key = typeof model === "string" ? model.trim().toLowerCase() : "";
  if (!key) return "claude-sonnet-4.5";
  if ((PUBLIC_API_MODEL_IDS as readonly string[]).includes(key)) return key as PublicApiModelId;
  return ALIASES[key] ?? null;
}

export function gatewayChainFor(id: PublicApiModelId): string[] {
  return [...GATEWAY_BY_ID[id]];
}
