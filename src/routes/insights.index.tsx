import SiteHeader from "@/components/SiteHeader";
import HeaderAuthButtons from "@/components/HeaderAuthButtons";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import type { Tables } from "@/integrations/supabase/types";
import SiteFooter from "@/components/SiteFooter";
import { insightCoverUrl } from "@/lib/insight-cover";

type Insight = Tables<"insights">;

// Format date deterministically in UTC so SSR and client match exactly.
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmtUTC(iso: string, kind: "full" | "compact") {
  const d = new Date(iso);
  const mo = MONTHS[d.getUTCMonth()];
  const day = d.getUTCDate();
  const yr = d.getUTCFullYear();
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return kind === "full"
    ? `${mo} ${day}, ${yr} · ${hh}:${mm} UTC`
    : `${hh}:${mm} UTC · ${mo} ${day}`;
}

export const insightsQueryOptions = queryOptions({
  queryKey: ["insights"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("insights")
      .select("id, title, slug, excerpt, content, category, image_url, is_breaking, published_at, created_at, updated_at, indexed_at")
      .order("published_at", { ascending: false });

    if (error) throw error;
    return data as Insight[];
  },
});

export const Route = createFileRoute("/insights/")({
  head: () => ({
    meta: [
      { title: "Market Insights — Jenvu" },
      {
        name: "description",
        content:
          "Our insights — daily gold analysis, ICT and SMC briefings, and institutional market updates narrated by the Jenvu terminal engine.",
      },
      { property: "og:title", content: "Our Insights — Jenvu" },
      {
        property: "og:description",
        content: "Daily gold analysis, ICT and SMC briefings, and institutional market updates from the Jenvu desk.",
      },
      { property: "og:url", content: "https://blogs.jenvu.com/" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Our Insights — Jenvu" },
      { name: "twitter:description", content: "Daily gold analysis, ICT and SMC briefings from the Jenvu desk." },
    ],
    links: [{ rel: "canonical", href: "https://blogs.jenvu.com/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Market Insights",
          description:
            "Daily gold analysis, ICT and SMC briefings, and institutional market updates from the Jenvu desk.",
          url: "https://blogs.jenvu.com/",
          isPartOf: { "@type": "WebSite", name: "Jenvu", url: "https://jenvu.com/" },
        }),
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(insightsQueryOptions),
  component: InsightsPage,
  errorComponent: ({ error }) => (
    <div className="min-h-dvh w-full bg-[#FAFAFA] text-zinc-900 flex flex-col items-center justify-center px-6 text-center">
      <div className="text-xs font-mono uppercase tracking-widest text-red-600 mb-3">Insights unavailable</div>
      <h1 className="text-2xl font-semibold mb-3">We couldn't load the insights feed.</h1>
      <p className="text-sm text-zinc-500 max-w-md">{(error as Error | undefined)?.message || "Please refresh and try again."}</p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-dvh w-full bg-[#FAFAFA] text-zinc-900 flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-semibold mb-3">Insights not found</h1>
    </div>
  ),
});

const MONO = "font-['JetBrains_Mono',ui-monospace,monospace]";
const SANS = "font-['Google_Sans','Product_Sans','Poppins',system-ui,sans-serif]";

const PAGE_SIZE = 9;

function InsightsPage() {
  const { data: insights } = useSuspenseQuery(insightsQueryOptions);

  // Ticker: any breaking + most recent items (outsourced top-bar feed)
  const tickerItems = (() => {
    const breaking = insights.filter((i) => i.is_breaking);
    const recent = insights.slice(0, 8);
    const seen = new Set<string>();
    return [...breaking, ...recent].filter((i) => {
      if (seen.has(i.id)) return false;
      seen.add(i.id);
      return true;
    }).slice(0, 10);
  })();

  const [filter, setFilter] = useState<"latest" | "gold" | "macro">("latest");
  const [page, setPage] = useState(1);
  const filters: { id: typeof filter; label: string }[] = [
    { id: "latest", label: "Latest" },
    { id: "gold", label: "Gold" },
    { id: "macro", label: "Macro" },
  ];

  const filtered = useMemo(() => {
    if (filter === "latest") return insights;
    const goldCats = ["gold", "analysis", "ict", "smc", "strategy", "institutional"];
    const macroCats = ["market news", "education", "ai"];
    const match = filter === "gold" ? goldCats : macroCats;
    return insights.filter((i) => match.includes((i.category || "").toLowerCase()));
  }, [insights, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);

  // On page 1 use the first item as the featured hero; grid shows the rest of the page.
  const featured = currentPage === 1 ? pageItems[0] : undefined;
  const remaining = currentPage === 1 ? pageItems.slice(1) : pageItems;

  const goToPage = (n: number) => {
    setPage(Math.min(Math.max(1, n), totalPages));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const onFilterChange = (id: typeof filter) => {
    setFilter(id);
    setPage(1);
  };

  const coverProps = (item: Insight) => ({
    src: insightCoverUrl(item.title, item.category, item.image_url),
    alt: item.title,
    width: 1280,
    height: 720,
    onError: (e: React.SyntheticEvent<HTMLImageElement>) => {
      const t = e.currentTarget;
      t.onerror = null;
      t.src = insightCoverUrl(item.title, item.category);
    },
  });

  return (
    <div className={`min-h-dvh w-full bg-background text-gc-ink ${SANS} antialiased`}>
      <SiteHeader />

      <div className="jenvu-home-content">
        {/* HERO */}
        <section className="bg-gc-canvas">
          <div className="mx-auto max-w-[1200px] px-5 py-14 sm:px-8 sm:py-16">
            <div className="text-[14px] font-medium text-gc-blue">Jenvu Blog</div>
            <h1 className="mt-3 max-w-[760px] text-[36px] font-normal leading-[1.15] tracking-[-0.5px] text-gc-ink sm:text-[48px]">
              Gold market insights and product news
            </h1>
            <p className="mt-4 max-w-[680px] text-[16px] leading-[1.6] text-gc-ink-muted sm:text-[18px]">
              Daily XAU/USD analysis, ICT and SMC guides, and updates from the Jenvu team.
            </p>
            <div className="mt-8 flex flex-wrap gap-2" role="tablist" aria-label="Filter articles">
              {filters.map((f) => {
                const active = filter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => onFilterChange(f.id)}
                    className={`h-9 rounded-full border px-4 text-[14px] font-medium transition-colors ${
                      active
                        ? "border-gc-nav-active bg-gc-nav-active text-gc-blue-deep"
                        : "border-gc-line bg-background text-gc-ink hover:bg-gc-surface"
                    }`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <main className="mx-auto max-w-[1200px] px-5 py-12 sm:px-8 sm:py-16">
          {/* FEATURED */}
          {featured && (
            <Link
              to="/insights/$slug"
              params={{ slug: featured.slug }}
              className="group mb-14 grid overflow-hidden rounded-3xl border border-gc-line bg-background transition hover:shadow-md lg:grid-cols-2"
            >
              <div className="aspect-[16/10] overflow-hidden bg-gc-surface lg:aspect-auto lg:min-h-[340px]">
                <img {...coverProps(featured)} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              </div>
              <div className="flex flex-col justify-center p-7 sm:p-10">
                <div className="text-[13px] font-medium text-gc-blue">Featured · {featured.category}</div>
                <h2 className="mt-3 line-clamp-3 text-[26px] font-normal leading-[1.25] text-gc-ink sm:text-[32px]">
                  {featured.title}
                </h2>
                <p className="mt-4 line-clamp-3 text-[15px] leading-[1.65] text-gc-ink-muted">{featured.excerpt}</p>
                <div className="mt-6 flex items-center justify-between gap-4">
                  <span className="text-[13px] text-gc-ink-muted">{fmtUTC(featured.published_at, "full")}</span>
                  <span className="text-[14px] font-medium text-gc-blue group-hover:underline">Read article →</span>
                </div>
              </div>
            </Link>
          )}

          <h2 className="mb-6 text-[22px] font-normal text-gc-ink sm:text-[26px]">
            {filter === "latest" ? "Latest articles" : filter === "gold" ? "Gold analysis" : "Macro and education"}
          </h2>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {remaining.map((item) => (
              <Link
                key={item.id}
                to="/insights/$slug"
                params={{ slug: item.slug }}
                className="group flex flex-col overflow-hidden rounded-2xl border border-gc-line bg-background transition hover:shadow-md"
              >
                <div className="aspect-video overflow-hidden bg-gc-surface">
                  <img {...coverProps(item)} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <div className="text-[13px] font-medium text-gc-blue">{item.category}</div>
                  <h3 className="mt-2 line-clamp-2 min-h-[3.2rem] text-[18px] font-medium leading-[1.4] text-gc-ink">
                    {item.title}
                  </h3>
                  <p className="mt-2 line-clamp-3 text-[14px] leading-[1.6] text-gc-ink-muted">{item.excerpt}</p>
                  <div className="mt-auto pt-5 text-[13px] text-gc-ink-muted">{fmtUTC(item.published_at, "full")}</div>
                </div>
              </Link>
            ))}
          </div>

          {remaining.length === 0 && !featured && (
            <div className="py-16 text-center text-[15px] text-gc-ink-muted">No articles in this category yet.</div>
          )}

          {totalPages > 1 && (
            <nav aria-label="Blog pagination" className="mt-14 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="h-10 rounded-full border border-gc-line bg-background px-4 text-[14px] font-medium text-gc-ink hover:bg-gc-surface disabled:cursor-not-allowed disabled:opacity-40"
              >
                ← Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => goToPage(n)}
                  aria-current={n === currentPage ? "page" : undefined}
                  className={`h-10 min-w-10 rounded-full px-3 text-[14px] font-medium transition-colors ${
                    n === currentPage ? "bg-gc-blue text-gc-on-blue" : "text-gc-ink hover:bg-gc-surface"
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="h-10 rounded-full border border-gc-line bg-background px-4 text-[14px] font-medium text-gc-ink hover:bg-gc-surface disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next →
              </button>
            </nav>
          )}

          {/* NEWSLETTER */}
          <section className="mt-20 rounded-3xl bg-gc-canvas px-6 py-12 text-center sm:px-12">
            <h2 className="text-[26px] font-normal leading-[1.25] text-gc-ink sm:text-[32px]">Get new articles by email</h2>
            <p className="mx-auto mb-8 mt-3 max-w-xl text-[15px] leading-[1.6] text-gc-ink-muted">
              One short email when a new gold briefing goes live. Unsubscribe any time.
            </p>
            <SubscribeForm />
          </section>
        </main>
      </div>

      <SiteFooter />
    </div>
  );
}

const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .max(255, "Too long")
  .email("Enter a valid email");

function SubscribeForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid email");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase
        .from("newsletter_subscribers")
        .insert({ email: parsed.data.toLowerCase() });
      if (error) {
        if (error.code === "23505") {
          toast.success("You're already subscribed — briefings on their way.");
          setDone(true);
        } else {
          toast.error("Could not subscribe. Please try again.");
        }
      } else {
        toast.success("Subscribed. Watch your inbox for the next briefing.");
        setDone(true);
        setEmail("");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-gc-line bg-background px-5 py-4 text-[14px] text-gc-ink">
        ✓ You're on the list. Next briefing lands directly in your inbox.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        maxLength={255}
        placeholder="Enter email for daily briefings"
        className="h-12 flex-1 rounded-full border border-gc-line bg-background px-5 text-[15px] text-gc-ink outline-none transition placeholder:text-gc-ink-muted focus:border-gc-blue"
      />
      <button
        type="submit"
        disabled={busy}
        className="h-12 whitespace-nowrap rounded-full bg-gc-blue px-6 text-[15px] font-medium text-gc-on-blue transition hover:bg-gc-blue-hover disabled:opacity-60"
      >
        {busy ? "…" : "Subscribe"}
      </button>
    </form>
  );
}