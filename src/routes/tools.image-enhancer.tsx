import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ToolsShell, ToolCard } from "@/components/ToolsShell";
import { Download, Loader2 } from "lucide-react";

export const Route = createFileRoute("/tools/image-enhancer")({
  head: () => ({
    meta: [
      { title: "Free Image Enhancer — Upscale & Sharpen Online | Jenvu" },
      {
        name: "description",
        content:
          "Upscale, sharpen, brighten and clean up any image right in your browser. Nothing is uploaded — free and instant download.",
      },
      { property: "og:title", content: "Image Enhancer — Upscale & sharpen instantly" },
      { property: "og:description", content: "Browser-based image upscaling, sharpening and colour clean-up. Free, private, instant." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EnhancerTool,
});

type Settings = { scale: number; sharpen: number; brightness: number; contrast: number; saturation: number };

const DEFAULTS: Settings = { scale: 2, sharpen: 45, brightness: 105, contrast: 108, saturation: 105 };

function EnhancerTool() {
  const [src, setSrc] = useState<string | null>(null);
  const [out, setOut] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [s, setS] = useState<Settings>(DEFAULTS);
  const [split, setSplit] = useState(50);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    setBusy(true);

    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      const canvas = canvasRef.current ?? document.createElement("canvas");
      const w = Math.min(4000, Math.round(img.naturalWidth * s.scale));
      const h = Math.min(4000, Math.round(img.naturalHeight * s.scale));
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.filter = `brightness(${s.brightness}%) contrast(${s.contrast}%) saturate(${s.saturation}%)`;
      ctx.drawImage(img, 0, 0, w, h);

      if (s.sharpen > 0) {
        applySharpen(ctx, w, h, s.sharpen / 100);
      }

      setOut(canvas.toDataURL("image/png"));
      setBusy(false);
    };
    img.onerror = () => setBusy(false);
    img.src = src;

    return () => {
      cancelled = true;
    };
  }, [src, s]);

  function onFile(file: File) {
    if (file.size > 12_000_000) return;
    const reader = new FileReader();
    reader.onload = () => setSrc(String(reader.result));
    reader.readAsDataURL(file);
  }

  return (
    <ToolsShell
      eyebrow="Free tool"
      title="Image Enhancer"
      intro="Upscale, sharpen and colour-correct any image. Everything runs in your browser — your file never leaves your device."
    >
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <ToolCard>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
            }}
            className="block w-full text-[13px] text-zinc-600 file:mr-3 file:rounded-full file:border-0 file:bg-zinc-900 file:px-4 file:py-2 file:text-white"
          />

          <div className="mt-5 space-y-4">
            {([
              ["scale", "Upscale", 1, 4, 0.5, "×"],
              ["sharpen", "Sharpen", 0, 100, 5, "%"],
              ["brightness", "Brightness", 50, 150, 1, "%"],
              ["contrast", "Contrast", 50, 150, 1, "%"],
              ["saturation", "Saturation", 0, 200, 1, "%"],
            ] as const).map(([key, label, min, max, step, unit]) => (
              <div key={key}>
                <div className="mb-1 flex items-center justify-between text-[13px]">
                  <span className="text-zinc-600">{label}</span>
                  <span className="text-zinc-900">{s[key]}{unit}</span>
                </div>
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={s[key]}
                  onChange={(e) => setS((p) => ({ ...p, [key]: Number(e.target.value) }))}
                  className="w-full accent-zinc-900"
                />
              </div>
            ))}
          </div>

          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={() => setS(DEFAULTS)}
              className="flex-1 rounded-xl border border-zinc-200 px-4 py-2.5 text-[14px] hover:bg-zinc-50"
            >
              Reset
            </button>
            <a
              href={out ?? "#"}
              download="jenvu-enhanced.png"
              aria-disabled={!out}
              className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2.5 text-[14px] text-white ${
                out ? "" : "pointer-events-none opacity-50"
              }`}
            >
              <Download className="h-4 w-4" /> Download
            </a>
          </div>
        </ToolCard>

        <ToolCard>
          {!src && <p className="text-[14px] text-zinc-500">Upload an image to begin.</p>}
          {src && (
            <>
              <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50">
                <img src={src} alt="Original" className="block w-full" />
                {out && (
                  <div className="absolute inset-0 overflow-hidden" style={{ width: `${split}%` }}>
                    <img src={out} alt="Enhanced" className="block h-full w-auto max-w-none" style={{ width: `${(100 / split) * 100}%` }} />
                  </div>
                )}
                {busy && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/60">
                    <Loader2 className="h-5 w-5 animate-spin text-zinc-700" />
                  </div>
                )}
              </div>
              <div className="mt-3 flex items-center gap-3 text-[12px] text-zinc-500">
                <span>Enhanced</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={split}
                  onChange={(e) => setSplit(Number(e.target.value))}
                  className="flex-1 accent-zinc-900"
                />
                <span>Original</span>
              </div>
            </>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </ToolCard>
      </div>
    </ToolsShell>
  );
}

function applySharpen(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number) {
  const src = ctx.getImageData(0, 0, w, h);
  const dst = ctx.createImageData(w, h);
  const a = src.data;
  const b = dst.data;
  const k = [0, -amount, 0, -amount, 1 + 4 * amount, -amount, 0, -amount, 0];

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        let ki = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            sum += a[((y + ky) * w + (x + kx)) * 4 + c] * k[ki++];
          }
        }
        b[i + c] = sum < 0 ? 0 : sum > 255 ? 255 : sum;
      }
      b[i + 3] = a[i + 3];
    }
  }
  ctx.putImageData(dst, 0, 0);
}
