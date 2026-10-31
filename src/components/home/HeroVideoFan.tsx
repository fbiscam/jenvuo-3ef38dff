import * as React from "react";
import img1 from "@/assets/home/hero-ai-1.jpg";
import img2 from "@/assets/home/hero-ai-2.jpg";
import img3 from "@/assets/home/hero-ai-3.jpg";
import img4 from "@/assets/home/hero-ai-4.jpg";
import img5 from "@/assets/home/hero-ai-5.jpg";
import vid1 from "@/assets/home/hero-ai-1.mp4.asset.json";
import vid2 from "@/assets/home/hero-ai-2.mp4.asset.json";
import vid3 from "@/assets/home/hero-ai-3.mp4.asset.json";
import vid4 from "@/assets/home/hero-ai-4.mp4.asset.json";
import vid5 from "@/assets/home/hero-ai-5.mp4.asset.json";

type FanCard = { label: string; poster: string; video: string; rot: number; y: number; main?: boolean };

/* Five fanned video cards (OpenAI Business hero style). Videos are AI-generated loops. */
const CARDS: FanCard[] = [
  { label: "Ask Jenvu", poster: img1, video: vid1.url, rot: -6, y: 28 },
  { label: "Fiber Terminal", poster: img2, video: vid2.url, rot: -3, y: 44 },
  { label: "Jenvu AI", poster: img3, video: vid3.url, rot: 0, y: 0, main: true },
  { label: "Alerts", poster: img4, video: vid4.url, rot: 3, y: 44 },
  { label: "JX Bot", poster: img5, video: vid5.url, rot: 6, y: 28 },
];

function FanVideo({ card }: { card: FanCard }) {
  const ref = React.useRef<HTMLVideoElement>(null);
  // Respect reduced-motion: keep the thumbnail still.
  React.useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    v.play().catch(() => {});
  }, []);
  return (
    <video
      ref={ref}
      src={card.video}
      poster={card.poster}
      muted
      loop
      playsInline
      preload={card.main ? "auto" : "metadata"}
      aria-label={card.label}
      className="h-full w-full object-cover"
    />
  );
}

export function HeroVideoFan() {
  return (
    <div className="relative mx-auto mt-14 flex h-[260px] max-w-[1700px] items-start justify-center overflow-hidden sm:mt-20 sm:h-[340px] md:h-[400px] lg:h-[440px]">
      {CARDS.map((c, i) => (
        <div
          key={c.label}
          className={`relative -mx-5 shrink-0 overflow-hidden rounded-[22px] border-[5px] border-background bg-gc-ink shadow-2xl sm:-mx-4 ${
            c.main
              ? "z-10 h-[290px] w-[320px] sm:h-[380px] sm:w-[480px] md:h-[440px] md:w-[560px] lg:w-[620px]"
              : "h-[250px] w-[200px] sm:h-[330px] sm:w-[260px] md:h-[390px] md:w-[320px] lg:w-[360px]"
          } ${i === 0 || i === 4 ? "hidden md:block" : i === 1 || i === 3 ? "hidden sm:block" : ""}`}
          style={{ transform: `rotate(${c.rot}deg) translateY(${c.y}px)` }}
        >
          <div className="jenvu-rise h-full w-full" style={{ animationDelay: `${120 + i * 70}ms` }}>
            <FanVideo card={c} />
          </div>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-gc-ink/70 via-gc-ink/10 to-transparent" />
          <span
            className={`pointer-events-none absolute inset-x-0 text-center font-semibold tracking-tight text-gc-on-blue ${
              c.main ? "bottom-[38%] text-[30px] sm:text-[40px]" : "bottom-[42%] text-[22px] sm:text-[26px]"
            }`}
          >
            {c.label}
          </span>
        </div>
      ))}
    </div>
  );
}
