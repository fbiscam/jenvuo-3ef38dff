import SiteHeader from "@/components/SiteHeader";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import type { Tables } from "@/integrations/supabase/types";
import InsightsFooter from "@/components/insights/InsightsFooter";
import { BlogHeroArt, BlogTile } from "@/components/insights/BlogArt";

type Insight = Tables<"insights">;

// Format date deterministically in UTC so SSR and client match exactly.
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

export const insightsQueryOptions = queryOptions({
  queryKey: ["insights"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("insights")
      .select("id, title, slug, excerpt, category, image_url, is_breaking, published_at, created_at, updated_at, indexed_at")
      .order("published_at", { ascending: false });

    if (error) throw error;
    return data as Insight[];
  },
});

export const Route = createFileRoute("/insights/")({
  head: () => ({
    meta: [
      { title: "News — Jenvu Gold Insights and Updates" },
      {
        name: "description",
        content:
          "Our insights — daily Gold, BTC/USD and EUR/USD analysis, ICT and SMC briefings, and institutional market updates narrated by the Jenvu terminal engine.",
      },
      { property: "og:title", content: "Our Insights — Jenvu" },
      {
        property: "og:description",
        content: "Daily Gold, BTC/USD and EUR/USD analysis, ICT and SMC briefings, and institutional market updates from the Jenvu desk.",
      },
      { property: "og:url", content: "https://blogs.jenvu.com/" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Our Insights — Jenvu" },
      { name: "twitter:description", content: "Daily Gold, BTC/USD and EUR/USD analysis, ICT and SMC briefings from the Jenvu desk." },
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
            "Daily Gold, BTC/USD and EUR/USD analysis, ICT and SMC briefings, and institutional market updates from the Jenvu desk.",
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

const SANS = "font-['Google_Sans_Flex','Google_Sans','Product_Sans','Poppins',system-ui,sans-serif]";

const LIST_STEP = 20;

function InsightsPage() {
  const { data: insights } = useSuspenseQuery(insightsQueryOptions);
  const [shown, setShown] = useState(LIST_STEP);

  const top = insights[0];
  const featured = insights.slice(1, 5);
  const rest = insights.slice(5);
  const visible = rest.slice(0, shown);

  return (
    <div className={`min-h-dvh w-full bg-background text-gc-ink ${SANS} antialiased`}>
      <SiteHeader />

      <div className="jenvu-blog-content">
        <main className="site-edge pb-16 pt-12 sm:pt-20">
          <h1 className="sr-only">Jenvu news and Gold market insights</h1>

          {/* TOP STORY */}
          {top && (
            <section className="grid items-center gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
              <div className="order-2 lg:order-1">
                <div className="text-[14px] text-gc-ink-muted">{fmtDate(top.published_at)}</div>
                <h2 className="mt-4 text-[34px] font-normal leading-[1.1] tracking-[-0.8px] text-gc-ink sm:text-[46px]">
                  {top.title}
                </h2>
                {top.excerpt && (
                  <p className="mt-5 line-clamp-3 text-[17px] leading-[1.6] text-gc-ink">{top.excerpt}</p>
                )}
                <Link
                  to="/insights/$slug"
                  params={{ slug: top.slug }}
                  className="mt-8 inline-flex h-11 items-center gap-2 rounded-full bg-foreground px-5 text-[14px] font-medium text-background transition hover:opacity-90"
                >
                  Read More <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
              <Link to="/insights/$slug" params={{ slug: top.slug }} className="order-1 block lg:order-2" aria-label={top.title}>
                <BlogHeroArt title={top.title} className="aspect-[16/9] w-full lg:aspect-[16/8.4]" />
              </Link>
            </section>
          )}

          {/* FEATURED */}
          {featured.length > 0 && (
            <section className="mt-16 grid gap-x-6 gap-y-10 sm:mt-20 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((item) => (
                <Link key={item.id} to="/insights/$slug" params={{ slug: item.slug }} className="group block min-w-0">
                  <BlogTile title={item.title} category={item.category} className="aspect-[1.9/1] w-full transition group-hover:opacity-90" />
                  <div className="mt-4 flex items-center gap-2 text-[12px] text-gc-ink">
                    <span>{item.category}</span>
                    <span className="text-gc-ink-muted">·</span>
                    <span>{fmtDate(item.published_at)}</span>
                  </div>
                  <h3 className="mt-2 text-[16px] leading-[1.35] text-gc-ink">
                    <span className="group-hover:underline group-hover:underline-offset-4">{item.title}</span>
                    <ChevronRight className="ml-1 inline h-3.5 w-3.5 text-gc-ink-muted" />
                  </h3>
                </Link>
              ))}
            </section>
          )}

          {/* ALL POSTS */}
          {rest.length > 0 && (
            <section className="mt-20 sm:mt-24">
              <h2 className="text-[28px] font-normal tracking-[-0.4px] text-gc-ink sm:text-[32px]">All posts</h2>
              <ul className="mt-8 border-t border-gc-line sm:mt-10">
                {visible.map((item) => (
                  <li key={item.id} className="border-b border-gc-line">
                    <Link
                      to="/insights/$slug"
                      params={{ slug: item.slug }}
                      className="group flex flex-col gap-1.5 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-10"
                    >
                      <div className="min-w-0">
                        <div className="text-[16px] font-medium text-gc-ink group-hover:underline group-hover:underline-offset-4">{item.title}</div>
                        {item.excerpt && (
                          <p className="mt-1 line-clamp-2 text-[14px] leading-[1.55] text-gc-ink-muted sm:line-clamp-1">{item.excerpt}</p>
                        )}
                      </div>
                      <div className="shrink-0 text-[13px] text-gc-ink-muted">{fmtDate(item.published_at)}</div>
                    </Link>
                  </li>
                ))}
              </ul>
              {rest.length > shown && (
                <div className="mt-10 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setShown((n) => n + LIST_STEP)}
                    className="h-11 rounded-full bg-gc-pill px-6 text-[14px] font-medium text-foreground hover:brightness-95"
                  >
                    Show more posts
                  </button>
                </div>
              )}
            </section>
          )}

          {insights.length === 0 && (
            <div className="py-24 text-center text-[15px] text-gc-ink-muted">No posts yet.</div>
          )}

          {/* NEWSLETTER */}
          <section id="subscribe" className="mt-24 scroll-mt-24 border-t border-gc-line pt-14 text-center">
            <h2 className="text-[24px] font-normal leading-[1.25] text-gc-ink sm:text-[28px]">Get new posts by email</h2>
            <p className="mx-auto mb-8 mt-3 max-w-xl text-[15px] leading-[1.6] text-gc-ink-muted">
              One short email when a new Gold briefing goes live. Unsubscribe any time.
            </p>
            <SubscribeForm />
          </section>
        </main>
      </div>

      <InsightsFooter />
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
      <div className="mx-auto max-w-md rounded-md border border-gc-line bg-background px-5 py-4 text-[14px] text-gc-ink">
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
        className="h-12 whitespace-nowrap rounded-full bg-foreground px-6 text-[15px] font-medium text-background transition hover:opacity-90 disabled:opacity-60"
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
