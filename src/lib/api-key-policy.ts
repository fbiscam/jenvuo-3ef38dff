import { PUBLIC_API_MODEL_IDS } from "./public-api-models";

export type ApiKeyOptions = { allowedModels: string[] | null; expiresAt: string | null; rpmLimit: number | null; tokenLimit: number | null };

function positiveInt(value: unknown, max: number, label: string): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(n) || n < 1 || n > max) throw new Error(`${label} must be a whole number from 1 to ${max.toLocaleString("en-US")}.`);
  return n;
}

/** True once a key with a token limit has used all of it. */
export function apiKeyTokensExhausted(tokenLimit: number | null | undefined, tokensUsed: number | null | undefined): boolean {
  return tokenLimit != null && Number(tokensUsed ?? 0) >= tokenLimit;
}

export function validateApiKeyOptions(input: { allowedModels?: unknown; expiresAt?: unknown; rpmLimit?: unknown; tokenLimit?: unknown }, now = Date.now()): ApiKeyOptions {
  let allowedModels: string[] | null = null;
  if (input.allowedModels != null) {
    if (!Array.isArray(input.allowedModels) || !input.allowedModels.length || input.allowedModels.some((id) => typeof id !== "string" || !(PUBLIC_API_MODEL_IDS as readonly string[]).includes(id))) {
      throw new Error("Select at least one available model.");
    }
    allowedModels = [...new Set(input.allowedModels as string[])];
  }
  let expiresAt: string | null = null;
  if (input.expiresAt != null && input.expiresAt !== "") {
    const time = typeof input.expiresAt === "string" ? Date.parse(input.expiresAt) : NaN;
    if (!Number.isFinite(time) || time <= now) throw new Error("Expiry must be in the future.");
    expiresAt = new Date(time).toISOString();
  }
  const rpmLimit = positiveInt(input.rpmLimit, 10000, "Requests per minute");
  const tokenLimit = positiveInt(input.tokenLimit, 1_000_000_000, "Total token limit");
  return { allowedModels, expiresAt, rpmLimit, tokenLimit };
}

export function apiKeyExpired(expiresAt: string | null | undefined, now = Date.now()): boolean {
  return expiresAt != null && (!Number.isFinite(Date.parse(expiresAt)) || Date.parse(expiresAt) <= now);
}

export function apiKeyAllowsModel(allowedModels: readonly string[] | null, model: string): boolean {
  return allowedModels === null || allowedModels.includes(model);
}