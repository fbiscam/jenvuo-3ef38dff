// The only models exposed through the public Jenvu API (/api/public/v1).
// Catalog verified against the configured service on 2026-10-25.
// AWS Bedrock models (public id -> AWS model id), all live-tested on 2026-11-02.
export const AWS_MODEL_MAP = {
  "deepseek-v3.2": "deepseek.v3.2",
  "deepseek-v3.1": "deepseek.v3.1",
  "qwen3-coder-480b": "qwen.qwen3-coder-480b-a35b-instruct",
  "qwen3-coder-30b": "qwen.qwen3-coder-30b-a3b-instruct",
  "qwen3-coder-next": "qwen.qwen3-coder-next",
  "qwen3-235b": "qwen.qwen3-235b-a22b-2507",
  "qwen3-vl-235b": "qwen.qwen3-vl-235b-a22b-instruct",
  "qwen3-next-80b": "qwen.qwen3-next-80b-a3b-instruct",
  "qwen3-32b": "qwen.qwen3-32b",
  "mistral-large-3": "mistral.mistral-large-3-675b-instruct",
  "devstral-2": "mistral.devstral-2-123b",
  "magistral-small": "mistral.magistral-small-2509",
  "ministral-3-14b": "mistral.ministral-3-14b-instruct",
  "ministral-3-8b": "mistral.ministral-3-8b-instruct",
  "ministral-3-3b": "mistral.ministral-3-3b-instruct",
  "kimi-k2.5": "moonshotai.kimi-k2.5",
  "kimi-k2-thinking": "moonshotai.kimi-k2-thinking",
  "gpt-oss-120b": "openai.gpt-oss-120b",
  "gpt-oss-20b": "openai.gpt-oss-20b",
  "glm-5": "zai.glm-5",
  "glm-4.7": "zai.glm-4.7",
  "glm-4.7-flash": "zai.glm-4.7-flash",
  "glm-4.6": "zai.glm-4.6",
  "minimax-m2.5": "minimax.minimax-m2.5",
  "minimax-m2.1": "minimax.minimax-m2.1",
  "minimax-m2": "minimax.minimax-m2",
  "gemma-3-27b": "google.gemma-3-27b-it",
  "gemma-3-12b": "google.gemma-3-12b-it",
  "gemma-3-4b": "google.gemma-3-4b-it",
  "nemotron-super-3": "nvidia.nemotron-super-3-120b",
  "nemotron-nano-3": "nvidia.nemotron-nano-3-30b",
  "nemotron-nano-9b": "nvidia.nemotron-nano-9b-v2",
} as const;

export type AwsModelId = keyof typeof AWS_MODEL_MAP;

export const PUBLIC_API_MODEL_IDS = [
  "deepseek-v3.2", "deepseek-v3.1", "qwen3-coder-480b", "qwen3-coder-30b", "qwen3-coder-next",
  "qwen3-235b", "qwen3-vl-235b", "qwen3-next-80b", "qwen3-32b", "mistral-large-3", "devstral-2",
  "magistral-small", "ministral-3-14b", "ministral-3-8b", "ministral-3-3b", "kimi-k2.5",
  "kimi-k2-thinking", "gpt-oss-120b", "gpt-oss-20b", "glm-5", "glm-4.7", "glm-4.7-flash", "glm-4.6",
  "minimax-m2.5", "minimax-m2.1", "minimax-m2", "gemma-3-27b", "gemma-3-12b", "gemma-3-4b",
  "nemotron-super-3", "nemotron-nano-3", "nemotron-nano-9b",
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
  "claude-sonnet-4-5": "claude-opus-5",
  "claude-haiku-4-5": "gpt-5.5",
  "claude-4.5-sonnet": "claude-opus-5",
  "claude-4.5-haiku": "gpt-5.5",
  "glm5": "gpt-5.5",
};

/** Resolve a requested model name to a public model id, or null if unknown. */
export function resolvePublicModel(model: unknown): PublicApiModelId | null {
  const key = typeof model === "string" ? model.trim().toLowerCase() : "";
  if (!key) return "deepseek-v3.2";
  if ((PUBLIC_API_MODEL_IDS as readonly string[]).includes(key)) return key as PublicApiModelId;
  return ALIASES[key] ?? null;
}

export function gatewayChainFor(id: PublicApiModelId): string[] {
  // Never silently substitute a different model or provider for API callers.
  const aws = (AWS_MODEL_MAP as Record<string, string>)[id];
  return aws ? [`aws/${aws}`] : [`codecraft/${id}`];
}
