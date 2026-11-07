import JenvuMark from "@/components/JenvuMark";

// Artwork for blog cards (theme independent, like printed covers): a bright
// half with two pill shapes and a dark half carrying a short label, or an
// all-black Jenvu card. The same title always gets the same look.

const PAIRS: { bright: string; dark: string }[] = [
  { bright: "#ff2fa8", dark: "#4f1036" },
  { bright: "#ff6a00", dark: "#4a2000" },
  { bright: "#00c46a", dark: "#003d22" },
  { bright: "#2f6bff", dark: "#0b1d4d" },
  { bright: "#d4a017", dark: "#3a2a04" },
  { bright: "#8b5cf6", dark: "#2a1252" },
];

function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Short 2–4 word label for the dark half of a card. */
function shortLabel(title: string, category: string | null): string {
  const cat = (category || "").trim();
  if (cat) return `Jenvu ${cat}`;
  return title.split(/\s+/).slice(0, 3).join(" ");
}

export function BlogTile({ title, category, className = "" }: { title: string; category: string | null; className?: string }) {
  const h = hash(title);
  const label = shortLabel(title, category);
  if (h % 5 === 0) {
    return (
      <div className={`flex items-center justify-center gap-4 overflow-hidden rounded-xl ${className}`} style={{ background: "#000", color: "#fff" }}>
        <JenvuMark className="h-9 w-9" />
        <div className="text-[13px] leading-[1.25]">
          Jenvu
          <br />
          {category || "Insights"}
        </div>
      </div>
    );
  }
  const pair = PAIRS[h % PAIRS.length];
  const tilt = h % 2 === 0 ? 0 : 28;
  return (
    <div className={`grid grid-cols-[42%_58%] overflow-hidden rounded-xl ${className}`}>
      <div className="relative flex items-center justify-center gap-[10%]" style={{ background: pair.bright }}>
        {[0, 1].map((i) => (
          <span
            key={i}
            className="block h-[46%] w-[15%] rounded-full"
            style={{ background: "#fff", transform: `rotate(${tilt}deg)` }}
          />
        ))}
      </div>
      <div className="flex items-center px-[9%]" style={{ background: pair.dark, color: "#fff" }}>
        <span className="line-clamp-3 text-[15px] leading-[1.2] sm:text-[17px]">{label}</span>
      </div>
    </div>
  );
}

/** Large dark cover with soft colour glows and the article title, for the top story. */
export function BlogHeroArt({ title, className = "" }: { title: string; className?: string }) {
  const h = hash(title);
  const a = PAIRS[h % PAIRS.length];
  const b = PAIRS[(h >> 3) % PAIRS.length];
  const short = title.length > 46 ? `${title.slice(0, 44).replace(/\s+\S*$/, "")}…` : title;
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden rounded-2xl ${className}`}
      style={{
        background: `radial-gradient(60% 70% at 25% 15%, ${a.bright}cc 0%, transparent 60%), radial-gradient(55% 65% at 85% 20%, ${b.bright}aa 0%, transparent 60%), radial-gradient(80% 80% at 60% 100%, ${a.dark} 0%, transparent 70%), #0b0b0f`,
        color: "#fff",
      }}
    >
      <span className="relative px-[8%] text-center text-[28px] font-medium leading-[1.1] tracking-[-0.5px] sm:text-[44px] lg:text-[52px]">
        {short}
      </span>
    </div>
  );
}
