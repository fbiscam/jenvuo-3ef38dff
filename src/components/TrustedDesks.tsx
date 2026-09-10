import * as React from "react";
import { Pause, Play, Quote } from "lucide-react";
import type { IconType } from "react-icons";
import {
  SiBinance,
  SiCoinbase,
  SiRevolut,
  SiRobinhood,
  SiTradingview,
} from "react-icons/si";
import face1 from "@/assets/review-user-1.jpg";
import face2 from "@/assets/review-user-2.jpg";
import face3 from "@/assets/review-user-3.jpg";
import face4 from "@/assets/review-user-4.jpg";
import face5 from "@/assets/review-user-5.jpg";
import face6 from "@/assets/review-user-6.jpg";
import webullLogo from "@/assets/webull-logo.png.asset.json";
import trading212Logo from "@/assets/trading212-logo.png.asset.json";
import trustWalletLogo from "@/assets/trustwallet-logo.png.asset.json";
import etoroLogo from "@/assets/etoro-logo.png.asset.json";
import metaTraderLogo from "@/assets/metatrader-logo.png.asset.json";

type Desk = {
  id: string;
  name: string;
  icon?: IconType;
  logo?: string;
  brandClass: string;
  avatar: string;
  quote: string;
  author: string;
  role: string;
  performance: number[];
};

const DESKS: Desk[] = [
  {
    id: "tradingview",
    name: "TradingView",
    icon: SiTradingview,
    brandClass: "td-brand-tradingview",
    avatar: face1,
    quote:
      "JENVU reads structure out loud faster than our analysts can mark it. Liquidity sweeps, CHoCH, displacement — narrated before the candle closes.",
    author: "Daniel Reyes",
    role: "Head of Desk, TradingView",
    performance: [18, 22, 21, 29, 34, 38, 45, 49, 57, 63, 72, 81],
  },
  {
    id: "binance",
    name: "Binance",
    icon: SiBinance,
    brandClass: "td-brand-binance",
    avatar: face2,
    quote:
      "We stopped chasing setups. The A+ confluence grading filters everything down to trades we'd actually take, with entry, stop and target already framed.",
    author: "Aisha Karim",
    role: "Markets Analyst, Binance",
    performance: [16, 20, 26, 24, 31, 39, 43, 51, 58, 66, 70, 78],
  },
  {
    id: "webull",
    name: "Webull",
    logo: webullLogo.url,
    brandClass: "td-brand-webull",
    avatar: face3,
    quote:
      "London and New York killzones are covered without a single missed sweep. It's like having a senior gold analyst on the mic all session.",
    author: "Marcus Feld",
    role: "Senior Trader, Webull",
    performance: [21, 25, 23, 30, 36, 41, 48, 55, 53, 64, 73, 84],
  },
  {
    id: "trading212",
    name: "Trading 212",
    logo: trading212Logo.url,
    brandClass: "td-brand-trading212",
    avatar: face4,
    quote:
      "Onboarding new traders used to take months. JENVU explains the reasoning behind every ICT call, so they learn while they trade.",
    author: "Ivy Chen",
    role: "Risk Lead, Trading 212",
    performance: [15, 19, 27, 31, 29, 38, 44, 50, 59, 65, 76, 82],
  },
  {
    id: "trustwallet",
    name: "Trust Wallet",
    logo: trustWalletLogo.url,
    brandClass: "td-brand-trustwallet",
    avatar: face5,
    quote:
      "Red-folder news, DXY and the London fix all land in the same voice loop. Our XAU desk finally works from one narrative.",
    author: "Tomas Weber",
    role: "Market Strategist, Trust Wallet",
    performance: [19, 23, 28, 26, 35, 42, 49, 54, 62, 68, 79, 87],
  },
  {
    id: "coinbase",
    name: "Coinbase",
    icon: SiCoinbase,
    brandClass: "td-brand-coinbase",
    avatar: face6,
    quote:
      "The narrated chart reviews are the killer feature. Highs, lows, mitigations — spoken through, not buried in a dashboard.",
    author: "Sofia Almeida",
    role: "Product Lead, Coinbase",
    performance: [17, 21, 25, 32, 37, 35, 46, 52, 61, 69, 75, 85],
  },
  {
    id: "robinhood",
    name: "Robinhood",
    icon: SiRobinhood,
    brandClass: "td-brand-robinhood",
    avatar: face1,
    quote: "The live narration gives our traders a clean second opinion without breaking focus or changing their chart setup.",
    author: "Liam Carter",
    role: "Trading Lead, Robinhood",
    performance: [20, 24, 29, 27, 34, 40, 47, 56, 63, 71, 77, 88],
  },
  {
    id: "revolut",
    name: "Revolut",
    icon: SiRevolut,
    brandClass: "td-brand-revolut",
    avatar: face2,
    quote: "JENVU turns a crowded gold chart into a clear sequence of structure, liquidity and risk decisions.",
    author: "Maya Foster",
    role: "Markets Product, Revolut",
    performance: [14, 18, 24, 30, 28, 37, 43, 51, 60, 67, 74, 83],
  },
  {
    id: "etoro",
    name: "eToro",
    logo: etoroLogo.url,
    brandClass: "td-brand-etoro",
    avatar: face3,
    quote: "The consistent review format makes every setup easier to compare, explain and share across the desk.",
    author: "Noah Bennett",
    role: "Senior Analyst, eToro",
    performance: [18, 25, 23, 31, 39, 46, 44, 55, 64, 70, 80, 89],
  },
  {
    id: "metatrader",
    name: "MetaTrader 5",
    logo: metaTraderLogo.url,
    brandClass: "td-brand-metatrader",
    avatar: face4,
    quote: "Voice-first analysis keeps attention on execution while the engine tracks the market structure in real time.",
    author: "Elena Rossi",
    role: "Execution Specialist, MetaTrader 5",
    performance: [22, 26, 24, 33, 38, 45, 52, 58, 66, 74, 81, 91],
  },
];

function Mark({ desk, large = false }: { desk: Desk; large?: boolean }) {
  const Icon = desk.icon;
  return (
    <span
      aria-label={`${desk.name} logo`}
      className={`${desk.brandClass} flex shrink-0 items-center justify-center ${large ? "h-14 w-14 text-3xl" : "h-9 w-9 text-xl"}`}
    >
      {Icon ? (
        <Icon aria-hidden="true" />
      ) : desk.logo ? (
        <img
          src={desk.logo}
          alt=""
          loading="lazy"
          className={`${large ? "h-11 w-11" : "h-7 w-7"} object-contain`}
        />
      ) : null}
    </span>
  );
}

function PerformanceChart({ desk }: { desk: Desk }) {
  const width = 460;
  const height = 250;
  const paddingX = 22;
  const paddingY = 24;
  const min = Math.min(...desk.performance) - 6;
  const max = Math.max(...desk.performance) + 5;
  const range = Math.max(1, max - min);
  const points = desk.performance.map((value, index) => {
    const x = paddingX + (index / (desk.performance.length - 1)) * (width - paddingX * 2);
    const y = height - paddingY - ((value - min) / range) * (height - paddingY * 2);
    return { x, y };
  });
  const line = points.map(({ x, y }) => `${x},${y}`).join(" ");
  const area = `${paddingX},${height - paddingY} ${line} ${width - paddingX},${height - paddingY}`;
  const first = desk.performance[0] ?? 0;
  const last = desk.performance.at(-1) ?? first;
  const growth = first > 0 ? Math.round(((last - first) / first) * 100) : 0;
  const lastPoint = points.at(-1);

  return (
    <div className="relative min-h-[330px] overflow-hidden rounded-xl bg-white p-5 text-zinc-900 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase text-zinc-500">12-month performance</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-semibold">+{growth}%</span>
            <span className="text-xs text-emerald-600">Growing</span>
          </div>
        </div>
        <Mark desk={desk} large />
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mt-3 h-[210px] w-full text-home-accent"
        role="img"
        aria-label={`${desk.name} illustrative 12-month growth chart, up ${growth} percent`}
      >
        {[0, 1, 2, 3].map((row) => {
          const y = paddingY + row * ((height - paddingY * 2) / 3);
          return <line key={row} x1={paddingX} x2={width - paddingX} y1={y} y2={y} className="stroke-zinc-200" strokeWidth="1" />;
        })}
        <polygon points={area} fill="currentColor" opacity="0.12" />
        <polyline points={line} fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {lastPoint ? (
          <>
            <circle cx={lastPoint.x} cy={lastPoint.y} r="9" fill="currentColor" opacity="0.2" />
            <circle cx={lastPoint.x} cy={lastPoint.y} r="4" fill="currentColor" />
          </>
        ) : null}
      </svg>

    </div>
  );
}


export default function TrustedDesks() {
  const [active, setActive] = React.useState(0);
  const [playing, setPlaying] = React.useState(true);
  const logoRailRef = React.useRef<HTMLDivElement | null>(null);
  const logoButtonRefs = React.useRef<Array<HTMLButtonElement | null>>([]);

  React.useEffect(() => {
    if (!playing) return;
    const t = window.setInterval(() => setActive((i) => (i + 1) % DESKS.length), 4000);
    return () => clearInterval(t);
  }, [playing]);

  React.useEffect(() => {
    const rail = logoRailRef.current;
    const button = logoButtonRefs.current[active];
    if (!rail || !button || rail.scrollWidth <= rail.clientWidth) return;
    const left = button.offsetLeft - (rail.clientWidth - button.offsetWidth) / 2;
    rail.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [active]);

  const desk = DESKS[active] ?? DESKS[0];

  if (!desk) return null;

  return (
    <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-24">
      <h2 className="mx-auto max-w-3xl text-center text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl md:text-[44px] md:leading-[1.1]">
        JENVU powers desks trading in gold
      </h2>
      <p className="mt-4 text-center text-[15px] leading-relaxed text-zinc-500 sm:text-base">
        Trusted by the traders you trust.
      </p>


      {/* top logo rail — click to switch review */}
      <div className="relative mt-8 overflow-hidden border-y border-zinc-200 bg-white">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-white to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-white to-transparent" />
        <div
          ref={logoRailRef}
          className="td-logo-rail flex snap-x snap-proximity touch-pan-x gap-3 overflow-x-auto px-4 py-4 [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [scroll-padding-inline:1rem] [&::-webkit-scrollbar]:hidden"
        >
          {DESKS.map((d, i) => (
            <button
              key={d.id}
              ref={(node) => { logoButtonRefs.current[i] = node; }}
              type="button"
              onClick={() => setActive(i)}
              className={`flex shrink-0 snap-center items-center gap-3 rounded-lg border px-4 py-3 text-sm font-semibold transition-colors ${
                i === active
                  ? "border-zinc-300 bg-white text-zinc-900 shadow-[0_1px_4px_rgba(24,24,27,0.08)]"
                  : "border-transparent text-zinc-500 hover:text-zinc-800"
              }`}
            >
              <Mark desk={d} />
              {d.name}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? "Pause reviews" : "Play reviews"}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 hover:text-zinc-900"
        >
          {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </button>
        <div className="flex gap-1.5">
          {DESKS.map((d, i) => (
            <button
              key={d.id}
              type="button"
              aria-label={`Show ${d.name} review`}
              onClick={() => setActive(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === active ? "w-6 bg-zinc-800" : "w-1.5 bg-zinc-300"
              }`}
            />
          ))}
        </div>
      </div>

      {/* main review + company performance */}
      <div
        key={desk.id}
        className="animate-fade-in mt-5 grid gap-6 rounded-xl border border-zinc-200 bg-white p-6 sm:p-10 lg:grid-cols-12 lg:items-center"
      >
        <div className="lg:col-span-7">
          <Quote className="h-5 w-5 text-zinc-300" />
          <blockquote className="mt-3 text-lg font-medium leading-snug tracking-tight text-zinc-900 sm:text-2xl">
            {desk.quote}
          </blockquote>
          <div className="mt-6 flex items-center gap-3 text-sm">
            <img
              src={desk.avatar}
              alt={desk.author}
              loading="lazy"
              width={44}
              height={44}
              className="h-11 w-11 rounded-full object-cover ring-1 ring-zinc-200"
            />
            <div className="min-w-0">
              <div className="font-semibold text-zinc-900">{desk.author}</div>
              <div className="flex items-center gap-1.5 text-zinc-500">
                <Mark desk={desk} />
                <span className="truncate">{desk.role}</span>
              </div>
            </div>
          </div>

        </div>
        <div className="lg:col-span-5">
          <PerformanceChart desk={desk} />
        </div>
      </div>

      {/* bottom moving logo slider */}
      <p className="mt-10 text-center text-sm text-zinc-500">And thousands more…</p>
      <div className="relative mt-5 overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-white to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-white to-transparent" />
        <div className="td-marquee flex w-max gap-14 py-3" aria-hidden="true">
          {[...DESKS, ...DESKS].map((company, i) => (
            <span
              key={`${company.id}-${i}`}
              className="flex items-center gap-3 whitespace-nowrap text-lg font-bold tracking-tight text-zinc-700"
            >
              <Mark desk={company} />
              {company.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
