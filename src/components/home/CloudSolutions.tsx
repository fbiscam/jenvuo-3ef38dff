import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Pause, Play } from "lucide-react";
import { SiBinance, SiCoinbase, SiRevolut, SiRobinhood, SiTradingview } from "react-icons/si";
import webullLogo from "@/assets/webull-logo.png.asset.json";
import trading212Logo from "@/assets/trading212-logo.png.asset.json";
import trustWalletLogo from "@/assets/trustwallet-logo.png.asset.json";
import etoroLogo from "@/assets/etoro-logo.png.asset.json";
import metaTraderLogo from "@/assets/metatrader-logo.png.asset.json";
import imgFloor from "@/assets/home/place-floor.jpg";
import imgVault from "@/assets/home/place-vault.jpg";
import imgHome from "@/assets/home/place-home.jpg";
import imgOffice from "@/assets/home/place-office.jpg";
import imgDev from "@/assets/home/place-dev.jpg";
import imgMeeting from "@/assets/home/place-meeting.jpg";
import imgLondon from "@/assets/home/place-london.jpg";
import imgSouk from "@/assets/home/place-souk.jpg";
import imgLibrary from "@/assets/home/place-library.jpg";
import imgSupport from "@/assets/home/place-support.jpg";

type Solution = {
  name: string;
  image: string;
  stat: string;
  statText: string;
  body: string;
  bold: string;
  cta: string;
  to: string;
};

const SOLUTIONS: Solution[] = [
  { name: "Day traders", image: imgFloor, stat: "15M / 1H", statText: "fresh sweeps and swings marked live on gold", body: "Catch liquidity sweeps on fresh highs and lows as candles close.", bold: "See how the Terminal reads intraday structure.", cta: "Explore the Gold Terminal", to: "/pricing" },
  { name: "Swing traders", image: imgVault, stat: "2H / 4H", statText: "supply, demand zones and FVGs kept on chart", body: "Higher-timeframe zones stay drawn until price truly invalidates them.", bold: "Plan swing trades with clear structure.", cta: "Explore zone tools", to: "/help" },
  { name: "New traders", image: imgHome, stat: "$100,000", statText: "demo balance to practice without real money", body: "Practice entries and exits on live gold prices with a demo account.", bold: "Learn safely before you risk capital.", cta: "Explore demo trading", to: "/pricing" },
  { name: "AI-first traders", image: imgOffice, stat: "1 question", statText: "one clear answer from the AI desk, no noise", body: "Ask about the current chart and get a focused, structured reply.", bold: "Read the market with AI next to you.", cta: "Explore the AI desk", to: "/ai-engine" },
  { name: "Developers", image: imgDev, stat: "$3 / 1M", statText: "tokens for top-tier models through API keys", body: "Plug Jenvu models into your own apps, bots and trading tools.", bold: "Build with our API and extension.", cta: "Explore developer tools", to: "/help" },
  { name: "Founding members", image: imgMeeting, stat: "2 days", statText: "to verify your ID after your plan is approved", body: "Approved Founding members get their chosen plan straight away.", bold: "Apply to the invite-only program.", cta: "Explore the Founding Program", to: "/founding" },
  { name: "Session traders", image: imgLondon, stat: "London / NY", statText: "killzone sessions tracked on the gold chart", body: "Know when London and New York liquidity is most active on gold.", bold: "Time your entries around the sessions.", cta: "Explore session tools", to: "/help" },
  { name: "Gold investors", image: imgSouk, stat: "XAU/USD", statText: "one market, analysed in full depth every day", body: "Follow gold with daily insights, macro drivers and clear structure.", bold: "Stay close to the gold market.", cta: "Explore gold insights", to: "/insights" },
  { name: "Students", image: imgLibrary, stat: "Free guides", statText: "on sweeps, zones and FVGs for every level", body: "Learn ICT and SMC ideas step by step with real gold examples.", bold: "Build your trading knowledge.", cta: "Explore learning resources", to: "/insights" },
  { name: "Support & help", image: imgSupport, stat: "Help centre", statText: "answers on plans, billing and the Terminal", body: "Find quick answers or contact our team about your account.", bold: "Get help when you need it.", cta: "Visit the help centre", to: "/help" },
];

export function CloudSolutions() {
  const [active, setActive] = React.useState(0);
  const s = SOLUTIONS[active];
  return (
    <section className="jenvu-solutions-zoom bg-background py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-8 md:grid-cols-2 md:items-start">
          <h2 className="text-3xl font-normal leading-tight text-gc-ink md:text-4xl">
            Solve your trading problems with <span className="text-gc-yellow">gold solutions</span>
          </h2>
          <div>
            <p className="text-gc-ink-muted">
              From spotting <Link to="/help" className="text-gc-blue-deep underline">liquidity sweeps</Link> to managing{" "}
              <Link to="/help" className="text-gc-blue-deep underline">trade risk</Link>, Jenvu tools fit the way you trade gold.
            </p>
            <Link to="/auth" className="mt-5 inline-flex rounded-full bg-gc-blue-deep px-5 py-2.5 text-sm font-medium text-gc-on-blue hover:bg-gc-navy">
              Start for free
            </Link>
          </div>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-[300px_1fr]">
          <ul className="flex gap-1 overflow-x-auto md:flex-col">
            {SOLUTIONS.map((x, i) => (
              <li key={x.name}>
                <button
                  type="button"
                  onClick={() => setActive(i)}
                  className={`w-full whitespace-nowrap rounded-full px-4 py-2 text-left text-sm transition-colors ${
                    i === active ? "bg-gc-blue-soft font-medium text-gc-navy" : "text-gc-ink-muted hover:bg-gc-surface"
                  }`}
                >
                  {x.name}
                </button>
              </li>
            ))}
          </ul>

          <div className="rounded-xl border border-gc-line p-3">
            <img src={s.image} alt={s.name} loading="lazy" width={1280} height={640} className="h-56 w-full rounded-lg object-cover md:h-64" />
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg bg-gc-ink p-5 text-gc-on-blue">
                <div className="text-4xl font-medium">{s.stat}</div>
                <p className="mt-2 font-medium">{s.statText}</p>
              </div>
              <div className="rounded-lg bg-gc-surface p-5 text-sm text-gc-ink">
                {s.body} <strong>{s.bold}</strong>
              </div>
            </div>
            <div className="py-4 text-center">
              <Link to={s.to} className="text-sm text-gc-blue-deep hover:text-gc-navy">{s.cta}</Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

type Brand = { name: string; icon?: React.ComponentType<{ className?: string }>; logo?: string };
const BRANDS: Brand[] = [
  { name: "TradingView", icon: SiTradingview },
  { name: "Binance", icon: SiBinance },
  { name: "MetaTrader", logo: metaTraderLogo.url },
  { name: "Coinbase", icon: SiCoinbase },
  { name: "eToro", logo: etoroLogo.url },
  { name: "Robinhood", icon: SiRobinhood },
  { name: "Webull", logo: webullLogo.url },
  { name: "Revolut", icon: SiRevolut },
  { name: "Trading 212", logo: trading212Logo.url },
  { name: "Trust Wallet", logo: trustWalletLogo.url },
];

export function CloudLogoStrip() {
  const [playing, setPlaying] = React.useState(true);
  const row = [...BRANDS, ...BRANDS];
  return (
    <section className="jenvu-logos-zoom bg-background pb-20">
      <div className="relative mx-auto max-w-6xl overflow-hidden px-6">
        <div
          className="flex w-max items-center gap-16 py-8"
          style={{ animation: "gc-marquee 40s linear infinite", animationPlayState: playing ? "running" : "paused" }}
        >
          {row.map((b, i) => (
            <div key={i} className="flex h-12 items-center gap-2 text-gc-ink" aria-hidden={i >= BRANDS.length}>
              {b.icon ? <b.icon className="h-8 w-8" /> : <img src={b.logo} alt="" className="h-8 w-8 object-contain" />}
              <span className="text-lg font-semibold">{b.name}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-center">
          <Link to="/about" className="rounded-full bg-gc-blue-deep px-5 py-2.5 text-sm font-medium text-gc-on-blue hover:bg-gc-navy">
            See more about Jenvu
          </Link>
        </div>
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? "Pause logos" : "Play logos"}
          className="absolute bottom-0 right-6 flex h-9 w-9 items-center justify-center rounded-full border border-gc-line text-gc-ink hover:bg-gc-surface"
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
      </div>
    </section>
  );
}
