import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, ChevronRight, Menu, X } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { NextStep } from "@/components/PageShell";
import { DOC_GROUPS, type DocSection } from "@/components/docs/doc-content";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Jenvu Documentation — A to Z guide" },
      {
        name: "description",
        content:
          "Everything about Jenvu in one place: accounts, the free trial, the Terminal chart, zones, FVGs, sweeps, AI chat, plans, API and a full A–Z glossary.",
      },
      { property: "og:title", content: "Jenvu Documentation — A to Z guide" },
      {
        property: "og:description",
        content: "Learn how every part of Jenvu works, from sign-up to chart markings, AI chat, billing and the API.",
      },
      { property: "og:url", content: "https://jenvu.com/docs" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://jenvu.com/docs" }],
  }),
  component: DocsPage,
});

const SANS = "font-['Google_Sans','Product_Sans','Google Sans',system-ui,sans-serif]";

function sectionText(s: DocSection) {
  return `${s.title} ${s.keywords ?? ""}`.toLowerCase();
}

function DocsPage() {
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState<string>(DOC_GROUPS[0].sections[0].id);
  const [navOpen, setNavOpen] = React.useState(false);

  const q = query.trim().toLowerCase();
  const groups = React.useMemo(
    () =>
      DOC_GROUPS.map((g) => ({
        ...g,
        sections: q ? g.sections.filter((s) => sectionText(s).includes(q) || g.title.toLowerCase().includes(q)) : g.sections,
      })).filter((g) => g.sections.length > 0),
    [q],
  );

  const all = React.useMemo(() => DOC_GROUPS.flatMap((g) => g.sections), []);

  React.useEffect(() => {
    const els = all.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-90px 0px -65% 0px" },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [all]);

  const activeGroup = DOC_GROUPS.find((g) => g.sections.some((s) => s.id === active)) ?? DOC_GROUPS[0];

  const nav = (
    <nav aria-label="Documentation" className="space-y-5">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gc-ink-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter topics"
          aria-label="Filter documentation topics"
          className="h-10 w-full rounded-full border border-gc-line bg-background pl-9 pr-3 text-[14px] text-gc-ink outline-none focus:border-gc-blue-deep"
        />
      </div>
      {groups.length === 0 && <p className="px-3 text-[14px] text-gc-ink-muted">No topics match “{query}”.</p>}
      {groups.map((g) => (
        <div key={g.title}>
          <p className="px-3 text-[12px] font-medium uppercase tracking-wide text-gc-ink-muted">{g.title}</p>
          <ul className="mt-1.5 space-y-0.5">
            {g.sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  onClick={() => setNavOpen(false)}
                  className={`block rounded-r-full py-1.5 pl-3 pr-3 text-[14px] leading-snug ${
                    active === s.id ? "bg-gc-nav-active font-medium text-gc-blue-deep" : "text-gc-ink hover:bg-gc-surface"
                  }`}
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className={`min-h-dvh w-full bg-background text-gc-ink ${SANS} antialiased`}>
      <SiteHeader />

      {/* Docs hero — homepage style */}
      <section className="bg-background">
        <div className="mx-auto max-w-[1296px] px-5 pb-10 pt-12 text-center sm:px-8 md:pt-14">
          <h1 className="jenvu-rise mx-auto max-w-[900px] text-[40px] font-medium leading-[1.1] tracking-[-0.5px] sm:text-[56px]">Jenvu documentation</h1>
          <p className="jenvu-rise [animation-delay:80ms] mx-auto mt-5 max-w-[720px] text-[17px] leading-[1.6] text-gc-ink-muted">
            The complete A to Z guide to Jenvu — your account, the free trial, the Terminal chart and every marking on it, AI chat,
            plans, the API and a glossary of every term we use.
          </p>
          <div className="jenvu-rise [animation-delay:140ms] mx-auto mt-8 grid max-w-[1100px] gap-3 text-left sm:grid-cols-2 lg:grid-cols-5">
            {DOC_GROUPS.slice(0, 5).map((g) => (
              <a key={g.title} href={`#${g.sections[0].id}`} className="group rounded-3xl border border-gc-line bg-background p-5 transition-shadow hover:shadow-md">
                <p className="text-[16px] font-medium text-gc-ink">{g.title}</p>
                <p className="mt-1 text-[13px] text-gc-ink-muted">{g.sections.length} topics</p>
                <span className="mt-3 inline-flex items-center gap-1 text-[14px] text-gc-blue">Read <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Mobile nav toggle */}
      <div className="sticky top-[60px] z-20 flex items-center gap-2 border-b border-gc-line bg-background px-5 py-2.5 lg:hidden">
        <button type="button" onClick={() => setNavOpen((v) => !v)} className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[14px] text-gc-ink hover:bg-gc-surface" aria-expanded={navOpen}>
          {navOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          {activeGroup.title}
        </button>
      </div>
      {navOpen && <div className="border-b border-gc-line bg-background px-5 py-5 lg:hidden">{nav}</div>}

      <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-8 border-t border-gc-line px-5 sm:px-8 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)_220px]">
        <aside className="hidden lg:block">
          <div className="sticky top-[calc(var(--docs-header-h,52px)+16px)] max-h-[calc(100vh-var(--docs-header-h,52px)-32px)] overflow-y-auto py-6 pr-2">{nav}</div>
        </aside>

        <main className="min-w-0 py-8 lg:py-10">
          <div className="max-w-[820px] space-y-12">
            {DOC_GROUPS.map((g) => (
              <div key={g.title} className="space-y-5">
                <h2 className="text-[13px] font-medium uppercase tracking-wide text-gc-ink-muted">{g.title}</h2>
                {g.sections.map((s) => (
                  <article key={s.id} id={s.id} className="scroll-mt-20 rounded-[28px] border border-gc-line bg-background p-6 sm:p-8">
                    <h2 className="text-[26px] font-medium leading-tight tracking-[-0.2px] text-gc-ink">{s.title}</h2>
                    <div className="doc-body mt-4 space-y-4 text-[15px] leading-[1.7] text-gc-ink-muted [&_a]:text-gc-blue-deep [&_a]:underline [&_h3]:pt-2 [&_h3]:text-[18px] [&_h3]:font-normal [&_h3]:text-gc-ink [&_li]:pl-1 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5 [&_strong]:font-medium [&_strong]:text-gc-ink [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
                      {s.body}
                    </div>
                  </article>
                ))}
              </div>
            ))}
            <p className="text-[13px] text-gc-ink-muted">
              Last updated · {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </p>
          </div>
        </main>

        <aside className="hidden xl:block">
          <div className="sticky top-[calc(var(--docs-header-h,52px)+16px)] py-6">
            <p className="text-[13px] font-medium text-gc-ink">On this page</p>
            <ul className="mt-3 space-y-1 border-l border-gc-line">
              {activeGroup.sections.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className={`-ml-px block border-l-2 py-1 pl-3 text-[13px] leading-snug ${
                      active === s.id ? "border-gc-blue-deep text-gc-blue-deep" : "border-transparent text-gc-ink-muted hover:text-gc-ink"
                    }`}
                  >
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      <NextStep />
      <div className="hide-in-pwa"><SiteFooter /></div>
    </div>
  );
}
