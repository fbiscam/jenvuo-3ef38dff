import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown, ArrowRight, CandlestickChart, Sparkles, BellRing, Code2 } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { NextStep } from "@/components/PageShell";
import { STORIES } from "@/lib/stories";

/**
 * Google Cloud industry-page building blocks for the Solutions and Products
 * pages. Both share the header, section bar and tokens, but each page uses its
 * own layout variant so the two pages never look the same.
 */
const SANS = "font-['Google_Sans','Product_Sans','Poppins',system-ui,sans-serif]";
/** Page content is rendered 18% smaller than the rest of the site. */
const PAGE_ZOOM = 0.82;

export type IndustryContent = {
  variant: "solutions" | "products";
  pill: string;
  title: string;
  intro: string;
  heroCaption: string;
  heroImg: string;
  solutionsTitle: string;
  solutionsIntro: string;
  solutions: { title: string; text: string; link: string; href: string; img: string }[];
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
  /** Products page only: white "what you get" section with four icon cards. */
  highlightsTitle?: string;
  highlightsIntro?: string;
  highlights?: { title: string; text: string }[];
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
  const p = c.variant === "products";
  return (
    <div className={`public-cloudflare jenvu-zoom min-h-dvh w-full bg-background text-gc-ink ${SANS} antialiased`}>
      <SiteHeader />
      <div style={{ zoom: PAGE_ZOOM }}>
        {p ? <ProductsHero c={c} /> : <SolutionsHero c={c} />}
        <SectionBar hide={p ? ["why", "products", "topics"] : []} />
        {p ? <ProductsZigzag c={c} /> : <SolutionsCards c={c} />}
        {p && <ProductsHighlights c={c} />}
        {!p && <TopicsList c={c} />}
        {!p && <WhyAccordion c={c} />}
        {p ? <StoriesRows c={c} /> : <StoriesCards c={c} />}
        {!p && <Products c={c} />}
        <NextStep />
      </div>
      <div className="hide-in-pwa"><SiteFooter /></div>
    </div>
  );
}

/* ---------- Shared pieces ---------- */

function Buttons({ center = false }: { center?: boolean }) {
  return (
    <div className={`mt-8 flex flex-wrap gap-3 ${center ? "justify-center" : ""}`}>
      <a href="https://jenvu.com/contact" className="inline-flex h-11 items-center rounded-full bg-gc-blue-deep px-6 text-[14px] font-medium text-gc-on-blue hover:bg-gc-blue">
        Talk to an expert
      </a>
      <a href="https://jenvu.com/pricing" className="inline-flex h-11 items-center rounded-full border border-gc-line px-6 text-[14px] font-medium text-gc-blue-deep hover:bg-gc-blue-soft">
        Buy now
      </a>
    </div>
  );
}

/** Dark article-style image card (like the homepage stories) with a caption. */
function ImageCard({ img, caption, tag, className = "", eager = false }: { img: string; caption: string; tag?: string; className?: string; eager?: boolean }) {
  return (
    <div className={`ind-rise group relative overflow-hidden rounded-[28px] bg-gc-night text-gc-on-night ${className}`}>
      <img
        src={img}
        alt=""
        width={1280}
        height={800}
        loading={eager ? "eager" : "lazy"}
        className="ind-kenburns absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-gc-night via-gc-night/30 to-transparent" />
      <div className="absolute left-6 top-5 flex items-center gap-2 text-[12px] text-gc-on-night-muted">
        <span className="ind-pulse h-2 w-2 rounded-full bg-gc-green" />EUR/USD · live
      </div>
      <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
        {tag && <p className="text-[12px] font-medium uppercase tracking-wider text-gc-on-night-muted">{tag}</p>}
        <p className="mt-1 text-[20px] leading-snug sm:text-[22px]">{caption}</p>
      </div>
    </div>
  );
}

function SectionBar({ hide = [] }: { hide?: string[] }) {
  const [active, setActive] = useState("overview");
  useEffect(() => {
    const els = SECTIONS.filter((s) => !hide.includes(s.id)).map((s) => document.getElementById(s.id)).filter((e): e is HTMLElement => !!e);
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
    // Inside the zoomed wrapper, so the offset is divided to stay under the header.
    <div className="sticky z-30 px-4 sm:px-6" style={{ top: `calc(4rem / ${PAGE_ZOOM})` }}>
      <nav aria-label="Page sections" className="mx-auto flex max-w-[1240px] gap-1 overflow-x-auto rounded-full border border-gc-line bg-background px-2 py-1.5 shadow-sm">
        {SECTIONS.filter((s) => !hide.includes(s.id)).map((s) => (
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

function SectionHead({ title, intro, center = false, onNight = false }: { title: string; intro?: string; center?: boolean; onNight?: boolean }) {
  return (
    <div className={`max-w-[720px] ${center ? "mx-auto text-center" : ""}`}>
      <h2 className="text-[28px] font-normal leading-tight sm:text-[32px]">{title}</h2>
      {intro && <p className={`mt-4 text-[16px] leading-[1.6] ${onNight ? "text-gc-on-night-muted" : "text-gc-ink-muted"}`}>{intro}</p>}
    </div>
  );
}

function Wrap({ id, children, tint = false, night = false }: { id: string; children: ReactNode; tint?: boolean; night?: boolean }) {
  return (
    <section id={id} className={`scroll-mt-32 ${tint ? "bg-gc-surface" : ""} ${night ? "bg-gc-night text-gc-on-night" : ""}`}>
      <div className="mx-auto max-w-[1240px] px-5 py-14 sm:px-8 md:py-20">{children}</div>
    </section>
  );
}

function storyList(c: IndustryContent) {
  return c.storySlugs.map((s) => STORIES.find((x) => x.slug === s)).filter((x) => !!x);
}

/* ---------- Solutions page layout ---------- */

function SolutionsHero({ c }: { c: IndustryContent }) {
  return (
    <section id="overview" className="scroll-mt-24">
      <div className="mx-auto grid max-w-[1240px] items-center gap-10 px-5 pb-12 pt-10 sm:px-8 md:grid-cols-[1fr_1.05fr] md:pb-16 md:pt-14">
        <div className="ind-rise">
          <span className="inline-flex rounded-full bg-gc-blue-soft px-3 py-1 text-[13px] font-medium text-gc-blue-deep">{c.pill}</span>
          <h1 className="mt-5 text-[34px] font-normal leading-[1.15] tracking-tight sm:text-[44px]">{c.title}</h1>
          <p className="mt-5 max-w-[520px] text-[16px] leading-[1.6] text-gc-ink-muted">{c.intro}</p>
          <Buttons />
        </div>
        <ImageCard img={c.heroImg} caption={c.heroCaption} tag="Top story" eager className="aspect-[16/11] md:aspect-auto md:min-h-[420px]" />
      </div>
    </section>
  );
}

function SolutionsCards({ c }: { c: IndustryContent }) {
  return (
    <Wrap id="solutions">
      <SectionHead title={c.solutionsTitle} intro={c.solutionsIntro} />
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {c.solutions.map((s) => (
          <a key={s.title} href={s.href} className="group overflow-hidden rounded-[24px] border border-gc-line bg-background transition-shadow hover:shadow-md">
            <div className="aspect-[16/10] overflow-hidden bg-gc-night">
              <img src={s.img} alt="" width={1280} height={800} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
            </div>
            <div className="p-6">
              <h3 className="text-[20px] font-normal">{s.title}</h3>
              <p className="mt-3 text-[15px] leading-[1.6] text-gc-ink-muted">{s.text}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-[14px] font-medium text-gc-blue-deep group-hover:underline">
                {s.link} <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </a>
        ))}
      </div>
    </Wrap>
  );
}

function TopicsList({ c }: { c: IndustryContent }) {
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
        <TopicBody t={t} />
      </div>
    </Wrap>
  );
}

function TopicBody({ t }: { t: IndustryContent["topics"][number] }) {
  return (
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
  );
}

function WhyAccordion({ c }: { c: IndustryContent }) {
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
          <ImageCard img={c.solutions[0]?.img ?? c.heroImg} caption={c.whyCardTitle} className="aspect-[4/3]" />
          <p className="mt-4 text-[14px] leading-[1.6] text-gc-ink-muted">{c.whyCardText}</p>
        </div>
      </div>
    </Wrap>
  );
}

function StoriesCards({ c }: { c: IndustryContent }) {
  return (
    <Wrap id="stories" tint>
      <SectionHead title={c.storiesTitle} />
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {storyList(c).map((s) => (
          <a key={s.slug} href={`/stories/${s.slug}`} className="group relative block aspect-[4/5] overflow-hidden rounded-[24px] bg-gc-night text-gc-on-night">
            <img src={s.img} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-gc-night via-gc-night/20 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6">
              <p className="text-[12px] font-medium uppercase tracking-wider text-gc-on-night-muted">{s.tag}</p>
              <h3 className="mt-2 line-clamp-2 max-sm:line-clamp-none text-[20px] font-normal leading-snug">{s.title}</h3>
              <span className="mt-4 inline-flex items-center gap-1 text-[14px] font-medium">
                Read now <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </a>
        ))}
      </div>
    </Wrap>
  );
}

/* ---------- Products page layout ---------- */

function ProductsHero({ c }: { c: IndustryContent }) {
  return (
    <section id="overview" className="scroll-mt-24">
      <div className="mx-auto max-w-[1240px] px-5 pb-12 pt-12 text-center sm:px-8 md:pb-16 md:pt-16">
        <div className="ind-rise mx-auto max-w-[820px]">
          <span className="inline-flex rounded-full bg-gc-blue-soft px-3 py-1 text-[13px] font-medium text-gc-blue-deep">{c.pill}</span>
          <h1 className="mt-5 text-[36px] font-normal leading-[1.12] tracking-tight sm:text-[52px]">{c.title}</h1>
          <p className="mx-auto mt-5 max-w-[620px] text-[17px] leading-[1.6] text-gc-ink-muted">{c.intro}</p>
          <Buttons center />
        </div>
        <figure className="ind-rise mt-12">
          <div className="aspect-[2/1] overflow-hidden rounded-[28px] bg-gc-night">
            <img src={c.heroImg} alt="" width={1600} height={800} loading="eager" className="ind-kenburns h-full w-full object-cover" />
          </div>
          <figcaption className="mt-4 text-[14px] text-gc-ink-muted">{c.heroCaption}</figcaption>
        </figure>
      </div>
    </section>
  );
}

function ProductsZigzag({ c }: { c: IndustryContent }) {
  return (
    <Wrap id="solutions">
      <SectionHead title={c.solutionsTitle} intro={c.solutionsIntro} center />
      <div className="mt-12 space-y-14 md:space-y-20">
        {c.solutions.map((s, n) => (
          <div key={s.title} className={`grid items-center gap-8 md:grid-cols-2 md:gap-16 ${n % 2 ? "md:[&>*:first-child]:order-2" : ""}`}>
            <div className="aspect-[16/10] overflow-hidden rounded-[28px] bg-gc-night">
              <img src={s.img} alt="" width={1280} height={800} loading="lazy" className="ind-kenburns h-full w-full object-cover" />
            </div>
            <div className={`max-w-[460px] ${n % 2 ? "md:justify-self-end" : ""}`}>
              <p className="text-[13px] font-medium text-gc-blue-deep">0{n + 1}</p>
              <h3 className="mt-2 text-[28px] font-normal leading-tight">{s.title}</h3>
              <p className="mt-4 text-[16px] leading-[1.6] text-gc-ink-muted">{s.text}</p>
              <a href={s.href} className="mt-6 inline-flex h-10 items-center gap-1 rounded-full bg-gc-blue-soft px-5 text-[14px] font-medium text-gc-blue-deep hover:brightness-95">
                {s.link} <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </Wrap>
  );
}

const HIGHLIGHT_ICONS = [
  { Icon: CandlestickChart, bg: "bg-gc-blue-soft", fg: "text-gc-blue" },
  { Icon: Sparkles, bg: "bg-gc-red-soft", fg: "text-gc-red" },
  { Icon: BellRing, bg: "bg-gc-yellow-soft", fg: "text-gc-yellow" },
  { Icon: Code2, bg: "bg-gc-green-soft", fg: "text-gc-green" },
];

/** Products page: plain white section with four homepage-style icon cards. */
function ProductsHighlights({ c }: { c: IndustryContent }) {
  if (!c.highlights?.length) return null;
  return (
    <section className="bg-background">
      <div className="mx-auto max-w-[1240px] px-5 py-14 sm:px-8 md:py-20">
        <SectionHead title={c.highlightsTitle ?? ""} intro={c.highlightsIntro} center />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {c.highlights.map((h, n) => {
            const { Icon, bg, fg } = HIGHLIGHT_ICONS[n % HIGHLIGHT_ICONS.length];
            return (
              <div key={h.title} className="ind-rise rounded-[24px] border border-gc-line bg-background p-7 text-left transition hover:shadow-[0_1px_3px_rgba(60,64,67,0.15),0_4px_12px_rgba(60,64,67,0.12)]" style={{ animationDelay: `${n * 0.08}s` }}>
                <span className={`flex h-12 w-12 items-center justify-center rounded-full ${bg}`}><Icon className={`h-6 w-6 ${fg}`} /></span>
                <h3 className="mt-5 text-[18px] font-medium">{h.title}</h3>
                <p className="mt-2 text-[15px] leading-[1.6] text-gc-ink-muted">{h.text}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function TopicsTabs({ c }: { c: IndustryContent }) {
  const [i, setI] = useState(0);
  const t = c.topics[i];
  return (
    <Wrap id="topics" tint>
      <SectionHead title={c.topicsTitle} center />
      <div role="tablist" className="mt-8 flex justify-start gap-2 overflow-x-auto pb-1 md:justify-center">
        {c.topics.map((x, n) => (
          <button
            key={x.label}
            role="tab"
            aria-selected={n === i}
            onClick={() => setI(n)}
            className={`shrink-0 rounded-full px-5 py-2.5 text-[14px] transition-colors ${n === i ? "bg-gc-blue-deep text-gc-on-blue" : "bg-background text-gc-ink-muted ring-1 ring-gc-line hover:text-gc-ink"}`}
          >
            {x.label}
          </button>
        ))}
      </div>
      <div className="mx-auto mt-8 max-w-[900px]">
        <TopicBody t={t} />
      </div>
    </Wrap>
  );
}

function WhyNight({ c }: { c: IndustryContent }) {
  return (
    <Wrap id="why" night>
      <SectionHead title={c.whyTitle} intro={c.whyCardTitle} center onNight />
      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {c.why.map((w, n) => (
          <div key={w.title} className="ind-rise rounded-[24px] bg-gc-night-soft p-6" style={{ animationDelay: `${n * 0.08}s` }}>
            <span className="text-[32px] font-light text-gc-yellow">0{n + 1}</span>
            <h3 className="mt-3 text-[18px] font-medium">{w.title}</h3>
            <p className="mt-2 text-[14px] leading-[1.6] text-gc-on-night-muted">{w.text}</p>
          </div>
        ))}
      </div>
      <p className="mt-8 text-center text-[13px] text-gc-on-night-muted">{c.whyCardText}</p>
    </Wrap>
  );
}

function StoriesRows({ c }: { c: IndustryContent }) {
  return (
    <Wrap id="stories">
      <SectionHead title={c.storiesTitle} center />
      <div className="mt-10 divide-y divide-gc-line border-y border-gc-line">
        {storyList(c).map((s) => (
          <a key={s.slug} href={`/stories/${s.slug}`} className="group grid items-center gap-5 py-6 sm:grid-cols-[220px_1fr_auto]">
            <div className="aspect-[16/10] overflow-hidden rounded-[16px] bg-gc-night">
              <img src={s.img} alt="" loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
            </div>
            <div>
              <p className="text-[12px] font-medium tracking-wide text-gc-ink-muted">{s.tag}</p>
              <h3 className="mt-1 text-[20px] font-normal leading-snug group-hover:text-gc-blue-deep">{s.title}</h3>
            </div>
            <span className="inline-flex items-center gap-1 text-[14px] font-medium text-gc-blue-deep">
              Read now <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </a>
        ))}
      </div>
    </Wrap>
  );
}

/* ---------- Product grid (both pages) ---------- */

function Products({ c }: { c: IndustryContent }) {
  const [all, setAll] = useState(false);
  const shown = all ? c.products : c.products.slice(0, 6);
  const p = c.variant === "products";
  return (
    <Wrap id="products" tint={p}>
      <SectionHead title={c.productsTitle} center={p} />
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((x) => (
          <div key={x.title} className={`ind-rise flex flex-col rounded-[20px] p-6 ${p ? "bg-background border-l-4 border-gc-blue" : "border border-gc-line"}`}>
            <h3 className="text-[18px] font-medium">{x.title}</h3>
            <p className="mt-2 flex-1 text-[15px] leading-[1.6] text-gc-ink-muted">{x.text}</p>
            <a href={x.href} className="mt-4 inline-flex items-center gap-1 text-[14px] font-medium text-gc-blue-deep hover:underline">
              Learn more <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        ))}
      </div>
      {c.products.length > 6 && (
        <div className="mt-8 flex justify-center">
          <button onClick={() => setAll(!all)} className="inline-flex h-10 items-center rounded-full border border-gc-line bg-background px-6 text-[14px] font-medium text-gc-blue-deep hover:bg-gc-blue-soft">
            {all ? "View less" : "View more"}
          </button>
        </div>
      )}
    </Wrap>
  );
}
