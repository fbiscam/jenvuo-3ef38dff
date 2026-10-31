import * as React from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";

const AURORA_BG = ["var(--platform-aurora-1)", "var(--platform-aurora-2)", "var(--platform-aurora-3)"];

/** Ticks while playing; drives the live feature "videos". */
function useTick(playing: boolean, ms = 450) {
  const [t, setT] = React.useState(0);
  React.useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setT((v) => v + 1), ms);
    return () => window.clearInterval(id);
  }, [playing, ms]);
  return t;
}

/* Deterministic candle path so the scene loops cleanly. */
const BASE = [60, 56, 58, 52, 50, 54, 48, 44, 46, 40, 42, 36, 38, 34];
function candleAt(i: number) {
  const o = BASE[i % BASE.length];
  const c = BASE[(i + 1) % BASE.length];
  return { o, c, h: Math.min(o, c) - 4 - (i % 3) * 2, l: Math.max(o, c) + 4 + (i % 2) * 3 };
}

function SceneCandles({ t }: { t: number }) {
  const shown = (t % 16) + 2;
  const live = Math.sin(t * 1.7) * 3;
  return (
    <svg viewBox="0 0 240 110" className="h-full w-full" aria-hidden="true">
      <line x1="0" x2="240" y1="30" y2="30" strokeDasharray="3 3" className="stroke-gc-blue" strokeWidth="0.6" />
      <text x="4" y="26" className="fill-gc-blue text-[6px]">HH</text>
      {Array.from({ length: Math.min(shown, 14) }).map((_, i) => {
        const k = candleAt(i);
        const isLast = i === Math.min(shown, 14) - 1;
        const c = isLast ? k.c + live : k.c;
        const bull = c < k.o;
        const x = 12 + i * 16;
        return (
          <g key={i} className={bull ? "text-gc-green" : "text-gc-red"}>
            <line x1={x + 4} x2={x + 4} y1={k.h + 20} y2={k.l + 20} stroke="currentColor" strokeWidth="1" />
            <rect x={x} y={Math.min(k.o, c) + 20} width="8" height={Math.max(2, Math.abs(k.o - c))} rx="1" fill="currentColor" />
          </g>
        );
      })}
    </svg>
  );
}

function SceneSweep({ t }: { t: number }) {
  const step = t % 12;
  const pokes = step >= 5;
  const confirmed = step >= 8;
  return (
    <svg viewBox="0 0 240 110" className="h-full w-full" aria-hidden="true">
      <line x1="0" x2="240" y1="40" y2="40" strokeDasharray="4 3" className="stroke-gc-yellow" strokeWidth="0.8" />
      <text x="4" y="36" className="fill-gc-yellow text-[6px]">Prior high · liquidity</text>
      {[70, 62, 66, 58, 55].map((y, i) => (
        <g key={i} className="text-gc-green">
          <line x1={20 + i * 22 + 4} x2={20 + i * 22 + 4} y1={y - 8} y2={y + 14} stroke="currentColor" />
          <rect x={20 + i * 22} y={y - 4} width="9" height="12" rx="1" fill="currentColor" />
        </g>
      ))}
      {pokes && (
        <g className="text-gc-red">
          <line x1="134" x2="134" y1="30" y2="70" stroke="currentColor" />
          <rect x="130" y="50" width="9" height="12" rx="1" fill="currentColor" />
        </g>
      )}
      {confirmed && (
        <>
          <g className="text-gc-red">
            <line x1="156" x2="156" y1="58" y2="86" stroke="currentColor" />
            <rect x="152" y="62" width="9" height="20" rx="1" fill="currentColor" />
          </g>
          <rect x="166" y="22" width="66" height="14" rx="7" className="fill-gc-green" />
          <text x="199" y="31.5" textAnchor="middle" className="fill-gc-on-blue text-[6.5px] font-medium">Sweep ✓ strong</text>
        </>
      )}
    </svg>
  );
}

const AI_Q = "Is Fiber bullish on 2H?";
const AI_A = "Structure is HH/HL with a fresh demand zone + bullish FVG. Wait for a 2H close above 4,180 before buying.";
function SceneAi({ t }: { t: number }) {
  const total = AI_A.length + 18;
  const p = (t * 4) % (total * 1);
  const typed = AI_A.slice(0, Math.max(0, p - 6));
  return (
    <div className="flex h-full flex-col justify-center gap-2 px-6 text-[12px] leading-[1.45]">
      <div className="self-end rounded-2xl rounded-br-sm bg-gc-blue px-3 py-1.5 text-gc-on-blue">{AI_Q}</div>
      <div className="max-w-[88%] self-start rounded-2xl rounded-bl-sm bg-gc-on-blue/95 px-3 py-1.5 text-gc-ink">
        {typed || <span className="text-gc-ink-muted">Jenvu AI is reading the chart…</span>}
        <span className="ml-0.5 inline-block h-3 w-[2px] translate-y-0.5 animate-pulse bg-gc-ink" />
      </div>
    </div>
  );
}

function SceneVolume({ t }: { t: number }) {
  const n = 18;
  return (
    <svg viewBox="0 0 240 110" className="h-full w-full" aria-hidden="true">
      {Array.from({ length: n }).map((_, i) => {
        const seed = (i * 37 + t * 11) % 100;
        const spike = (i + t) % 7 === 0;
        const h = spike ? 70 : 14 + (seed % 30);
        const tone = spike ? "fill-gc-yellow" : seed % 2 ? "fill-gc-green" : "fill-gc-red";
        return <rect key={i} x={8 + i * 13} y={100 - h} width="9" height={h} rx="1" className={`${tone} transition-all duration-300`} />;
      })}
      <line x1="0" x2="240" y1="72" y2="72" className="stroke-gc-blue" strokeWidth="0.8" />
      <text x="234" y="68" textAnchor="end" className="fill-gc-blue text-[6px]">MA 20</text>
    </svg>
  );
}

function SceneBot({ t }: { t: number }) {
  const pct = Math.min(100, (t * 4) % 120);
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <div className="text-[11px] tracking-wide text-gc-on-blue/70">JX BOT · MT5 · EURUSD M15</div>
      <div className="mt-1 text-[22px] font-medium text-gc-green">IP VERIFIED</div>
      <div className="mt-3 h-1.5 w-full max-w-[200px] overflow-hidden rounded-full bg-gc-on-blue/20">
        <div className="h-full rounded-full bg-gc-green transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1.5 text-[11px] text-gc-on-blue/70">{pct >= 100 ? "Daily target reached · paused" : "Daily target progress"}</div>
    </div>
  );
}

type Card = { name: string; text: React.ReactNode; to: string; Scene: React.ComponentType<{ t: number }> };
const CARDS: Card[] = [
  { name: "Live candles", to: "/pricing", Scene: SceneCandles, text: <><b className="font-medium text-gc-ink">Jenvu Terminal</b> streams live Fiber candles with swing labels that stay fixed once</> },
  { name: "Fresh sweep", to: "/help", Scene: SceneSweep, text: <><b className="font-medium text-gc-ink">Fresh sweep</b> spots wicks that take prior highs or lows, then confirms only when price reverses</> },
  { name: "AI desk", to: "/ai-engine", Scene: SceneAi, text: <><b className="font-medium text-gc-ink">Jenvu AI</b> reads the same chart you see and answers exactly the question you asked</> },
  { name: "Volume RVOL", to: "/help", Scene: SceneVolume, text: <><b className="font-medium text-gc-ink">RVOL</b> colours unusual volume spikes and shows an estimated buyer and seller on every candle</> },
  { name: "JX Bot", to: "/pricing", Scene: SceneBot, text: <><b className="font-medium text-gc-ink">JX Bot</b> trades Fiber on MetaTrader 5 and pauses for the day at your daily target</> },
];

function FeatureCard({ card }: { card: Card }) {
  const [playing, setPlaying] = React.useState(true);
  const t = useTick(playing);
  const { Scene } = card;
  return (
    <div className="flex w-full max-w-[412px] shrink-0 snap-center flex-col overflow-hidden rounded-3xl bg-gc-surface sm:w-[85vw] sm:snap-start">
      <div className="flex min-h-[204px] flex-col px-8 pb-8 pt-10">
        <p className="text-[16px] leading-[1.55] text-gc-ink-muted">{card.text}</p>
        <Link to={card.to} className="mt-auto pt-6 text-[16px] font-medium text-gc-blue-deep hover:underline">
          Explore feature
        </Link>
      </div>
      <div className="relative h-[232px] bg-gc-ink" style={{ backgroundImage: AURORA_BG[CARDS.indexOf(card) % 3] }}>
        <div className={`absolute inset-0 transition-opacity ${playing ? "opacity-100" : "opacity-60"}`}>
          <Scene t={t} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-gc-ink/60 via-transparent to-transparent" />
        <button
          type="button"
          aria-label={playing ? `Pause ${card.name}` : `Play ${card.name}`}
          onClick={() => setPlaying((p) => !p)}
          className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-background/95 text-gc-ink shadow transition hover:scale-105"
        >
          {playing ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
        </button>
        <div className="absolute bottom-5 left-7 text-[22px] font-medium leading-[1.2] text-gc-on-blue">
          {card.name}
        </div>
        {playing && (
          <span className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-gc-red px-2 py-0.5 text-[10px] font-medium tracking-wide text-gc-on-blue">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gc-on-blue" /> LIVE
          </span>
        )}
      </div>
    </div>
  );
}

export function CloudFeatureVideos() {
  const railRef = React.useRef<HTMLDivElement>(null);
  const [progress, setProgress] = React.useState(0);
  const onScroll = () => {
    const el = railRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setProgress(max > 0 ? el.scrollLeft / max : 0);
  };
  const scroll = (dir: 1 | -1) => railRef.current?.scrollBy({ left: dir * 440, behavior: "smooth" });
  return (
    <section className="jenvu-videos-zoom bg-background py-16 md:py-20">
      <h2 className="px-5 text-center text-[32px] font-normal leading-[1.2] text-gc-ink sm:text-[44px]">
        <span className="text-gc-green">Live features</span> happen on Jenvu
      </h2>
      <div className="mx-auto mt-10 max-w-[1296px]">
        <div ref={railRef} onScroll={onScroll} className="flex snap-x snap-mandatory gap-7 overflow-x-auto px-5 [scrollbar-width:none] sm:px-8 [&::-webkit-scrollbar]:hidden">
          {CARDS.map((c) => (
            <FeatureCard key={c.name} card={c} />
          ))}
        </div>
        <div className="mt-10 flex items-center gap-6 px-5 sm:px-8">
          <div className="relative h-[3px] flex-1 rounded-full bg-gc-line">
            <div className="absolute top-0 h-full w-1/2 rounded-full bg-gc-ink transition-[left]" style={{ left: `${progress * 50}%` }} />
          </div>
          <div className="inline-flex items-center rounded-full bg-gc-surface p-1">
            <button type="button" aria-label="Previous features" onClick={() => scroll(-1)} className="inline-flex h-10 w-10 items-center justify-center rounded-full text-gc-ink hover:bg-gc-line/60">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button type="button" aria-label="Next features" onClick={() => scroll(1)} className="inline-flex h-10 w-10 items-center justify-center rounded-full text-gc-ink hover:bg-gc-line/60">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
