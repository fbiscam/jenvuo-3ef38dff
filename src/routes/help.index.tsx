import * as React from "react";
import SiteHeader from "@/components/SiteHeader";
import { createFileRoute, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { Search, ArrowRight, ChevronDown, ChevronsUpDown, Send } from "lucide-react";
import BlogFooter from "@/components/BlogFooter";
import { NextStep } from "@/components/PageShell";
import { collections, allArticles } from "@/lib/help-content";
import { SUPPORT_GUIDES } from "@/lib/support-guides";

export const Route = createFileRoute("/help/")({
  head: () => ({
    meta: [
      { title: "Help Center — Guides, FAQs & Support | Jenvu AI" },
      { name: "description", content: "Jenvu AI Help Center — guides and troubleshooting for the built-in trading terminal, ICT/SMC signal engine, billing and account security." },
      { name: "keywords", content: "Jenvu help, Jenvu terminal support, ICT SMC signals help, Fiber trading AI FAQ, Jenvu billing" },
      { property: "og:title", content: "Help Center — Jenvu AI" },
      { property: "og:description", content: "Guides, FAQs and troubleshooting for Jenvu's built-in trading terminal, signal engine and billing." },
      { property: "og:url", content: "https://support.jenvu.com/" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Help Center — Jenvu AI" },
      { name: "twitter:description", content: "Guides, FAQs and troubleshooting for the Jenvu built-in trading terminal." },
    ],
    links: [{ rel: "canonical", href: "https://support.jenvu.com/" }],
  }),
  component: HelpCenterPage,
});

const SANS = "font-['Google_Sans','Product_Sans','Poppins',system-ui,sans-serif]";


function HelpCenterPage() {
  const [q, setQ] = React.useState("");
  const navigate = useNavigate();
  const hash = useLocation({ select: (l) => l.hash });

  const results = React.useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return allArticles()
      .filter(({ article }) => {
        const haystack = [
          article.title,
          article.summary,
          ...article.body.map((b) =>
            b.type === "ul" || b.type === "ol" ? b.items.join(" ") : b.content,
          ),
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(term);
      })
      .slice(0, 6);
  }, [q]);

  const [picked, setPicked] = React.useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = React.useState(true);
  const shown = picked.length ? collections.filter((c) => picked.includes(c.slug)) : collections;
  const toggle = (s: string) => setPicked((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));

  const faqs = [
    { q: "How do I cancel my Jenvu subscription?", a: "Open Dashboard → Billing and choose Cancel plan. You keep access until the end of the period you already paid for. See the Cancellation policy for details." },
    { q: "How do I start the free trial?", a: "After signing up, click “Start free” in the banner at the top of your dashboard. It adds $100 credit and 14 days of Pro, once per account." },
    { q: "Who can use the Terminal?", a: "The Terminal is reserved for approved Founding Program members, free of cost. Pro, Elite and Ultra plans cover JX Bot for MT5 and the Top AI Models; credit pays for API and AI use, and all other pages stay open." },
    { q: "How do I get JX Bot?", a: "Choose Pro, Elite or Ultra, then open Dashboard → JX Bot to download it, add the IP of the PC or RDP that runs MT5 and follow the install steps." },
    { q: "How do I contact Jenvu support?", a: "Email support@jenvu.com or use the Contact page. We reply within one business day, Monday to Friday." },
  ];
  const [open, setOpen] = React.useState<number[]>([]);
  const allOpen = open.length === faqs.length;

  return (
    <div className={`public-cloudflare jenvu-zoom min-h-dvh bg-background text-gc-ink ${SANS} antialiased`}>
      <SiteHeader />

      <div className="mx-auto max-w-[1300px] px-5 sm:px-8">
        {/* HERO */}
        <section className="grid gap-8 py-12 sm:py-16 lg:grid-cols-[1fr_416px] lg:items-start">
          <div>
            <h1 className="text-[36px] leading-tight tracking-tight sm:text-[46px]">Jenvu Customer Care</h1>
            <p className="mt-5 max-w-[830px] text-[18px] leading-relaxed text-gc-ink-muted">
              Check our self-serve guides or learn more about getting help with your account, billing and the Terminal. Choose the topic that's right for you.
            </p>
            <a href="https://auth.jenvu.com/sign-in" className="mt-7 inline-block rounded-full bg-home-accent px-6 py-3 text-[16px] font-medium text-home-accent-foreground hover:opacity-90">
              Sign up
            </a>
          </div>
          <div className="rounded-lg bg-gc-canvas p-6">
            <p className="text-[15px] text-gc-ink-muted">Looking for something else?</p>
            <p className="mt-6 text-[15px] leading-relaxed">
              Talk directly with our team about partnerships, press or anything else on the{" "}
              <Link to="/contact" className="text-gc-blue-deep underline">Contact page</Link>.
            </p>
          </div>
        </section>

        {/* PLATFORM GUIDES — homepage links jump to these by #id */}
        <section className="border-t border-gc-line py-14">
          <h2 className="text-[34px] tracking-tight">Platform guides</h2>
          <p className="mt-4 line-clamp-3 max-w-[830px] text-[16px] text-gc-ink-muted">Quick answers on the main Jenvu tools.</p>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {SUPPORT_GUIDES.map((g) => (
              <div key={g.id} id={g.id} className={`scroll-mt-28 rounded-lg border p-6 transition ${hash === g.id ? "border-gc-blue-deep bg-gc-sky" : "border-gc-line"}`}>
                <h3 className="line-clamp-2 text-[20px] leading-snug">{g.title}</h3>
                <p className="mt-3 line-clamp-3 text-[16px] leading-relaxed text-gc-ink-muted">{g.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FILTER + CONTENT */}
        <section className="grid gap-6 pb-16 lg:grid-cols-[307px_1fr]">
          <aside className="h-fit rounded-lg border border-gc-line bg-background shadow-sm lg:sticky lg:top-24">
            <div className="border-b border-gc-line px-6 py-6 text-[13px] uppercase tracking-wide text-gc-ink-muted">Filter by</div>
            <button type="button" onClick={() => setFiltersOpen((o) => !o)} className="flex w-full items-center justify-between px-6 py-6 text-[15px]">
              Filters <ChevronDown className={`h-5 w-5 transition ${filtersOpen ? "rotate-180" : ""}`} />
            </button>
            {filtersOpen && (
              <div className="space-y-5 px-6 pb-7">
                {collections.map((c) => (
                  <label key={c.slug} className="flex cursor-pointer items-center gap-4 text-[16px] text-gc-ink-muted">
                    <input type="checkbox" checked={picked.includes(c.slug)} onChange={() => toggle(c.slug)} className="h-[18px] w-[18px] accent-[var(--gc-blue-deep)]" />
                    {c.title}
                  </label>
                ))}
              </div>
            )}
          </aside>

          <div className="min-w-0">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gc-ink-muted" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && results[0]) {
                    navigate({ to: "/help/$collection/$slug", params: { collection: results[0].collection.slug, slug: results[0].article.slug } });
                  }
                }}
                placeholder="Search"
                aria-label="Search help articles"
                className="w-full rounded-[4px] border border-gc-ink-muted/60 bg-background py-4 pl-12 pr-12 text-[16px] outline-none focus:border-gc-blue-deep"
              />
              <Send className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gc-ink-muted" />
              {q.trim() && (
                <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-lg border border-gc-line bg-background shadow-lg">
                  {results.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-gc-ink-muted">No articles match "{q}".</div>
                  ) : (
                    results.map(({ collection, article }) => (
                      <Link key={`${collection.slug}/${article.slug}`} to="/help/$collection/$slug" params={{ collection: collection.slug, slug: article.slug }} className="flex items-start justify-between gap-4 border-b border-gc-line px-4 py-3 last:border-b-0 hover:bg-gc-canvas">
                        <div>
                          <div className="text-sm font-medium">{article.title}</div>
                          <div className="mt-1 text-xs text-gc-ink-muted">{collection.title}</div>
                        </div>
                        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-gc-ink-muted" />
                      </Link>
                    ))
                  )}
                </div>
              )}
            </div>

            {shown.map((c) => (
              <div key={c.slug} className="mt-14 border-b border-gc-line pb-12 last:border-b-0">
                <h2 className="text-[34px] tracking-tight">{c.title}</h2>
                <p className="mt-4 line-clamp-3 text-[16px] text-gc-ink-muted">
                  {c.description}{" "}
                  <Link to="/help/$collection" params={{ collection: c.slug }} className="text-gc-blue-deep underline">See all {c.articles.length} articles</Link>.
                </p>
                <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {c.articles.slice(0, 6).map((a) => (
                    <Link key={a.slug} to="/help/$collection/$slug" params={{ collection: c.slug, slug: a.slug }} className="rounded-lg border border-gc-line p-6 transition hover:shadow-md">
                      <div className="line-clamp-2 text-[20px] leading-snug">{a.title}</div>
                      <div className="mt-3 text-[16px] leading-relaxed text-gc-ink-muted line-clamp-3">{a.summary}</div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="pb-20">
          <h2 className="text-[28px] tracking-tight">Frequently asked support questions</h2>
          <div className="mt-6 flex justify-end">
            <button type="button" onClick={() => setOpen(allOpen ? [] : faqs.map((_, i) => i))} className="flex items-center gap-2 text-[16px] text-gc-blue-deep">
              {allOpen ? "Collapse all" : "Expand all"} <ChevronsUpDown className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-4 border-t-2 border-gc-line">
            {faqs.map((f, i) => {
              const isOpen = open.includes(i);
              return (
                <div key={f.q} className="border-b-2 border-gc-line">
                  <button type="button" onClick={() => setOpen((o) => (isOpen ? o.filter((x) => x !== i) : [...o, i]))} className="flex w-full items-center justify-between py-7 text-left text-[19px] text-gc-blue-deep">
                    {f.q}
                    <ChevronDown className={`h-6 w-6 shrink-0 transition ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isOpen && <p className="border-t-2 border-gc-line py-8 text-[16px] leading-relaxed text-gc-ink-muted">{f.a}</p>}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <NextStep />
      <BlogFooter />
    </div>
  );
}
