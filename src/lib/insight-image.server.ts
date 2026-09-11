// Server-only helper: generates an AI cover image for an insight article and
// stores it in the private `insight-images` bucket. The public site reads it
// back through /api/public/insight-image/$path (see that route).
//
// Note: the Bluesminds gateway has no image-capable model (its catalogue is
// text-only), so article TEXT is written with Bluesminds while the COVER IMAGE
// is generated with Lovable AI's Gemini image model.

const IMAGE_MODELS = [
  "google/gemini-3.1-flash-image",
  "google/gemini-2.5-flash-image",
  "openai/gpt-image-1-mini",
] as const;

export const INSIGHT_IMAGE_BUCKET = "insight-images";

export class InsightImageGenerationError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function coverPrompt(title: string, category: string): string {
  return [
    "Create a premium, editorial cover image for a professional gold-trading research article.",
    `Article title: "${title}". Category: ${category}.`,
    "Style: dark cinematic fintech aesthetic, deep charcoal/near-black background, warm gold accents,",
    "subtle candlestick chart geometry, soft volumetric light, high detail, 16:9 composition, no text,",
    "no words, no letters, no logos, no watermarks, no human faces.",
  ].join(" ");
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
  const viaGoogle = await generateWithGoogle(prompt);
  if (viaGoogle) return viaGoogle;

  const viaFree = await generateWithPollinations(prompt);
  if (viaFree) return viaFree;

  const key = process.env.LOVABLE_API_KEY;
  if (!key) return null;




  for (const model of IMAGE_MODELS) {
    try {
      const isOpenAi = model.startsWith("openai/");
      const body = isOpenAi
        ? { model, prompt, quality: "low", stream: false }
        : {
            model,
            messages: [{ role: "user", content: prompt }],
            modalities: ["image", "text"],
            stream: false,
          };

      const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const detail = (await res.text()).slice(0, 500);
        console.warn("[insight-image] model failed", model, res.status, detail.slice(0, 200));
        if (res.status === 402 || res.status === 403) {
          throw new InsightImageGenerationError(`Cover image provider failed [${res.status}]: ${detail}`, res.status);
        }
        continue;
      }

      const json = (await res.json()) as any;
      const b64: string | undefined =
        json?.data?.[0]?.b64_json ??
        json?.choices?.[0]?.message?.images?.[0]?.image_url?.url ??
        json?.choices?.[0]?.message?.content?.find?.((p: any) => p?.type === "image_url")?.image_url?.url;

      if (typeof b64 === "string" && b64.length > 100) {
        return { b64: b64.replace(/^data:image\/\w+;base64,/, ""), model };
      }
      console.warn("[insight-image] no image payload from", model);
    } catch (e) {
      if (e instanceof InsightImageGenerationError) throw e;
      console.warn("[insight-image] threw", model, String(e));
    }
  }
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
