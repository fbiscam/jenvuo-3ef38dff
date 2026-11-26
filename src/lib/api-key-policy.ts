import { PUBLIC_API_MODEL_IDS } from "./public-api-models";

export type ApiKeyOptions = { allowedModels: string[] | null; expiresAt: string | null };

export function validateApiKeyOptions(input: { allowedModels?: unknown; expiresAt?: unknown }, now = Date.now()): ApiKeyOptions {
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
  return { allowedModels, expiresAt };
}

export function apiKeyExpired(expiresAt: string | null | undefined, now = Date.now()): boolean {
  return expiresAt != null && (!Number.isFinite(Date.parse(expiresAt)) || Date.parse(expiresAt) <= now);
}

export function apiKeyAllowsModel(allowedModels: readonly string[] | null, model: string): boolean {
  return allowedModels === null || allowedModels.includes(model);
}