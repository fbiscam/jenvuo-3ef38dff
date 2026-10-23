import SiteHeader from "@/components/SiteHeader";
import HeaderAuthButtons from "@/components/HeaderAuthButtons";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import type { Tables } from "@/integrations/supabase/types";
import BlogFooter from "@/components/BlogFooter";
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
const SANS = "font-['Google_Sans','Product_Sans','Google Sans',system-ui,sans-serif]";

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

      <div className="jenvu-blog-content">
        {/* HERO */}
        <section className="mx-auto max-w-[1200px] px-5 pb-6 pt-14 text-center sm:px-8 sm:pt-16">
          <img src="/favicon.png" alt="" width={56} height={56} className="mx-auto h-14 w-14 object-contain" />
          <h1 className="mx-auto mt-5 max-w-[960px] text-[34px] font-medium leading-[1.15] tracking-[-0.5px] text-gc-ink sm:text-[50px]">
            <span className="text-gc-blue">News, tips, and insights</span> to sharpen your gold trading
          </h1>
          <div className="mt-8 flex flex-wrap justify-center gap-2" role="tablist" aria-label="Filter articles">
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
        </section>

        <main className="mx-auto max-w-[1200px] px-5 py-10 sm:px-8 sm:py-12">
          {/* FEATURED */}
          {featured && (
            <Link
              to="/insights/$slug"
              params={{ slug: featured.slug }}
              className="group mb-14 grid items-center gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,9fr)] lg:gap-14"
            >
              <div className="order-2 lg:order-1">
                <Chip>{featured.category}</Chip>
                <h2 className="mt-4 text-[26px] font-normal leading-[1.3] text-gc-ink group-hover:text-gc-blue sm:text-[30px]">
                  {featured.title}
                </h2>
                {featured.excerpt && (
                  <p className="mt-4 line-clamp-3 text-[16px] leading-[1.7] text-gc-ink-muted">{featured.excerpt}</p>
                )}
                <Byline item={featured} />
              </div>
              <div className="order-1 aspect-[16/10] overflow-hidden rounded-[28px] bg-gc-ink lg:order-2">
                <img {...coverProps(featured)} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
              </div>
            </Link>
          )}

          {/* NEWS IN SHORT */}
          <section className="mb-16 rounded-3xl bg-gc-canvas px-6 py-10 sm:px-12">
            <h2 className="text-[22px] font-medium text-gc-ink">News in short</h2>
            <p className="mt-2 max-w-[720px] text-[16px] leading-[1.6] text-gc-ink-muted">
              A quick take on gold briefings, product updates and trading guides from Jenvu in one handy place. Updated daily.
            </p>
            <a href="#subscribe" className="mt-6 inline-flex h-11 items-center rounded-full border border-gc-ink-muted px-6 text-[15px] font-medium text-gc-blue hover:bg-background">
              Click here
            </a>
          </section>

          <h2 className="border-b border-gc-line pb-6 text-[26px] font-normal text-gc-ink sm:text-[30px]">
            {filter === "latest" ? "All stories" : filter === "gold" ? "Gold analysis" : "Macro and education"}
          </h2>

          <div>
            {remaining.map((item) => (
              <Link
                key={item.id}
                to="/insights/$slug"
                params={{ slug: item.slug }}
                className="group flex items-center gap-6 border-b border-gc-line py-8"
              >
                <div className="min-w-0 flex-1">
                  <Chip>{item.category}</Chip>
                  <h3 className="mt-3 text-[20px] font-normal leading-[1.35] text-gc-ink group-hover:text-gc-blue sm:text-[26px]">
                    {item.title}
                  </h3>
                  <Byline item={item} />
                </div>
                <div className="hidden aspect-[16/9] w-[246px] shrink-0 overflow-hidden rounded-2xl bg-gc-surface sm:block">
                  <img {...coverProps(item)} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
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
          <section id="subscribe" className="mt-20 scroll-mt-24 rounded-3xl bg-gc-canvas px-6 py-12 text-center sm:px-12">
            <h2 className="text-[26px] font-normal leading-[1.25] text-gc-ink sm:text-[32px]">Get new articles by email</h2>
            <p className="mx-auto mb-8 mt-3 max-w-xl text-[15px] leading-[1.6] text-gc-ink-muted">
              One short email when a new gold briefing goes live. Unsubscribe any time.
            </p>
            <SubscribeForm />
          </section>
        </main>
      </div>

      <BlogFooter />
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
export function readMinutes(content: string | null | undefined): number {
  const words = (content || "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex rounded border border-gc-line px-2 py-1 text-[14px] leading-none text-gc-ink">{children}</span>
  );
}

function Byline({ item }: { item: Insight }) {
  return (
    <div className="mt-3 text-[14px] text-gc-ink-muted">
      By Jenvu Team • {readMinutes(item.content)}-minute read • {fmtUTC(item.published_at, "full")}
    </div>
  );
}
