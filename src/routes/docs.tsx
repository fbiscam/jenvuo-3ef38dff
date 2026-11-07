import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, Menu, X, Copy, Check, MessageSquare, ChevronDown, ListTree } from "lucide-react";
import BlogFooter from "@/components/BlogFooter";
import JenvuMark from "@/components/JenvuMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DOC_GROUPS, type DocSection } from "@/components/docs/doc-content";
import { DocsOverview, OVERVIEW_TOC } from "@/components/docs/DocsOverview";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Jenvu Docs — API, Terminal and JX Bot guide" },
      {
        name: "description",
        content:
          "Get started with the Jenvu API: quickstart, models, pricing and code samples, plus guides for the Terminal chart, JX Bot, AI chat, plans and a full A–Z glossary.",
      },
      { property: "og:title", content: "Jenvu Docs — API, Terminal and JX Bot guide" },
      {
        property: "og:description",
        content: "Quickstart, models, pricing and code samples for the Jenvu API, plus every Jenvu guide in one place.",
      },
      { property: "og:url", content: "https://jenvu.com/docs" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://jenvu.com/docs" }],
  }),
  component: DocsPage,
});

const SANS = "font-['Google_Sans_Flex','Google_Sans','Product_Sans','Poppins',system-ui,sans-serif]";

type NavGroup = { title: string; sections: { id: string; title: string; keywords?: string }[] };

const START_GROUP: NavGroup = {
  title: "Get Started",
  sections: [
    { id: "docs-overview", title: "Overview", keywords: "api start" },
    { id: "quickstart", title: "Quickstart", keywords: "api key sdk first request" },
    { id: "models-list", title: "Models", keywords: "deepseek qwen vision coding" },
    { id: "api-pricing", title: "Pricing", keywords: "price tokens cost" },
  ],
};

function sectionText(s: { title: string; keywords?: string }) {
  return `${s.title} ${s.keywords ?? ""}`.toLowerCase();
}

const TOP_LINKS = [
  { label: "API", href: "#docs-overview" },
  { label: "Terminal", href: "#terminal-access" },
  { label: "JX Bot", href: "#jx-bot" },
  { label: "Models", href: "/models" },
  { label: "Pricing", href: "/pricing" },
];

function DocsPage() {
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState<string>("docs-overview");
  const [navOpen, setNavOpen] = React.useState(false);
  const [tocOpen, setTocOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const searchRef = React.useRef<HTMLInputElement>(null);

  const allGroups: NavGroup[] = React.useMemo(
    () => [START_GROUP, ...DOC_GROUPS.map((g) => ({ title: g.title, sections: g.sections.map((s: DocSection) => ({ id: s.id, title: s.title, keywords: s.keywords })) }))],
    [],
  );

  const q = query.trim().toLowerCase();
  const groups = React.useMemo(
    () =>
      allGroups
        .map((g) => ({ ...g, sections: q ? g.sections.filter((s) => sectionText(s).includes(q) || g.title.toLowerCase().includes(q)) : g.sections }))
        .filter((g) => g.sections.length > 0),
    [q, allGroups],
  );

  const tocIds = React.useMemo(() => [...OVERVIEW_TOC.map((t) => t.id), ...DOC_GROUPS.flatMap((g) => g.sections.map((s) => s.id))], []);

  React.useEffect(() => {
    const els = tocIds.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-90px 0px -65% 0px" },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [tocIds]);

  // Ctrl/Cmd + K focuses the docs search.
  React.useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (window.matchMedia("(min-width: 1024px)").matches) searchRef.current?.focus();
        else setNavOpen(true);
      }
      if (e.key === "Escape") setNavOpen(false);
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, []);

  React.useEffect(() => {
    document.body.style.overflow = navOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [navOpen]);

  const inOverview = OVERVIEW_TOC.some((t) => t.id === active);
  const activeGroup = DOC_GROUPS.find((g) => g.sections.some((s) => s.id === active));
  const toc = inOverview || !activeGroup ? OVERVIEW_TOC : activeGroup.sections.map((s) => ({ id: s.id, title: s.title }));
  const activeTitle = allGroups.flatMap((g) => g.sections).find((s) => s.id === active)?.title ?? "Overview";

  const copyForLlm = async () => {
    const main = document.getElementById("docs-main");
    try {
      await navigator.clipboard.writeText(`Jenvu documentation — https://jenvu.com/docs\n\n${main?.innerText ?? ""}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  const nav = (
    <nav aria-label="Documentation" className="space-y-7">
      {groups.length === 0 && <p className="px-2 text-[14px] text-gc-ink-muted">No topics match “{query}”.</p>}
      {groups.map((g) => (
        <div key={g.title}>
          <p className="px-2 text-[14px] font-medium text-gc-ink">{g.title}</p>
          <ul className="mt-2 space-y-0.5">
            {g.sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  onClick={() => setNavOpen(false)}
                  className={`block rounded-lg px-2 py-[7px] text-[14px] leading-snug transition ${
                    active === s.id ? "bg-gc-surface font-medium text-gc-ink" : "text-gc-ink-muted hover:text-gc-ink"
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

  const searchBox = (ref?: React.Ref<HTMLInputElement>) => (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gc-ink-muted" />
      <input
        ref={ref}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search"
        aria-label="Search documentation"
        className="h-10 w-full rounded-full border border-gc-line bg-background pl-10 pr-16 text-[14px] text-gc-ink outline-none placeholder:text-gc-ink-muted focus:border-gc-ink"
      />
      <kbd className="pointer-events-none absolute right-3.5 top-1/2 hidden -translate-y-1/2 text-[12px] tracking-wide text-gc-ink-muted sm:block">Ctrl+K</kbd>
    </div>
  );

  return (
    <div className={`min-h-dvh w-full bg-background text-gc-ink ${SANS} antialiased`}>
      {/* Docs top bar */}
      <header className="sticky top-0 z-40 border-b border-gc-line bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-3 px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            className="-ml-1 inline-flex h-9 w-9 items-center justify-center rounded-full text-gc-ink hover:bg-gc-surface lg:hidden"
            aria-label="Open docs menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link to="/" className="flex items-center gap-2" aria-label="Jenvu home">
            <JenvuMark className="h-7 w-7 text-gc-ink" />
            <span className="text-[17px] font-medium text-gc-ink">Docs</span>
          </Link>
          <nav className="mx-auto hidden items-center gap-7 lg:flex" aria-label="Docs sections">
            {TOP_LINKS.map((l) =>
              l.href.startsWith("#") ? (
                <a key={l.label} href={l.href} className="text-[15px] text-gc-ink-muted transition hover:text-gc-ink">{l.label}</a>
              ) : (
                <Link key={l.label} to={l.href} className="text-[15px] text-gc-ink-muted transition hover:text-gc-ink">{l.label}</Link>
              ),
            )}
          </nav>
          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <ThemeToggle />
            <div className="hidden w-[210px] xl:block">{searchBox(searchRef)}</div>
            <Link
              to="/dashboard/api"
              className="inline-flex h-10 items-center rounded-full bg-foreground px-4 text-[14px] font-medium text-background transition hover:opacity-90"
            >
              <span className="hidden sm:inline">API Console</span>
              <span className="sm:hidden">Console</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Phone: current topic + "On this page" */}
      <div className="sticky top-16 z-30 border-b border-gc-line bg-background px-4 py-2 lg:hidden">
        <button type="button" onClick={() => setTocOpen((v) => !v)} aria-expanded={tocOpen} className="flex w-full items-center gap-2 py-1 text-left text-[14px] text-gc-ink">
          <ListTree className="h-4 w-4 text-gc-ink-muted" />
          <span className="min-w-0 flex-1 truncate">{activeTitle}</span>
          <ChevronDown className={`h-4 w-4 text-gc-ink-muted transition ${tocOpen ? "rotate-180" : ""}`} />
        </button>
        {tocOpen && (
          <ul className="mt-2 max-h-[50vh] overflow-y-auto pb-2">
            {toc.map((t) => (
              <li key={t.id}>
                <a href={`#${t.id}`} onClick={() => setTocOpen(false)} className={`block py-1.5 text-[14px] ${active === t.id ? "text-gc-ink" : "text-gc-ink-muted"}`}>{t.title}</a>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Phone drawer */}
      {navOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Docs menu">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-foreground/30" onClick={() => setNavOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[86%] max-w-[340px] flex-col bg-background shadow-xl">
            <div className="flex h-16 items-center justify-between border-b border-gc-line px-4">
              <span className="flex items-center gap-2"><JenvuMark className="h-6 w-6 text-gc-ink" /><span className="text-[16px] font-medium">Docs</span></span>
              <button type="button" onClick={() => setNavOpen(false)} className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-gc-surface" aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="border-b border-gc-line p-4">{searchBox()}</div>
            <div className="flex flex-wrap gap-2 border-b border-gc-line px-4 py-3">
              {TOP_LINKS.map((l) =>
                l.href.startsWith("#") ? (
                  <a key={l.label} href={l.href} onClick={() => setNavOpen(false)} className="rounded-full border border-gc-line px-3 py-1 text-[13px] text-gc-ink">{l.label}</a>
                ) : (
                  <Link key={l.label} to={l.href} className="rounded-full border border-gc-line px-3 py-1 text-[13px] text-gc-ink">{l.label}</Link>
                ),
              )}
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-5">{nav}</div>
          </div>
        </div>
      )}

      <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-8 px-4 sm:px-6 lg:grid-cols-[250px_minmax(0,1fr)] xl:grid-cols-[250px_minmax(0,1fr)_230px] xl:gap-10">
        <aside className="hidden lg:block">
          <div className="sticky top-16 max-h-[calc(100dvh-4rem)] overflow-y-auto py-8 pr-2">
            <div className="mb-6 xl:hidden">{searchBox()}</div>
            {nav}
          </div>
        </aside>

        <main id="docs-main" className="min-w-0 py-6 sm:py-8 lg:py-10">
          <DocsOverview />

          <div className="mt-20 max-w-[860px] space-y-14">
            {DOC_GROUPS.map((g) => (
              <div key={g.title} className="space-y-10">
                <p className="text-[14px] text-gc-ink-muted">{g.title}</p>
                {g.sections.map((s) => (
                  <article key={s.id} id={s.id} className="scroll-mt-28 border-b border-gc-line pb-10 last:border-0">
                    <h2 className="text-[28px] font-medium leading-tight tracking-[-0.3px] text-gc-ink sm:text-[32px]">{s.title}</h2>
                    <div className="doc-body mt-4 space-y-4 break-words text-[16px] leading-[1.7] text-gc-ink [&_a]:underline [&_a]:underline-offset-4 [&_h3]:pt-3 [&_h3]:text-[20px] [&_h3]:font-medium [&_h3]:text-gc-ink [&_li]:pl-1 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5 [&_strong]:font-medium [&_strong]:text-gc-ink [&_table]:block [&_table]:overflow-x-auto [&_pre]:overflow-x-auto [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
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
          <div className="sticky top-16 flex max-h-[calc(100dvh-4rem)] flex-col py-8">
            <p className="text-[14px] font-medium text-gc-ink">On this page</p>
            <ul className="mt-3 flex-1 space-y-0.5 overflow-y-auto">
              {toc.map((t) => (
                <li key={t.id}>
                  <a
                    href={`#${t.id}`}
                    className={`block py-1.5 text-[13px] leading-snug transition ${active === t.id ? "text-gc-ink" : "text-gc-ink-muted hover:text-gc-ink"}`}
                  >
                    {t.title}
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-6 space-y-2 border-t border-gc-line pt-4">
              <button type="button" onClick={copyForLlm} className="flex items-center gap-2 text-[14px] text-gc-ink-muted hover:text-gc-ink">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : "Copy for LLM"}
              </button>
              <Link to="/contact" className="flex items-center gap-2 text-[14px] text-gc-ink-muted hover:text-gc-ink">
                <MessageSquare className="h-4 w-4" /> Share feedback
              </Link>
            </div>
          </div>
        </aside>
      </div>

      <div className="hide-in-pwa"><BlogFooter /></div>
    </div>
  );
}
