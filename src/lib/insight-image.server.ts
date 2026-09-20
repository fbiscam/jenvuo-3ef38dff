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

// Each article must get a visually distinct cover. A stable hash of the slug
// picks a scene/palette/angle combination, and a random seed suffix keeps two
// articles on the same topic family from rendering near-identical images.
const COVER_SCENES = [
  "macro shot of a molten gold ingot surface with rippling liquid metal",
  "abstract 3D candlestick canyon rendered as polished metal blocks",
  "an institutional trading floor abstracted into glowing glass planes",
  "a slow-motion burst of gold dust particles over a dark grid",
  "layered depth-of-market ribbons flowing like silk through darkness",
  "a precision mechanical vault mechanism with gold gearing",
  "topographic liquidity map carved into brushed metal",
  "orbiting concentric rings of light around a single gold sphere",
  "cracked obsidian slab revealing veins of glowing gold",
  "long-exposure light trails forming an upward market structure",
] as const;

const COVER_PALETTES = [
  "deep charcoal with champagne gold highlights",
  "near-black navy with amber and bronze accents",
  "graphite grey with warm honey gold rim light",
  "midnight teal with pale gold and ivory highlights",
  "espresso brown with burnished copper-gold glow",
] as const;

const COVER_TREATMENTS = [
  "cinematic wide shot, shallow depth of field",
  "top-down flat-lay composition, hard directional light",
  "extreme macro detail, soft volumetric haze",
  "isometric 3D render, clean studio lighting",
  "long-exposure motion blur, dramatic side light",
] as const;

function hashString(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function coverPrompt(title: string, category: string, slug = ""): string {
  const h = hashString(slug || title);
  const scene = COVER_SCENES[h % COVER_SCENES.length];
  const palette = COVER_PALETTES[Math.floor(h / 7) % COVER_PALETTES.length];
  const treatment = COVER_TREATMENTS[Math.floor(h / 53) % COVER_TREATMENTS.length];
  return [
    "Create a premium, editorial cover image for a professional gold-trading research article.",
    `Article title: "${title}". Category: ${category}.`,
    `Visual concept: ${scene}.`,
    `Colour palette: ${palette}.`,
    `Photography/render treatment: ${treatment}.`,
    "Premium fintech aesthetic, high detail, 16:9 composition, no text, no words, no letters,",
    "no logos, no watermarks, no charts with labels, no human faces.",
    `Unique variation id: ${h % 99991}.`,
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

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Last-resort cover: rendered locally so an article is never blocked from
// publishing when every external image provider is rate limited or down.
function localCoverSvg(title: string, category: string, slug: string): string {
  const h = hashString(slug || title);
  const hue = h % 40; // warm gold/amber range
  const words = title.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > 26) {
      lines.push(current.trim());
      current = word;
    } else {
      current = `${current} ${word}`;
    }
    if (lines.length === 3) break;
  }
  if (lines.length < 3 && current.trim()) lines.push(current.trim());

  const text = lines
    .map(
      (line, i) =>
        `<text x="80" y="${300 + i * 68}" font-family="Georgia, serif" font-size="54" fill="#f5e6c8">${escapeXml(line)}</text>`,
    )
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="hsl(${hue}, 28%, 9%)"/>
      <stop offset="100%" stop-color="hsl(${(hue + 18) % 360}, 45%, 18%)"/>
    </linearGradient>
  </defs>
  <rect width="1280" height="720" fill="url(#bg)"/>
  <circle cx="1080" cy="180" r="220" fill="#d4af37" opacity="0.14"/>
  <circle cx="1180" cy="620" r="160" fill="#d4af37" opacity="0.08"/>
  <rect x="80" y="150" width="90" height="6" fill="#d4af37"/>
  <text x="80" y="210" font-family="Helvetica, Arial, sans-serif" font-size="24" letter-spacing="6" fill="#d4af37">${escapeXml(
    category.toUpperCase(),
  )}</text>
  ${text}
  <text x="80" y="640" font-family="Helvetica, Arial, sans-serif" font-size="26" letter-spacing="4" fill="#9a8e74">JENVU · XAU/USD RESEARCH</text>
</svg>`;
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
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const generated = await generateBase64(coverPrompt(opts.title, opts.category, opts.slug));

  let bytes: Uint8Array;
  let mime: string;
  if (generated) {
    mime = generated.mime || "image/png";
    bytes = base64ToBytes(generated.b64);
  } else {
    // Every external provider is unavailable — fall back to a locally drawn
    // cover so the article still publishes on schedule.
    console.warn("[insight-image] all providers unavailable, using local cover");
    mime = "image/svg+xml";
    bytes = new TextEncoder().encode(localCoverSvg(opts.title, opts.category, opts.slug));
  }

  const ext =
    mime.includes("svg") ? "svg"
    : mime.includes("jpeg") || mime.includes("jpg") ? "jpg"
    : mime.includes("webp") ? "webp"
    : "png";
  const path = `${opts.slug}-${Date.now()}.${ext}`;

  const { error } = await supabaseAdmin.storage
    .from(INSIGHT_IMAGE_BUCKET)
    .upload(path, bytes, { contentType: mime, upsert: true });

  if (error) {
    console.warn("[insight-image] upload failed", error.message);
    return null;
  }

  return `/api/public/insight-image/${path}`;
}

