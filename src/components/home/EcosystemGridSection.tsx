import { Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { SiBinance, SiTradingview } from "react-icons/si";
import pythonLogo from "@/assets/platform-logos/python.svg";
import metaTraderLogo from "@/assets/metatrader5-logo.png.asset.json";
import openAiLogo from "@/assets/model-logos/openai.svg";
import claudeLogo from "@/assets/model-logos/claude-color.svg";
import geminiLogo from "@/assets/model-logos/gemini-color.svg";
import deepseekLogo from "@/assets/model-logos/deepseek-color.svg";
import grokLogo from "@/assets/model-logos/grok.svg";
import mistralLogo from "@/assets/model-logos/mistral-color.svg";
import qwenLogo from "@/assets/model-logos/qwen-color.svg";
import metaLogo from "@/assets/model-logos/meta-color.svg";

/*
 * Homepage logo grid (replaces the "Designed to make your trading smarter" cards).
 * Only platforms and model families Jenvu really works with: no customer claims,
 * no invented user counts.
 */
type Tile = {
  name: string;
  icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  /** Official brand color for icon-font logos (omit for black/white brands). */
  color?: string;
  logo?: string;
  /** Mono black logos need inverting on the dark theme. */
  mono?: boolean;
  to?: "/jx-bot" | "/models" | "/docs" | "/insights";
};

const TILES: Tile[] = [
  { name: "MetaTrader 5", logo: metaTraderLogo.url, to: "/jx-bot" },
  { name: "TradingView", icon: SiTradingview },
  { name: "OpenAI", logo: openAiLogo, mono: true, to: "/models" },
  { name: "Claude", logo: claudeLogo },
  { name: "Binance", icon: SiBinance, color: "#F0B90B" },
  { name: "Gemini", logo: geminiLogo, to: "/models" },
  { name: "Grok", logo: grokLogo, mono: true, to: "/models" },
  { name: "DeepSeek", logo: deepseekLogo },
  { name: "Python", logo: pythonLogo, to: "/docs" },
  { name: "Mistral", logo: mistralLogo },
  { name: "Qwen", logo: qwenLogo, to: "/models" },
  { name: "Meta Llama", logo: metaLogo },
];

function TileBody({ t }: { t: Tile }) {
  return (
    <>
      {t.to && (
        <ArrowRight
          className="absolute right-5 top-5 h-4 w-4 text-muted-foreground transition-transform group-hover:-rotate-45"
          aria-hidden
        />
      )}
      <span className="flex items-center gap-2 text-foreground">
        {t.icon ? (
          <t.icon className="h-6 w-6" style={t.color ? { color: t.color } : undefined} />
        ) : (
          <img
            src={t.logo}
            alt=""
            width={24}
            height={24}
            loading="lazy"
            decoding="async"
            className={`h-6 w-6 object-contain ${t.mono ? "dark:invert" : ""}`}
          />
        )}
        <span className="whitespace-nowrap text-[17px] font-semibold tracking-tight">{t.name}</span>
      </span>
    </>
  );
}

export function EcosystemGridSection() {
  return (
    <section className="px-5 py-20">
      <div className="mx-auto max-w-7xl">
        <h2 className="max-w-2xl text-3xl font-medium leading-tight tracking-tight text-foreground sm:text-[40px]">
          Join the traders and developers building on top of the Forax market.
        </h2>
        <Link
          to="/stories"
          className="mt-8 inline-flex items-center gap-1.5 rounded-full bg-gc-pill px-6 py-3 text-[15px] font-medium text-foreground transition hover:brightness-95"
        >
          Read our stories <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>

        <div className="mt-14 grid grid-cols-2 border-l border-t border-border sm:grid-cols-3 lg:grid-cols-6">
          {TILES.map((t) => {
            const cls =
              "group relative flex h-28 items-center justify-center border-b border-r border-border px-4 transition-colors";
            return t.to ? (
              <Link key={t.name} to={t.to} aria-label={t.name} className={`${cls} hover:bg-muted/60`}>
                <TileBody t={t} />
              </Link>
            ) : (
              <div key={t.name} className={cls}>
                <TileBody t={t} />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
