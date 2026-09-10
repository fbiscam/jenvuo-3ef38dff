import * as React from "react";
import { Globe, MapPin, Scan } from "lucide-react";

/**
 * Cloudflare-style "Region: Earth" section with an animated dotted globe.
 * Pure canvas + SVG overlay, no extra dependencies.
 */

const DOT_COUNT = 1600;

type Point = { x: number; y: number; z: number };

function fibonacciSphere(n: number): Point[] {
  const pts: Point[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    pts.push({ x: Math.cos(theta) * r, y, z: Math.sin(theta) * r });
  }
  return pts;
}

function DottedGlobe() {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const points = fibonacciSphere(DOT_COUNT);
    let raf = 0;
    let angle = 0;
    let running = true;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      const cx = w / 2;
      const cy = h / 2;
      const radius = Math.min(w, h) / 2 - 6;

      ctx.clearRect(0, 0, w, h);

      // graticule (latitude / longitude grid)
      ctx.strokeStyle = "rgba(161,161,170,0.22)";
      ctx.lineWidth = 0.6;
      for (let i = 1; i < 6; i++) {
        const lat = (i / 6) * Math.PI - Math.PI / 2;
        const ry = radius * Math.cos(lat);
        ctx.beginPath();
        ctx.ellipse(cx, cy + radius * Math.sin(lat), ry, ry * 0.16, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      for (let i = 0; i < 6; i++) {
        const rot = angle * 0.5 + (i / 6) * Math.PI;
        const rx = Math.abs(radius * Math.cos(rot));
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, radius, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();

      // rotating dot field
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      for (const p of points) {
        const x = p.x * cos - p.z * sin;
        const z = p.x * sin + p.z * cos;
        if (z < 0) continue; // back hemisphere hidden
        const px = cx + x * radius;
        const py = cy - p.y * radius;
        const depth = 0.25 + z * 0.75;
        const size = 0.7 + depth * 0.9;
        ctx.beginPath();
        const accent = getComputedStyle(document.documentElement)
          .getPropertyValue("--home-accent-canvas")
          .trim() || "rgb(37 99 235)";
        ctx.globalAlpha = 0.12 + depth * 0.55;
        ctx.fillStyle = accent;
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      if (!reduce) angle += 0.0022;
      if (running) raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="h-full w-full" aria-hidden="true" />;
}

function Callout({
  className,
  title,
  body,
}: {
  className: string;
  title?: string;
  body: string;
}) {
  return (
    <div
      className={`absolute hidden w-[190px] border border-dashed border-home-accent bg-background/95 px-3 py-2 shadow-sm backdrop-blur-sm md:block ${className}`}
    >
      {title ? (
        <div className="text-[13px] font-semibold text-foreground">{title}</div>
      ) : null}
      <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{body}</p>
    </div>
  );
}

export default function RegionEarth() {
  return (
    <div className="region-earth relative mx-auto max-w-[900px] overflow-hidden border-x border-border bg-background px-0 pt-14 sm:pt-16">
      <div className="relative z-10 px-5 sm:px-8">
        <h2 className="text-center text-3xl font-semibold text-foreground sm:text-[38px] sm:leading-[1.15]">
          Region: Earth
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-[14px] leading-relaxed text-muted-foreground">
          One voice-native gold desk — running close to every session, close to
          the tape.
        </p>
      </div>


      {/* Globe stage */}
      <div className="relative z-10 mx-auto mt-4 h-[330px] w-full max-w-[620px] sm:mt-5 sm:h-[370px]">
        <div className="absolute left-1/2 top-0 h-[330px] w-[330px] -translate-x-1/2 sm:h-[370px] sm:w-[370px]">
          <DottedGlobe />
        </div>

        {/* connection nodes + arcs */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 620 370"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          <path
            d="M260 118 C 330 80, 395 103, 415 145"
            fill="none"
            stroke="var(--home-accent)"
            strokeWidth="1.2"
            strokeDasharray="240"
            className="ge-arc"
          />
          <path
            d="M415 145 C 438 195, 398 230, 365 236"
            fill="none"
            stroke="var(--home-accent)"
            strokeWidth="1.2"
            strokeDasharray="200"
            className="ge-arc ge-arc-2"
          />
        </svg>

        <Node className="left-[42%] top-[29%]" icon={<MapPin className="h-4 w-4" />} />
        <Node
          className="left-[67%] top-[39%]"
          icon={<Globe className="h-4 w-4" />}
          solid
        />
        <Node className="left-[59%] top-[61%]" icon={<MapPin className="h-4 w-4" />} />

        <Callout
          className="left-0 top-[44%]"
          title="4.5x faster"
          body="Setups narrated in seconds — the desk reasons next to the tape, not after it."
        />
        <Callout
          className="right-0 top-[39%]"
          body="Every London, New York and Asia killzone is covered without a single missed sweep."
        />
      </div>

      {/* bottom feature strip */}
      <div className="relative z-10 grid divide-y divide-border border-y border-border bg-background md:grid-cols-3 md:divide-x md:divide-y-0">
        {[
          {
            icon: <Globe className="h-5 w-5" />,
            t: "Runs everywhere",
            d: "Voice, charts and news in one loop — on desktop, tablet and the extension.",
          },
          {
            icon: <MapPin className="h-5 w-5" />,
            t: "Close to the session",
            d: "Tuned to XAU/USD across every killzone so structure is read as it forms.",
          },
          {
            icon: <Scan className="h-5 w-5" />,
            t: "Scales with you",
            d: "A+ confluence grading only. No noise, no guessing, no capacity planning.",
          },
        ].map((f) => (
          <div key={f.t} className="min-h-[145px] px-6 py-6 md:px-7">
            <div className="text-foreground">{f.icon}</div>
            <h3 className="mt-3 text-[14px] font-semibold text-foreground">{f.t}</h3>
            <p className="mt-1 text-[12px] leading-[1.45] text-muted-foreground">{f.d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Node({
  className,
  icon,
  solid,
}: {
  className: string;
  icon: React.ReactNode;
  solid?: boolean;
}) {
  return (
    <div className={`absolute ${className} -translate-x-1/2 -translate-y-1/2`}>
      <span className="ge-ping absolute inset-0 rounded-full bg-home-accent/25" />
      <span
        className={`relative flex h-9 w-9 items-center justify-center rounded-full border ${
          solid
            ? "border-home-accent bg-home-accent text-home-accent-foreground"
            : "border-home-accent/70 bg-background text-home-accent"
        }`}
      >
        {icon}
      </span>
    </div>
  );
}
