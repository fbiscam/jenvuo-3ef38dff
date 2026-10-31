import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  CandlestickChart,
  Sparkles,
  BellRing,
  Code2,
  Bot,
  TrendingUp,
  ShieldCheck,
  Newspaper,
  BookOpen,
  MessageSquare,
  FileText,
  Image as ImageIcon,
  Globe,
  Zap,
  type LucideIcon,
} from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import BlogFooter from "@/components/BlogFooter";
import { useAuthUser } from "@/hooks/useAuthUser";
import { STORIES } from "@/lib/stories";

/**
 * Solutions and Products pages, styled like the API Platform page: big centred
 * headings, dark/light pill buttons, dark image cards, aurora tiles and soft
 * bordered boxes. Both pages share these pieces but keep their own layout
 * variant so the two pages never look the same.
 */

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
  /** Products page only: "what you get" section with four icon cards. */
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

const SIGN_IN = "https://auth.jenvu.com/sign-in";

/** Same aurora gradients as the Platform page tiles. */
const AURORAS = ["var(--platform-aurora-1)", "var(--platform-aurora-2)", "var(--platform-aurora-3)"];
const SOLUTION_ICONS: LucideIcon[] = [CandlestickChart, TrendingUp, BellRing, Code2, Bot, ShieldCheck];
const STORY_ICONS: LucideIcon[] = [Newspaper, BookOpen, TrendingUp];
const ICON_SETS: LucideIcon[][] = [
  [CandlestickChart, Sparkles, BellRing],
  [MessageSquare, FileText, ImageIcon],
  [ShieldCheck, Globe, Zap, Bot],
];

const pillDark =
  "inline-flex items-center gap-1.5 rounded-full bg-gc-ink px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-85";
const pillLight =
  "inline-flex items-center gap-1.5 rounded-full bg-gc-surface px-5 py-2.5 text-sm font-medium text-gc-ink ring-1 ring-gc-line/60 transition-colors hover:bg-gc-panel";
const underlineLink =
  "inline-flex w-fit items-center gap-1 border-b border-gc-ink pb-0.5 text-[15px] font-medium text-gc-ink hover:opacity-70";

export function IndustryPage({ c }: { c: IndustryContent }) {
  const p = c.variant === "products";
  return (
    <div className="min-h-dvh w-full bg-background font-sans text-gc-ink antialiased">
      <SiteHeader />
      <main>
        {p ? <ProductsHero c={c} /> : <SolutionsHero c={c} />}
        <SectionBar hide={p ? ["why", "products", "topics"] : []} />
        {p ? <ProductsZigzag c={c} /> : <SolutionsCards c={c} />}
        {p && <ProductsHighlights c={c} />}
        {!p && <TopicsTabs c={c} />}
        {!p && <WhyList c={c} />}
        {p ? <StoriesRows c={c} /> : <StoriesCards c={c} />}
        {!p && <Products c={c} />}
        <GetStarted />
      </main>
      <BlogFooter />
    </div>
  );
}

/* ---------- Shared pieces ---------- */

function Buttons() {
  return (
    <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
      <Link to="/contact" className={pillDark}>
        Talk to an expert
      </Link>
      <Link to="/pricing" className={pillLight}>
        Buy now <ArrowUpRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function Ticks({ items }: { items: string[] }) {
  return (
    <ul className="mt-5 space-y-3 text-[15px] leading-snug text-gc-ink">
      {items.map((t) => (
        <li key={t} className="flex gap-2">
          <Check className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

/** Aurora gradient tile with white icon chips (Platform Build/Ground/Act and use-case style). */
function AuroraArt({ n = 0, icons, className = "" }: { n?: number; icons: LucideIcon[]; className?: string }) {
  const cols = icons.length === 3 || icons.length > 4 ? "grid-cols-3" : icons.length > 1 ? "grid-cols-2" : "";
  return (
    <div
      className={`flex items-center justify-center overflow-hidden rounded-md ${className}`}
      style={{ backgroundImage: AURORAS[n % AURORAS.length] }}
    >
      <div className={`grid gap-3 sm:gap-4 ${cols}`}>
        {icons.map((Icon, k) => (
          <span
            key={k}
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-background/90 text-gc-ink shadow-sm sm:h-16 sm:w-16"
          >
            <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
          </span>
        ))}
      </div>
    </div>
  );
}

/** Wide hero tile with its caption underneath. */
function HeroArt({ tag, caption, n }: { tag: string; caption: string; n: number }) {
  return (
    <div className="mt-14 text-left sm:mt-16">
      <AuroraArt n={n} icons={ICON_SETS[0].concat(ICON_SETS[1]).slice(0, 6)} className="min-h-[260px] sm:aspect-[16/6] sm:min-h-0" />
      <Kicker>
        <span className="mt-6 block">{tag}</span>
      </Kicker>
      <h3 className="mt-2 text-2xl font-medium leading-tight tracking-tight sm:text-[1.75rem]">{caption}</h3>
    </div>
  );
}

/** Card with an aurora tile on top and text below (Platform use-case card). */
function AuroraCard({
  n,
  icon,
  tag,
  title,
  text,
  link,
  href,
}: {
  n: number;
  icon: LucideIcon;
  tag?: string;
  title: string;
  text?: string;
  link: string;
  href: string;
}) {
  return (
    <a href={href} className="group flex flex-col rounded-md bg-gc-surface p-2 text-left">
      <AuroraArt n={n} icons={[icon]} className="aspect-[16/9]" />
      <div className="flex flex-1 flex-col px-3 pb-4 pt-5">
        {tag && (
          <Kicker>
            <span className="mb-2 block">{tag}</span>
          </Kicker>
        )}
        <h3 className="text-xl font-medium leading-snug">{title}</h3>
        {text && <p className="mt-2 flex-1 text-[15px] leading-relaxed text-gc-ink-muted">{text}</p>}
        <span className="mt-5 inline-flex w-fit items-center gap-1 border-b border-gc-ink pb-0.5 text-sm font-medium group-hover:opacity-70">
          {link} <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </a>
  );
}

function SectionBar({ hide = [] }: { hide?: string[] }) {
  const [active, setActive] = useState("overview");
  useEffect(() => {
    const els = SECTIONS.filter((s) => !hide.includes(s.id))
      .map((s) => document.getElementById(s.id))
      .filter((e): e is HTMLElement => !!e);
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (vis) setActive(vis.target.id);
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="sticky top-16 z-30 flex justify-center px-4 sm:px-6">
      <nav
        aria-label="Page sections"
        className="flex max-w-full gap-1 overflow-x-auto rounded-full bg-background/90 p-1.5 ring-1 ring-gc-line backdrop-blur"
      >
        {SECTIONS.filter((s) => !hide.includes(s.id)).map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              active === s.id ? "bg-gc-ink text-background" : "text-gc-ink hover:bg-gc-surface"
            }`}
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
    <div className="mx-auto max-w-3xl text-center">
      <h2 className="text-4xl font-medium leading-tight tracking-tight sm:text-5xl">{title}</h2>
      {intro && <p className="mt-5 text-[17px] leading-relaxed text-gc-ink">{intro}</p>}
    </div>
  );
}

function Wrap({ id, children, wide = false }: { id: string; children: ReactNode; wide?: boolean }) {
  return (
    <section id={id} className="scroll-mt-32">
      <div className={`mx-auto px-5 py-16 sm:py-20 ${wide ? "max-w-[1340px]" : "max-w-6xl"}`}>{children}</div>
    </section>
  );
}

function storyList(c: IndustryContent) {
  return c.storySlugs.map((s) => STORIES.find((x) => x.slug === s)).filter((x) => !!x);
}

function Kicker({ children }: { children: ReactNode }) {
  return <p className="text-xs font-medium uppercase tracking-[0.2em] text-gc-ink-muted">{children}</p>;
}

/* ---------- Solutions page layout ---------- */

function SolutionsHero({ c }: { c: IndustryContent }) {
  return (
    <section id="overview" className="scroll-mt-24">
      <div className="mx-auto max-w-6xl px-5 pb-14 pt-20 text-center sm:pt-28">
        <Kicker>{c.pill}</Kicker>
        <h1 className="mx-auto mt-5 max-w-3xl text-[2.6rem] font-medium leading-[1.08] tracking-tight sm:text-6xl">{c.title}</h1>
        <p className="mx-auto mt-6 max-w-2xl text-[17px] leading-relaxed text-gc-ink">{c.intro}</p>
        <Buttons />
        <HeroArt tag="Top story" caption={c.heroCaption} n={0} />
      </div>
    </section>
  );
}

function SolutionsCards({ c }: { c: IndustryContent }) {
  return (
    <Wrap id="solutions" wide>
      <SectionHead title={c.solutionsTitle} intro={c.solutionsIntro} />
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {c.solutions.map((s, n) => (
          <AuroraCard
            key={s.title}
            n={n}
            icon={SOLUTION_ICONS[n % SOLUTION_ICONS.length]}
            title={s.title}
            text={s.text}
            link={s.link}
            href={s.href}
          />
        ))}
      </div>
    </Wrap>
  );
}

function TopicsTabs({ c }: { c: IndustryContent }) {
  const [i, setI] = useState(0);
  const t = c.topics[i];
  return (
    <Wrap id="topics">
      <SectionHead title={c.topicsTitle} />
      <div className="mt-9 flex justify-center">
        <div role="tablist" className="flex max-w-full gap-1 overflow-x-auto rounded-full bg-gc-surface p-1">
          {c.topics.map((x, n) => (
            <button
              key={x.label}
              type="button"
              role="tab"
              aria-selected={n === i}
              onClick={() => setI(n)}
              className={`shrink-0 rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                n === i ? "bg-background text-gc-ink shadow-sm" : "text-gc-ink-muted hover:text-gc-ink"
              }`}
            >
              {x.label}
            </button>
          ))}
        </div>
      </div>
      {t && (
        <div key={t.label} role="tabpanel" className="mt-10 grid overflow-hidden rounded-md border border-gc-line text-left md:grid-cols-2">
          <div className="p-7 sm:p-10">
            <h3 className="text-2xl font-medium tracking-tight sm:text-3xl">{t.title}</h3>
            <p className="mt-4 text-[15px] leading-relaxed text-gc-ink">{t.text}</p>
            <a href={t.href} className={`mt-8 ${underlineLink}`}>
              {t.link} <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>
          <div className="p-7 sm:p-10" style={{ backgroundImage: AURORAS[i % AURORAS.length] }}>
            <div className="rounded-md bg-background/90 p-6 shadow-lg backdrop-blur">
              <Kicker>What you get</Kicker>
              <Ticks items={t.points} />
            </div>
          </div>
        </div>
      )}
    </Wrap>
  );
}

function WhyList({ c }: { c: IndustryContent }) {
  const [open, setOpen] = useState(0);
  return (
    <Wrap id="why">
      <div className="grid items-start gap-10 text-left md:grid-cols-2">
        <div>
          <h2 className="text-4xl font-medium leading-tight tracking-tight sm:text-5xl">{c.whyTitle}</h2>
          <div className="mt-8 divide-y divide-gc-line border-y border-gc-line">
            {c.why.map((w, n) => (
              <div key={w.title}>
                <button
                  type="button"
                  aria-expanded={open === n}
                  onClick={() => setOpen(open === n ? -1 : n)}
                  className="flex w-full items-center justify-between gap-4 py-5 text-left text-lg font-medium"
                >
                  {w.title}
                  <ChevronDown className={`h-5 w-5 shrink-0 transition-transform ${open === n ? "rotate-180" : ""}`} />
                </button>
                {open === n && <p className="pb-5 text-[15px] leading-relaxed text-gc-ink">{w.text}</p>}
              </div>
            ))}
          </div>
        </div>
        <div>
          <AuroraArt n={2} icons={ICON_SETS[2]} className="min-h-[280px] sm:aspect-[4/3] sm:min-h-0" />
          <h3 className="mt-5 text-xl font-medium">{c.whyCardTitle}</h3>
          <p className="mt-2 text-[15px] leading-relaxed text-gc-ink-muted">{c.whyCardText}</p>
        </div>
      </div>
    </Wrap>
  );
}

function StoriesCards({ c }: { c: IndustryContent }) {
  return (
    <Wrap id="stories" wide>
      <SectionHead title={c.storiesTitle} />
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {storyList(c).map((s, n) => (
          <AuroraCard
            key={s.slug}
            n={n + 1}
            icon={STORY_ICONS[n % STORY_ICONS.length]}
            tag={s.tag}
            title={s.title}
            link="Read now"
            href={`/stories/${s.slug}`}
          />
        ))}
      </div>
    </Wrap>
  );
}

/* ---------- Products page layout ---------- */

function ProductsHero({ c }: { c: IndustryContent }) {
  return (
    <section id="overview" className="scroll-mt-24">
      <div className="mx-auto max-w-6xl px-5 pb-14 pt-20 text-center sm:pt-28">
        <Kicker>{c.pill}</Kicker>
        <h1 className="mx-auto mt-5 max-w-3xl text-[2.6rem] font-medium leading-[1.08] tracking-tight sm:text-6xl">{c.title}</h1>
        <p className="mx-auto mt-6 max-w-2xl text-[17px] leading-relaxed text-gc-ink">{c.intro}</p>
        <Buttons />
        <HeroArt tag="Overview" caption={c.heroCaption} n={1} />
      </div>
    </section>
  );
}

function ProductsZigzag({ c }: { c: IndustryContent }) {
  return (
    <Wrap id="solutions">
      <SectionHead title={c.solutionsTitle} intro={c.solutionsIntro} />
      <div className="mt-14 space-y-16 md:space-y-24">
        {c.solutions.map((s, n) => (
          <div
            key={s.title}
            className={`grid items-center gap-8 text-left md:grid-cols-2 md:gap-16 ${n % 2 ? "md:[&>*:first-child]:order-2" : ""}`}
          >
            <AuroraArt n={n} icons={ICON_SETS[n % ICON_SETS.length]} className="aspect-[4/3] sm:aspect-[5/4]" />
            <div className={`max-w-[460px] ${n % 2 ? "md:justify-self-end" : ""}`}>
              <Kicker>0{n + 1}</Kicker>
              <h3 className="mt-3 text-3xl font-medium leading-tight tracking-tight sm:text-4xl">{s.title}</h3>
              <p className="mt-4 text-[16px] leading-relaxed text-gc-ink">{s.text}</p>
              <a href={s.href} className={`mt-7 ${pillLight}`}>
                {s.link} <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </Wrap>
  );
}

const HIGHLIGHT_ICONS = [CandlestickChart, Sparkles, BellRing, Code2];

/** Products page: four Platform use-case style cards. */
function ProductsHighlights({ c }: { c: IndustryContent }) {
  if (!c.highlights?.length) return null;
  return (
    <section className="bg-background">
      <div className="mx-auto max-w-[1340px] px-5 py-16 sm:py-20">
        <SectionHead title={c.highlightsTitle ?? ""} intro={c.highlightsIntro} />
        <div className="mt-12 grid gap-6 text-left sm:grid-cols-2 lg:grid-cols-4">
          {c.highlights.map((h, n) => {
            const Icon = HIGHLIGHT_ICONS[n % HIGHLIGHT_ICONS.length];
            return (
              <div key={h.title} className="flex flex-col rounded-md border border-gc-line p-7">
                <span
                  className="flex h-14 w-14 items-center justify-center rounded-2xl"
                  style={{ backgroundImage: AURORAS[n % AURORAS.length] }}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-background/90 shadow">
                    <Icon className="h-5 w-5" />
                  </span>
                </span>
                <h3 className="mt-6 text-xl font-medium">{h.title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-gc-ink">{h.text}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function StoriesRows({ c }: { c: IndustryContent }) {
  return (
    <Wrap id="stories">
      <SectionHead title={c.storiesTitle} />
      <div className="mt-12 divide-y divide-gc-line border-y border-gc-line text-left">
        {storyList(c).map((s, n) => (
          <a key={s.slug} href={`/stories/${s.slug}`} className="group grid items-center gap-5 py-7 sm:grid-cols-[240px_1fr_auto]">
            <AuroraArt n={n} icons={[STORY_ICONS[n % STORY_ICONS.length]]} className="aspect-[16/10]" />
            <div>
              <Kicker>{s.tag}</Kicker>
              <h3 className="mt-2 text-2xl font-medium leading-snug tracking-tight">{s.title}</h3>
            </div>
            <span className={underlineLink}>
              Read now <ArrowUpRight className="h-3.5 w-3.5" />
            </span>
          </a>
        ))}
      </div>
    </Wrap>
  );
}

/* ---------- Product grid (Solutions page) ---------- */

function Products({ c }: { c: IndustryContent }) {
  const [all, setAll] = useState(false);
  const shown = all ? c.products : c.products.slice(0, 6);
  return (
    <Wrap id="products">
      <SectionHead title={c.productsTitle} />
      <div className="mt-12 grid gap-6 text-left sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((x) => (
          <div key={x.title} className="flex flex-col rounded-md border border-gc-line p-6">
            <h3 className="text-xl font-medium">{x.title}</h3>
            <p className="mt-4 flex-1 text-sm leading-relaxed text-gc-ink">{x.text}</p>
            <a href={x.href} className={`mt-7 ${underlineLink}`}>
              Learn more <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>
        ))}
      </div>
      {c.products.length > 6 && (
        <div className="mt-10 flex justify-center">
          <button type="button" onClick={() => setAll(!all)} className={pillLight}>
            {all ? "View less" : "View more"}
          </button>
        </div>
      )}
    </Wrap>
  );
}

/* ---------- Closing (both pages) ---------- */

function GetStarted() {
  const { user } = useAuthUser();
  return (
    <section className="bg-background py-20 text-center">
      <div className="mx-auto max-w-6xl px-5">
        <h2 className="text-4xl font-medium tracking-tight sm:text-5xl">Take the next step</h2>
        <div className="mt-10 grid gap-6 text-left md:grid-cols-2">
          <div className="flex flex-col rounded-md border border-gc-line p-7 sm:p-8">
            <h3 className="text-2xl font-medium">Talk to the Jenvu team</h3>
            <div className="flex-1">
              <Ticks items={["Tell us what you trade", "Get help choosing a setup and plan", "Ask about the Founding Program"]} />
            </div>
            <div className="mt-8">
              <Link to="/contact" className={pillDark}>
                Contact us
              </Link>
            </div>
          </div>
          <div className="flex flex-col rounded-md border border-gc-line p-7 sm:p-8">
            <h3 className="text-2xl font-medium">Start on your own</h3>
            <div className="flex-1">
              <Ticks items={["Open the live Fiber Terminal", "Ask the AI desk about the chart", "Compare plans and credits"]} />
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              {user ? (
                <Link to="/dashboard" className={pillLight}>
                  Open dashboard <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              ) : (
                <a href={SIGN_IN} className={pillLight}>
                  Try it free <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              )}
              <Link to="/pricing" className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-medium hover:bg-gc-surface">
                See pricing
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
