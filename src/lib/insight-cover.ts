// Every article gets its own cover, drawn from its title in the Google Cloud
// blog style (glowing shapes on black, or soft patterns on white). The same
// title always produces the same picture, and no two titles share one.

function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number) {
  let s = seed || 1;
  return () => {
    s = (Math.imul(s ^ (s >>> 15), 1 | s) + 0x6d2b79f5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PALETTES = [
  ["#4285f4", "#34a853", "#fbbc04", "#ea4335"],
  ["#1a73e8", "#8ab4f8", "#c58af9", "#f6aea9"],
  ["#d4a017", "#f6c453", "#4285f4", "#ffffff"],
  ["#00bfa5", "#4285f4", "#a142f4", "#f538a0"],
  ["#fbbc04", "#ff7043", "#4285f4", "#34a853"],
];

const W = 1280;
const H = 720;
const f = (n: number) => n.toFixed(1);

function dots(r: () => number, pal: string[]) {
  // Glowing dot chart (like the AI announcements card)
  const pts: string[] = [];
  const cols = 34;
  let y = H * (0.35 + r() * 0.3);
  for (let i = 0; i < cols; i++) {
    y += (r() - 0.5) * 70;
    y = Math.max(120, Math.min(H - 120, y));
    const x = 80 + (i * (W - 160)) / (cols - 1);
    const c = pal[i % pal.length];
    for (let k = 0; k < 4; k++) {
      pts.push(`<circle cx="${f(x)}" cy="${f(y + k * 26)}" r="${f(5 + r() * 6 - k)}" fill="${c}" opacity="${f(1 - k * 0.22)}" filter="url(#g)"/>`);
    }
  }
  return { bg: "#000", body: pts.join("") };
}

function ribbon(r: () => number, pal: string[]) {
  const lines: string[] = [];
  const a = H * (0.2 + r() * 0.3);
  const b = H * (0.5 + r() * 0.3);
  for (let i = 0; i < 26; i++) {
    const o = i * 7;
    lines.push(`<path d="M-40 ${f(a + o)} C ${f(W * 0.3)} ${f(b - 300 + o)}, ${f(W * 0.6)} ${f(a + 320 + o)}, ${W + 40} ${f(b - o)}" stroke="${pal[i % pal.length]}" stroke-width="2" fill="none" opacity="${f(0.35 + r() * 0.6)}" filter="url(#g)"/>`);
  }
  return { bg: "#000", body: lines.join("") };
}

function star(r: () => number, pal: string[]) {
  const cx = W * (0.3 + r() * 0.4);
  const cy = H * (0.3 + r() * 0.4);
  const rays: string[] = [];
  const n = 10 + Math.floor(r() * 10);
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 + r() * 0.2;
    const len = 160 + r() * 260;
    rays.push(`<line x1="${f(cx)}" y1="${f(cy)}" x2="${f(cx + Math.cos(ang) * len)}" y2="${f(cy + Math.sin(ang) * len)}" stroke="${pal[i % pal.length]}" stroke-width="${f(2 + r() * 3)}" stroke-linecap="round" filter="url(#g)"/>`);
  }
  for (let i = 0; i < 60; i++) {
    rays.push(`<circle cx="${f(r() * W)}" cy="${f(r() * H)}" r="${f(r() * 2 + 0.5)}" fill="#fff" opacity="${f(r() * 0.7)}"/>`);
  }
  rays.push(`<circle cx="${f(cx)}" cy="${f(cy)}" r="26" fill="#fff" filter="url(#g)"/>`);
  return { bg: "#000", body: rays.join("") };
}

function candles(r: () => number, pal: string[]) {
  const out: string[] = [];
  let p = H / 2;
  const n = 26;
  for (let i = 0; i < n; i++) {
    const x = 90 + (i * (W - 180)) / n;
    const o = p;
    p = Math.max(150, Math.min(H - 150, p + (r() - 0.48) * 90));
    const up = p < o;
    const c = up ? pal[1] : pal[0];
    out.push(`<line x1="${f(x + 14)}" x2="${f(x + 14)}" y1="${f(Math.min(o, p) - 20 - r() * 40)}" y2="${f(Math.max(o, p) + 20 + r() * 40)}" stroke="${c}" stroke-width="3"/>`);
    out.push(`<rect x="${f(x)}" y="${f(Math.min(o, p))}" width="28" height="${f(Math.max(8, Math.abs(o - p)))}" rx="4" fill="${c}"/>`);
  }
  for (let i = 0; i < 8; i++) {
    out.push(`<circle cx="${f(r() * W)}" cy="${f(r() * H)}" r="${f(60 + r() * 140)}" fill="${pal[(i + 2) % pal.length]}" opacity="0.08"/>`);
  }
  return { bg: "#f8fafd", body: out.join("") };
}

function tiles(r: () => number, pal: string[]) {
  const out: string[] = [];
  const s = 80;
  for (let x = 0; x < W; x += s) {
    for (let y = 0; y < H; y += s) {
      const v = r();
      const c = pal[Math.floor(r() * pal.length)];
      if (v < 0.3) out.push(`<circle cx="${x + s / 2}" cy="${y + s / 2}" r="${f(s * 0.32)}" fill="${c}" opacity="${f(0.5 + r() * 0.5)}"/>`);
      else if (v < 0.55) out.push(`<path d="M${x} ${y + s} A ${s} ${s} 0 0 1 ${x + s} ${y}" stroke="${c}" stroke-width="10" fill="none"/>`);
      else if (v < 0.7) out.push(`<rect x="${x + 14}" y="${y + 14}" width="${s - 28}" height="${s - 28}" rx="10" fill="${c}" opacity="0.85"/>`);
    }
  }
  return { bg: "#ffffff", body: out.join("") };
}

const STYLES = [dots, ribbon, star, candles, tiles];

export function insightCoverUrl(title: string, category = "", _imageUrl?: string | null): string {
  const seed = hash(`${title}|${category}`);
  const r = rng(seed);
  const style = STYLES[seed % STYLES.length];
  const pal = PALETTES[Math.floor(seed / 7) % PALETTES.length];
  const { bg, body } = style(r, pal);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs><filter id="g" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><rect width="${W}" height="${H}" fill="${bg}"/>${body}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const fallbackInsightCover = insightCoverUrl;
