import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Activity, ArrowRight, Bot, Braces, CalendarDays, ChartCandlestick, Check, Clock, Code2, FileText, Globe, Layers, LockKeyhole, MessageCircle, Monitor, Search, ShieldCheck, Users, Wallet, Zap } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import ProductPreview, { type ProductId } from "./ProductPreview";
import { PUBLIC_API_MODEL_IDS } from "@/lib/public-api-models";
import { DAILY_DRAWDOWN_PCT, dailyTargetLabel, TARGET_DISCLAIMER } from "@/lib/mt5-licenses";
import JenvuMark from "@/components/JenvuMark";
import { TerminalLogo, JxBotLogo, NewsLogo, PlatformLogo } from "@/components/brand/ProductLogos";

const productMarks = { terminal: TerminalLogo, bot: JxBotLogo, news: NewsLogo, api: PlatformLogo };

const products = [
  { id: "terminal", title: "Terminal", icon: ChartCandlestick, intro: "See the market clearly. Live candles, rule-based analysis and conversational AI on one trading desk.", points: ["Gold, Bitcoin and EUR/USD, with multiple timeframes", "Structure, liquidity sweeps, zones and fair value gaps", "Ask about the chart; get answers grounded in its analysis"], href: "https://dash.jenvu.com/terminal", cta: "Open Terminal" },
  { id: "bot", title: "JX Bot", icon: Bot, intro: "Automated EUR/USD execution on your own MetaTrader 5 account, with checks and safety caps built in.", points: ["EUR/USD M15, with registered-IP verification", `Daily caps: Pro ${dailyTargetLabel('pro')}, Elite ${dailyTargetLabel('elite')}, Ultra ${dailyTargetLabel('ultra')}`, `${DAILY_DRAWDOWN_PCT}% daily drawdown guard; 2–4 IPs by plan; included in every paid plan`], href: "https://jenvu.com/jx-bot", cta: "Explore JX Bot" },
  { id: "news", title: "News Trading", icon: CalendarDays, intro: "Know what is coming before the headline. US economic releases and historical Gold reaction context in one place.", points: ["Countdown to the next US high-impact release", "Actual, forecast and previous numbers, with beat-or-miss context", "Free on every plan; past reactions never guarantee the next move"], href: "https://dash.jenvu.com/news", cta: "Open News Trading" },
  { id: "api", title: "Platform & API", icon: Braces, intro: "Build with the models you need. One API key, a familiar request format and usage you can follow.", points: [`${PUBLIC_API_MODEL_IDS.length} models, including Claude, Gemini, OpenAI and DeepSeek`, "OpenAI-compatible requests and streaming responses", "Manage keys, tokens and monthly credit in your dashboard"], href: "https://jenvu.com/platform", cta: "Explore the API" },
] satisfies { id: ProductId; title: string; icon: typeof Bot; intro: string; points: string[]; href: string; cta: string }[];

const features = [
  [Activity,"Live market charts","Follow Gold, Bitcoin and EUR/USD candles."], [Layers,"Rule-based analysis","Seven engines with fixed, repeatable rules."], [Search,"Liquidity sweeps","Confirmed reclaims on closed candles."],
  [ChartCandlestick,"Structure and zones","BOS, CHoCH, demand, supply and FVGs."], [MessageCircle,"Conversational AI","Ask about the market in plain language."], [ShieldCheck,"Daily safety caps","Plan targets and the JX Bot drawdown guard."],
  [Users,"MT5 account management","Track each account's own status and limits."], [CalendarDays,"Economic release context","US events, countdowns and past reactions."], [Braces,"Top model families","Reasoning and coding models behind one API."],
  [Code2,"Streaming responses","Receive model output as it arrives."], [Clock,"Session tools","London and New York windows on the chart."], [Monitor,"Web and desktop","Open the Terminal or download Jenvu."],
  [LockKeyhole,"API key controls","Create, rotate and delete your own keys."], [Wallet,"Usage and credit","Follow token use and spending in your account."], [Globe,"Browser extension","Bring Jenvu into your chart workflow."],
  [FileText,"Guides and documentation","Product walkthroughs and API examples."], [Bot,"Assistant connections","Connect tools to your own account's data."], [Zap,"One workspace","Terminal, bot, news and models together."],
] as const;

export default function ProductsPage() {
  const [active, setActive] = useState<ProductId>("terminal");
  const rows = useRef(new Map<ProductId, HTMLElement>());
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const target = Math.min(window.innerHeight * .3, 280);
      let closest: ProductId = 'terminal';
      let distance = Infinity;
      rows.current.forEach((row, id) => {
        const rect = row.getBoundingClientRect();
        const next = rect.top <= target && rect.bottom > target ? 0 : Math.min(Math.abs(rect.top - target), Math.abs(rect.bottom - target));
        if (next < distance) { distance = next; closest = id; }
      });
      setActive(closest);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(frame); };
  }, []);
  return <div className="products-page min-h-dvh bg-background text-foreground">
    <SiteHeader/>
    <main className="site-edge">
      <section className="products-hero">
        <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground"><JenvuMark className="h-5 w-5"/><span>Jenvu Products</span><span aria-hidden>│</span><span>Web, desktop and MetaTrader 5</span></div>
        <h1>Jenvu products.<br/>One trading workspace.</h1>
        <p>Analyze, automate, follow the news, and build.<br className="hidden sm:block"/> Terminal, JX Bot, News Trading and top AI models — together.</p>
        <div className="products-actions"><Button asChild className="rounded-full" size="lg"><a href="https://dash.jenvu.com/terminal">Try Jenvu Terminal<ArrowRight/></a></Button><Button asChild variant="secondary" size="lg" className="rounded-full"><Link to="/pricing">View pricing</Link></Button></div>
      </section>

      <section className="products-showcase" aria-label="Jenvu products">
        <div className="products-sticky-preview"><ProductPreview/><p className="mt-3 text-center text-xs text-muted-foreground">Illustrative product preview</p></div>
        <div className="products-mobile-tabs" role="tablist" aria-label="Products">{products.map(p => <Button key={p.id} role="tab" aria-selected={active === p.id} variant="ghost" onClick={() => {setActive(p.id); rows.current.get(p.id)?.scrollIntoView({behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block:'start'});}}>{p.title}</Button>)}</div>
        <div className="products-copy-list">{products.map(p => <section key={p.id} data-product={p.id} ref={el => { if(el) rows.current.set(p.id,el); else rows.current.delete(p.id); }} className={`products-copy ${active === p.id ? 'is-active' : ''}`}>
          <h2>{(() => { const Mark = productMarks[p.id]; return <Mark className="size-8 shrink-0"/>; })()}{p.title}</h2><p className="products-intro">{p.intro}</p>
          <ul>{p.points.map(point => <li key={point}><Check size={15}/><span>{point}</span></li>)}</ul>
          {p.id === 'bot' && <p className="mt-5 text-xs leading-relaxed text-muted-foreground">{TARGET_DISCLAIMER}</p>}
          <Button asChild variant="secondary" className="mt-7 rounded-full px-6"><a href={p.href}>{p.cta}<ArrowRight/></a></Button>
        </section>)}</div>
      </section>

      <section className="products-section"><h2>And much more</h2><p className="mt-4 text-base">The tools behind your trading workspace — from market analysis to your next app.</p><div className="products-feature-grid">{features.map(([Icon,title,text]) => <div key={title} className="flex items-start gap-4"><Icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground"/><div><h3 className="text-base font-medium">{title}</h3><p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{text}</p></div></div>)}</div></section>

      <section className="products-section products-start"><h2>Get started</h2><p className="mx-auto mt-4 max-w-xl text-base leading-relaxed">Start on Free. Pick Pro, Elite or Ultra when you need higher limits.</p><div className="products-start-grid">{[['01','Create your account','Sign up with Google or email. Your tools and usage stay together.'],['02','Pick your tools','Open Terminal, set up JX Bot, explore News Trading or create an API key.'],['03','Make it your workspace','Follow your usage, review your analysis and manage your own risk.']].map(([n,title,text]) => <div key={n} className="products-step"><span className="text-sm text-muted-foreground">{n}</span><h3 className="mt-4 text-xl">{title}</h3><p className="mt-3 text-sm leading-relaxed">{text}</p></div>)}</div><div className="products-actions"><Button asChild size="lg" className="rounded-full"><a href="https://auth.jenvu.com/sign-in">Open Jenvu<ArrowRight/></a></Button><Button asChild size="lg" variant="secondary" className="rounded-full"><Link to="/pricing">Compare plans</Link></Button></div></section>

      <section className="products-section products-developer"><div><h2>Building on Jenvu?</h2><p className="mt-4 max-w-xl text-sm leading-relaxed">Access the models in our API with one key. A familiar request format, streaming replies, and clear usage in your dashboard.</p></div><div className="flex flex-wrap gap-3"><Button asChild size="lg" className="rounded-full"><a href="https://dash.jenvu.com/api">Get API key<ArrowRight/></a></Button><Button asChild size="lg" variant="outline" className="rounded-full"><Link to="/docs">Read docs</Link></Button></div></section>
    </main><SiteFooter/>
  </div>;
}