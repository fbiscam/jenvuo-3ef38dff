// Server-only: image generation through the Lovable AI Gateway (Chat page images).
export type ImageConfig = {
  baseURL: string;
  apiKey: string;
  model: string;
  format: "openai";
};

export const imageSettings: Omit<ImageConfig, "apiKey"> = {
  baseURL: "https://ai.gateway.lovable.dev",
  model: "openai/gpt-image-2.5-sunburst",
  format: "openai",
};

export function generateImage(config: ImageConfig, prompt: string, stream = true, signal?: AbortSignal) {
  const input = { prompt, ...(stream ? { partial_images: 1 } : {}) };
  return fetch(`${config.baseURL}/v1/images/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: config.model, ...input, ...(stream ? { stream: true } : {}) }),
    signal: signal ?? null,
  });
}
