import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown, ArrowRight } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { NextStep } from "@/components/PageShell";
import { STORIES } from "@/lib/stories";

/**
 * Google Cloud industry-page layout (hero + sticky section bar + solution
 * columns + topic preview + expandable "why" rows + stories + product cards).
 * Shared by the Solutions and Products pages so both stay identical in style.
 */
const SANS = "font-['Google_Sans','Product_Sans','Poppins',system-ui,sans-serif]";

export type IndustryContent = {
  pill: string;
  title: string;
  intro: string;
  heroCaption: string;
  solutionsTitle: string;
  solutionsIntro: string;
  solutions: { title: string; text: string; link: string; href: string }[];
  topicsTitle: string;
  topics: { label: string; title: string; text: string; points: string[]; link: string; href: string }[];
  whyTitle: string;
  why: { title: string; text: string }[];
  whyCardTitle: string;
  whyCardText: string;
  storiesTitle: string;
  storySlugs: string[];
  productsTitle: string;
  products: { title: string; text: string; href: string }[];
};

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "solutions", label: "Solutions" },
  { id: "topics", label: "Topics" },
  { id: "why", label: "Why Jenvu" },
  { id: "stories", label: "Stories" },
  { id: "products", label: "Products" },
];

export function IndustryPage({ c }: { c: IndustryContent }) {
  return (
    <div className={`public-cloudflare jenvu-zoom min-h-dvh w-full bg-background text-gc-ink ${SANS} antialiased`}>
      <SiteHeader />
      <Hero c={c} />
      <SectionBar />
      <Solutions c={c} />
      <Topics c={c} />
      <Why c={c} />
      <Stories c={c} />
      <Products c={c} />
      <NextStep />
      <div className="hide-in-pwa"><SiteFooter /></div>
    </div>
  );
}

function Hero({ c }: { c: IndustryContent }) {
  return (
    <section id="overview" className="scroll-mt-24">
      <div className="mx-auto grid max-w-[1240px] items-center gap-10 px-5 pb-12 pt-10 sm:px-8 md:grid-cols-[1fr_1.05fr] md:pb-16 md:pt-14">
        <div className="ind-rise">
          <span className="inline-flex rounded-full bg-gc-blue-soft px-3 py-1 text-[13px] font-medium text-gc-blue-deep">{c.pill}</span>
          <h1 className="mt-5 text-[34px] font-normal leading-[1.15] tracking-tight sm:text-[44px]">{c.title}</h1>
          <p className="mt-5 max-w-[520px] text-[16px] leading-[1.6] text-gc-ink-muted">{c.intro}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="https://jenvu.com/contact" className="inline-flex h-11 items-center rounded-full bg-gc-blue-deep px-6 text-[14px] font-medium text-gc-on-blue hover:bg-gc-blue">
              Talk to an expert
            </a>
            <a href="https://auth.jenvu.com/sign-in" className="inline-flex h-11 items-center rounded-full border border-gc-line px-6 text-[14px] font-medium text-gc-blue-deep hover:bg-gc-blue-soft">
              Start free
            </a>
          </div>
        </div>
        <DarkCard caption={c.heroCaption} />
      </div>
    </section>
  );
}

function DarkCard({ caption, compact = false }: { caption: string; compact?: boolean }) {
  const candles = [
    [30, 120, 70, 1], [60, 100, 60, 1], [90, 110, 50, 0], [120, 80, 70, 1], [150, 60, 55, 1],
    [180, 75, 45, 0], [210, 50, 60, 1], [240, 40, 50, 1], [270, 55, 40, 0], [300, 30, 55, 1],
  ];
  return (
    <div className={`ind-rise relative overflow-hidden rounded-[28px] bg-gc-night p-6 text-gc-on-night ${compact ? "min-h-[300px]" : "min-h-[340px] md:min-h-[400px]"}`}>
      <div className="flex items-center justify-between text-[12px] text-gc-on-night-muted">
        <span className="flex items-center gap-2"><span className="ind-pulse h-2 w-2 rounded-full bg-gc-green" />XAU/USD · live</span>
        <span>M15</span>
      </div>
      <svg viewBox="0 0 340 200" className="mt-6 h-auto w-full" aria-hidden>
        {[40, 80, 120, 160].map((y) => (
          <line key={y} x1="0" x2="340" y1={y} y2={y} stroke="var(--gc-night-soft)" strokeWidth="1" />
        ))}
        <rect x="180" y="32" width="160" height="36" rx="4" fill="var(--gc-blue)" opacity="0.18" />
        {candles.map(([x, y, h, up], i) => (
          <g key={x} className="ind-candle" style={{ animationDelay: `${i * 0.18}s` }}>
            <line x1={x + 6} x2={x + 6} y1={y - 12} y2={y + h + 12} stroke={up ? "var(--gc-green)" : "var(--gc-red)"} strokeWidth="1.5" />
            <rect x={x} y={y} width="12" height={h} rx="2" fill={up ? "var(--gc-green)" : "var(--gc-red)"} />
          </g>
        ))}
        <polyline className="ind-line" points="10,180 60,160 100,165 140,130 190,115 230,95 270,100 330,70" fill="none" stroke="var(--gc-yellow)" strokeWidth="2" />
      </svg>
      <p className={`mt-6 ${compact ? "text-[18px]" : "text-[20px]"} leading-snug`}>{caption}</p>
    </div>
  );
}

function SectionBar() {
  const [active, setActive] = useState("overview");
  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter((e): e is HTMLElement => !!e);
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (vis) setActive(vis.target.id);
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);
  return (
    <div className="sticky top-16 z-30 px-4 sm:px-6">
      <nav aria-label="Page sections" className="mx-auto flex max-w-[1240px] gap-1 overflow-x-auto rounded-full border border-gc-line bg-background px-2 py-1.5 shadow-sm">
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className={`shrink-0 rounded-full px-4 py-2 text-[14px] transition-colors ${active === s.id ? "bg-gc-blue-soft font-medium text-gc-blue-deep" : "text-gc-ink-muted hover:text-gc-ink"}`}
          >
            {s.label}
          </a>
        ))}
      </nav>
    </div>
  );
}

function SectionHead({ title, intro }: { title: string; intro?: string }) {
  return (
    <div className="max-w-[720px]">
      <h2 className="text-[28px] font-normal leading-tight sm:text-[32px]">{title}</h2>
      {intro && <p className="mt-4 text-[16px] leading-[1.6] text-gc-ink-muted">{intro}</p>}
    </div>
  );
}

function Wrap({ id, children, tint = false }: { id: string; children: ReactNode; tint?: boolean }) {
  return (
    <section id={id} className={`scroll-mt-32 ${tint ? "bg-gc-surface" : ""}`}>
      <div className="mx-auto max-w-[1240px] px-5 py-14 sm:px-8 md:py-20">{children}</div>
    </section>
  );
}

function Solutions({ c }: { c: IndustryContent }) {
  return (
    <Wrap id="solutions">
      <SectionHead title={c.solutionsTitle} intro={c.solutionsIntro} />
      <div className="mt-10 grid gap-8 md:grid-cols-3">
        {c.solutions.map((s) => (
          <div key={s.title} className="border-t-2 border-gc-blue pt-5">
            <h3 className="text-[20px] font-normal">{s.title}</h3>
            <p className="mt-3 text-[15px] leading-[1.6] text-gc-ink-muted">{s.text}</p>
            <a href={s.href} className="mt-4 inline-flex items-center gap-1 text-[14px] font-medium text-gc-blue-deep hover:underline">
              {s.link} <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        ))}
      </div>
    </Wrap>
  );
}

function Topics({ c }: { c: IndustryContent }) {
  const [i, setI] = useState(0);
  const t = c.topics[i];
  return (
    <Wrap id="topics" tint>
      <SectionHead title={c.topicsTitle} />
      <div className="mt-10 grid gap-6 md:grid-cols-[300px_1fr]">
        <ul role="tablist" className="flex gap-2 overflow-x-auto md:flex-col md:overflow-visible">
          {c.topics.map((x, n) => (
            <li key={x.label} className="shrink-0">
              <button
                role="tab"
                aria-selected={n === i}
                onClick={() => setI(n)}
                className={`w-full rounded-xl border-l-4 px-4 py-3 text-left text-[15px] transition-colors ${n === i ? "border-gc-blue bg-background font-medium text-gc-blue-deep shadow-sm" : "border-transparent text-gc-ink-muted hover:bg-background"}`}
              >
                {x.label}
              </button>
            </li>
          ))}
        </ul>
        <div key={t.label} role="tabpanel" className="ind-rise rounded-[24px] border border-gc-line bg-background p-6 sm:p-8">
          <h3 className="text-[24px] font-normal">{t.title}</h3>
          <p className="mt-3 text-[15px] leading-[1.6] text-gc-ink-muted">{t.text}</p>
          <ul className="mt-5 space-y-2">
            {t.points.map((p) => (
              <li key={p} className="flex gap-3 text-[15px] leading-[1.5]">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gc-blue" />
                {p}
              </li>
            ))}
          </ul>
          <a href={t.href} className="mt-6 inline-flex items-center gap-1 text-[14px] font-medium text-gc-blue-deep hover:underline">
            {t.link} <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </Wrap>
  );
}

function Why({ c }: { c: IndustryContent }) {
  const [open, setOpen] = useState(0);
  return (
    <Wrap id="why">
      <div className="grid items-start gap-10 md:grid-cols-[1fr_1fr]">
        <div>
          <SectionHead title={c.whyTitle} />
          <div className="mt-8 divide-y divide-gc-line border-y border-gc-line">
            {c.why.map((w, n) => (
              <div key={w.title}>
                <button
                  aria-expanded={open === n}
                  onClick={() => setOpen(open === n ? -1 : n)}
                  className="flex w-full items-center justify-between gap-4 py-5 text-left text-[18px]"
                >
                  {w.title}
                  <ChevronDown className={`h-5 w-5 shrink-0 text-gc-ink-muted transition-transform ${open === n ? "rotate-180" : ""}`} />
                </button>
                {open === n && <p className="ind-rise pb-5 text-[15px] leading-[1.6] text-gc-ink-muted">{w.text}</p>}
              </div>
            ))}
          </div>
        </div>
        <div>
          <DarkCard compact caption={c.whyCardTitle} />
          <p className="mt-4 text-[14px] leading-[1.6] text-gc-ink-muted">{c.whyCardText}</p>
        </div>
      </div>
    </Wrap>
  );
}

function Stories({ c }: { c: IndustryContent }) {
  const list = c.storySlugs.map((s) => STORIES.find((x) => x.slug === s)).filter((x) => !!x);
  return (
    <Wrap id="stories" tint>
      <SectionHead title={c.storiesTitle} />
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((s) => (
          <a key={s.slug} href={`/stories/${s.slug}`} className="group overflow-hidden rounded-[20px] border border-gc-line bg-background transition-shadow hover:shadow-md">
            <div className="aspect-[16/9] overflow-hidden bg-gc-night">
              <img src={s.img} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
            </div>
            <div className="p-5">
              <p className="text-[12px] font-medium tracking-wide text-gc-ink-muted">{s.tag}</p>
              <h3 className="mt-2 line-clamp-2 text-[18px] font-normal leading-snug">{s.title}</h3>
              <span className="mt-4 inline-flex items-center gap-1 text-[14px] font-medium text-gc-blue-deep">
                Read now <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </a>
        ))}
      </div>
    </Wrap>
  );
}

function Products({ c }: { c: IndustryContent }) {
  const [all, setAll] = useState(false);
  const shown = all ? c.products : c.products.slice(0, 6);
  return (
    <Wrap id="products">
      <SectionHead title={c.productsTitle} />
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((p) => (
          <div key={p.title} className="ind-rise flex flex-col rounded-[20px] border border-gc-line p-6">
            <h3 className="text-[18px] font-medium">{p.title}</h3>
            <p className="mt-2 flex-1 text-[15px] leading-[1.6] text-gc-ink-muted">{p.text}</p>
            <a href={p.href} className="mt-4 inline-flex items-center gap-1 text-[14px] font-medium text-gc-blue-deep hover:underline">
              Learn more <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        ))}
      </div>
      {c.products.length > 6 && (
        <div className="mt-8 flex justify-center">
          <button onClick={() => setAll(!all)} className="inline-flex h-10 items-center rounded-full border border-gc-line px-6 text-[14px] font-medium text-gc-blue-deep hover:bg-gc-blue-soft">
            {all ? "View less" : "View more"}
          </button>
        </div>
      )}
    </Wrap>
  );
}
