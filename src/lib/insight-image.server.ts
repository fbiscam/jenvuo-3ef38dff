// Server-only helper: generates an AI cover image for an insight article and
// stores it in the private `insight-images` bucket. The public site reads it
// back through /api/public/insight-image/$path (see that route).
//
// UnoRouter's free image routes are attempted first. Google AI and the free
// image provider are independent fallbacks; Lovable AI is never called.

export const INSIGHT_IMAGE_BUCKET = "insight-images";

export class InsightImageGenerationError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const UNOROUTER_IMAGE_MODELS = [
  "gpt-image-2:free",
  "juggernaut-xl:free",
  "dreamshaper:free",
] as const;

function coverPrompt(title: string, category: string): string {
  return [
    "Create a premium, editorial cover image for a professional gold-trading research article.",
    `Article title: "${title}". Category: ${category}.`,
    "Style: dark cinematic fintech aesthetic, deep charcoal/near-black background, warm gold accents,",
    "subtle candlestick chart geometry, soft volumetric light, high detail, 16:9 composition, no text,",
    "no words, no letters, no logos, no watermarks, no human faces.",
  ].join(" ");
}

async function generateWithUnoRouter(
  prompt: string,
): Promise<{ b64: string; model: string; mime?: string } | null> {
  const key = process.env.UNOROUTER_API_KEY;
  if (!key) return null;

  for (const model of UNOROUTER_IMAGE_MODELS) {
    try {
      const res = await fetch("https://api.unorouter.com/v1/images/generations", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, prompt, size: "1280x720", n: 1 }),
      });
      if (!res.ok) {
        console.warn("[insight-image] UnoRouter failed", model, res.status, (await res.text()).slice(0, 200));
        continue;
      }

      const json = (await res.json()) as { data?: Array<{ b64_json?: string; url?: string }> };
      const image = json.data?.[0];
      if (image?.b64_json) return { b64: image.b64_json, model: `unorouter:${model}` };
      if (image?.url) {
        const imageResponse = await fetch(image.url);
        if (!imageResponse.ok) continue;
        const mime = imageResponse.headers.get("content-type") || "image/png";
        const bytes = new Uint8Array(await imageResponse.arrayBuffer());
        let binary = "";
        for (const byte of bytes) binary += String.fromCharCode(byte);
        return { b64: btoa(binary), model: `unorouter:${model}`, mime };
      }
    } catch (error) {
      console.warn("[insight-image] UnoRouter threw", model, String(error));
    }
  }
  return null;
}

// Direct Google AI Studio (Gemini) image generation using the user's own key.
const GOOGLE_IMAGE_MODELS = [
  "gemini-3-pro-image-preview",
  "gemini-2.5-flash-image",
] as const;

async function generateWithGoogle(prompt: string): Promise<{ b64: string; model: string } | null> {
  const key = process.env.GOOGLE_AI_API_KEY;
  if (!key) return null;

  for (const model of GOOGLE_IMAGE_MODELS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { responseModalities: ["IMAGE"] },
          }),
        },
      );

      if (!res.ok) {
        console.warn("[insight-image] google failed", model, res.status, (await res.text()).slice(0, 200));
        continue;
      }

      const json = (await res.json()) as any;
      const parts: any[] = json?.candidates?.[0]?.content?.parts ?? [];
      const inline = parts.find((p) => p?.inlineData?.data)?.inlineData?.data;
      if (typeof inline === "string" && inline.length > 100) {
        return { b64: inline, model: `google:${model}` };
      }
      console.warn("[insight-image] google returned no image", model);
    } catch (e) {
      console.warn("[insight-image] google threw", model, String(e));
    }
  }
  return null;
}

// Free, keyless image provider (no Lovable credits are consumed).
async function generateWithPollinations(
  prompt: string,
): Promise<{ b64: string; model: string; mime: string } | null> {
  const models = ["flux", "turbo"];
  for (const model of models) {
    try {
      const url =
        `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
        `?width=1280&height=720&nologo=true&safe=false&model=${model}&seed=${Date.now() % 100000}`;
      const res = await fetch(url);
      if (!res.ok) {
        console.warn("[insight-image] pollinations failed", model, res.status);
        continue;
      }
      const mime = res.headers.get("content-type") || "image/jpeg";
      if (!mime.startsWith("image/")) continue;
      const buf = new Uint8Array(await res.arrayBuffer());
      if (buf.byteLength < 5000) continue;
      let bin = "";
      for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]!);
      return { b64: btoa(bin), model: `pollinations:${model}`, mime };
    } catch (e) {
      console.warn("[insight-image] pollinations threw", model, String(e));
    }
  }
  return null;
}

async function generateBase64(
  prompt: string,
): Promise<{ b64: string; model: string; mime?: string } | null> {
  const viaUnoRouter = await generateWithUnoRouter(prompt);
  if (viaUnoRouter) return viaUnoRouter;

  const viaGoogle = await generateWithGoogle(prompt);
  if (viaGoogle) return viaGoogle;

  const viaFree = await generateWithPollinations(prompt);
  if (viaFree) return viaFree;
  return null;
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/**
 * Generates and stores a cover image. Returns the app-relative URL to use as
 * `insights.image_url`, or null when generation is unavailable.
 */
export async function generateInsightCover(opts: {
  title: string;
  category: string;
  slug: string;
}): Promise<string | null> {
  const generated = await generateBase64(coverPrompt(opts.title, opts.category));
  if (!generated) return null;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const mime = generated.mime || "image/png";
  const ext = mime.includes("jpeg") || mime.includes("jpg") ? "jpg" : mime.includes("webp") ? "webp" : "png";
  const path = `${opts.slug}-${Date.now()}.${ext}`;

  const { error } = await supabaseAdmin.storage
    .from(INSIGHT_IMAGE_BUCKET)
    .upload(path, base64ToBytes(generated.b64), {
      contentType: mime,
      upsert: true,
    });

  if (error) {
    console.warn("[insight-image] upload failed", error.message);
    return null;
  }

  return `/api/public/insight-image/${path}`;
}
