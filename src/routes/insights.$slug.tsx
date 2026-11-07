import SiteHeader from "@/components/SiteHeader";
import { createFileRoute, Link, useParams, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ChevronRight, Twitter, Linkedin, Facebook, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Tables } from "@/integrations/supabase/types";
import InsightsFooter from "@/components/insights/InsightsFooter";
import { BlogTile } from "@/components/insights/BlogArt";
import { insightCoverUrl } from "@/lib/insight-cover";

type Insight = Tables<"insights">;

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

const insightDetailQueryOptions = (slug: string) => queryOptions({
  queryKey: ["insight", slug],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("insights")
      .select("id, title, slug, excerpt, content, category, image_url, is_breaking, published_at, created_at, updated_at, indexed_at")
      .eq("slug", slug)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw notFound();
    return data as Insight;
  },
});

export const Route = createFileRoute("/insights/$slug")({
  head: ({ params, loaderData }) => {
    const data = loaderData as Insight | undefined;
    const url = `https://blogs.jenvu.com/${params.slug}`;
    const title = data ? `${data.title} — Jenvu` : "Market Insight — Jenvu";
    const desc = data?.excerpt || "Institutional market analysis from Jenvu.";
    const imagePath = data ? insightCoverUrl(data.title, data.category, data.image_url) : null;
    const img = data?.image_url?.startsWith("http") ? data.image_url : null; void imagePath;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: data?.title || title },
        { property: "og:description", content: desc },
        ...(img ? [{ property: "og:image", content: img }] : []),
        { property: "og:url", content: url },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: data?.title || title },
        { name: "twitter:description", content: desc },
        ...(img ? [{ name: "twitter:image", content: img }] : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: data
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Article",
                headline: data.title,
                description: data.excerpt,
                ...(img ? { image: [img] } : {}),
                datePublished: data.published_at,
                dateModified: data.updated_at || data.published_at,
                author: { "@type": "Organization", name: "Jenvu" },
                publisher: {
                  "@type": "Organization",
                  name: "Jenvu",
                  logo: { "@type": "ImageObject", url: "https://jenvu.com/favicon.png" },
                },
                mainEntityOfPage: { "@type": "WebPage", "@id": url },
                articleSection: data.category,
              }),
            },
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "BreadcrumbList",
                itemListElement: [
                  { "@type": "ListItem", position: 1, name: "Home", item: "https://jenvu.com/" },
                  { "@type": "ListItem", position: 2, name: "Insights", item: "https://blogs.jenvu.com/" },
                  { "@type": "ListItem", position: 3, name: data.title, item: url },
                ],
              }),
            },
          ]
        : [],
    };
  },
  loader: ({ params, context }) => context.queryClient.ensureQueryData(insightDetailQueryOptions(params.slug)),
  component: InsightDetailPage,
  errorComponent: ({ error, reset }) => (
    <div className="min-h-dvh w-full bg-[#FAFAFA] text-zinc-900 flex flex-col items-center justify-center px-6 text-center">
      <div className="text-xs font-mono uppercase tracking-widest text-red-600 mb-3">Report unavailable</div>
      <h1 className="text-2xl font-semibold mb-3">We couldn't load this briefing.</h1>
      <p className="text-sm text-zinc-500 max-w-md mb-6">{(error as Error | undefined)?.message || "The article may have moved or the connection failed."}</p>
      <div className="flex gap-3">
        <button onClick={() => reset()} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white">Retry</button>
        <Link to="/insights" className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium">Back to insights</Link>
      </div>
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-dvh w-full bg-[#FAFAFA] text-zinc-900 flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-semibold mb-3">Briefing not found</h1>
      <Link to="/insights" className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white">Back to insights</Link>
    </div>
  ),
});


const MONO = "font-sans";
const SANS = "font-['Google_Sans_Flex','Google_Sans','Product_Sans','Poppins',system-ui,sans-serif]";

function InsightDetailPage() {
  const { slug } = useParams({ from: "/insights/$slug" });
  const { data: insight } = useSuspenseQuery(insightDetailQueryOptions(slug));
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setProgress(max > 0 ? Math.min(100, Math.max(0, (h.scrollTop / max) * 100)) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [slug]);

  const pageUrl = `https://blogs.jenvu.com/${insight.slug}`;
  const shareLinks = [
    { label: "Share on X", Icon: Twitter, href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent(insight.title)}` },
    { label: "Share on LinkedIn", Icon: Linkedin, href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}` },
    { label: "Share on Facebook", Icon: Facebook, href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}` },
    { label: "Share by email", Icon: Mail, href: `mailto:?subject=${encodeURIComponent(insight.title)}&body=${encodeURIComponent(pageUrl)}` },
  ];

  return (
    <div className={`min-h-dvh w-full bg-background text-gc-ink ${SANS} antialiased`}>
      <div aria-hidden="true" className="fixed inset-x-0 top-0 z-[60] h-[2px] bg-transparent">
        <div className="h-full bg-foreground transition-[width] duration-150" style={{ width: `${progress}%` }} />
      </div>
      <SiteHeader />

      <div className="jenvu-blog-content">
        <div className="mx-auto max-w-[920px] px-5 sm:px-8">
          <div className="flex items-center justify-between gap-4 pt-10 text-[14px] text-gc-ink-muted sm:pt-14">
            <Link to="/insights" className="inline-flex items-center gap-2 hover:text-gc-ink">
              <ArrowLeft className="h-4 w-4" /> Back to news
            </Link>
            <span>{fmtDate(insight.published_at)}</span>
          </div>

          <header className="pb-12 pt-14 text-center sm:pt-20">
            <h1 className="mx-auto max-w-[820px] text-[34px] font-normal leading-[1.12] tracking-[-0.8px] text-gc-ink sm:text-[48px]">
              {insight.title}
            </h1>
            {insight.excerpt && !excerptRepeatsBody(insight.excerpt, insight.content) && (
              <p className="mx-auto mt-6 max-w-[540px] text-[17px] leading-[1.6] text-gc-ink">{insight.excerpt}</p>
            )}
            <div className="mt-6 text-[13px] text-gc-ink-muted">
              {insight.category} · Jenvu Team · {readMinutes(insight.content)} min read
            </div>
          </header>
          <hr className="border-gc-line" />

          <article className="mx-auto max-w-[660px] pb-10 pt-12 text-[16.5px] leading-[1.75] text-gc-ink">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => <h2 className="mb-5 mt-14 text-[28px] font-normal leading-[1.25] text-gc-ink">{children}</h2>,
                h2: ({ children }) => <h2 className="mb-5 mt-14 text-[26px] font-normal leading-[1.3] text-gc-ink">{children}</h2>,
                h3: ({ children }) => <h3 className="mb-4 mt-10 text-[20px] font-normal text-gc-ink">{children}</h3>,
                h4: ({ children }) => <h4 className="mb-3 mt-8 text-[17px] font-medium text-gc-ink">{children}</h4>,
                p: ({ children }) => <p className="mb-5 text-gc-ink">{children}</p>,
                strong: ({ children }) => <strong className="font-semibold text-gc-ink">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
                a: ({ href, children }) => (
                  <a href={href} className="text-gc-ink underline underline-offset-4 hover:opacity-70">{children}</a>
                ),
                ul: ({ children }) => <ul className="my-5 list-disc space-y-2 pl-6 marker:text-gc-ink-muted">{children}</ul>,
                ol: ({ children }) => <ol className="my-5 list-decimal space-y-2 pl-6 marker:text-gc-ink-muted">{children}</ol>,
                li: ({ children }) => <li className="pl-1 text-gc-ink">{children}</li>,
                blockquote: ({ children }) => (
                  <blockquote className="my-8 border-l-2 border-gc-ink pl-5 italic text-gc-ink">{children}</blockquote>
                ),
                hr: () => <hr className="my-12 border-gc-line" />,
                code: ({ children, className }) => {
                  const isBlock = className?.includes("language-");
                  if (isBlock) {
                    return <code className={`${MONO} block text-[13.5px]`}>{children}</code>;
                  }
                  return <code className={`${MONO} rounded bg-gc-surface px-1.5 py-0.5 text-[0.9em] text-gc-ink`}>{children}</code>;
                },
                pre: ({ children }) => <pre className="code-box my-6 overflow-x-auto rounded-xl p-4 text-[13px] leading-relaxed">{children}</pre>,
                table: ({ children }) => (
                  <div className="my-8 -mx-1 overflow-x-auto">
                    <table className="w-full min-w-[480px] border-collapse text-[14px]">{children}</table>
                  </div>
                ),
                thead: ({ children }) => <thead>{children}</thead>,
                th: ({ children }) => <th className="border-b border-gc-line px-2 py-3 text-left font-normal text-gc-ink">{children}</th>,
                td: ({ children }) => <td className="border-b border-gc-line px-2 py-3 align-top text-gc-ink">{children}</td>,
                img: ({ src, alt }) => <img src={src} alt={alt} className="my-8 w-full rounded-xl" />,
              }}
            >
              {insight.content}
            </ReactMarkdown>

            <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-gc-line pt-6">
              <Link to="/insights" className="inline-flex items-center gap-2 text-[14px] text-gc-ink-muted hover:text-gc-ink">
                <ArrowLeft className="h-4 w-4" /> Back to news
              </Link>
              <div className="flex items-center gap-5">
                {shareLinks.map(({ label, Icon, href }) => (
                  <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="text-gc-ink-muted hover:text-gc-ink">
                    <Icon className="h-[18px] w-[18px]" />
                  </a>
                ))}
              </div>
            </div>
          </article>
        </div>

        <RelatedArticles slug={insight.slug} />
      </div>

      <InsightsFooter />
    </div>
  );
}

/** Skip the subtitle when it is just the cut-off start of the first paragraph. */
function excerptRepeatsBody(excerpt: string, content: string | null | undefined): boolean {
  const head = excerpt.replace(/(\.\.\.|…)\s*$/, "").trim().slice(0, 80);
  return !!head && (content || "").replace(/^#.*\n+/, "").trimStart().startsWith(head);
}

function readMinutes(content: string | null | undefined): number {
  const words = (content || "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

function RelatedArticles({ slug }: { slug: string }) {
  const { data } = useQuery({
    queryKey: ["insights-related", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insights")
        .select("id, title, slug, category, published_at")
        .neq("slug", slug)
        .order("published_at", { ascending: false })
        .limit(4);
      if (error) throw error;
      return data;
    },
  });
  if (!data?.length) return null;
  return (
    <section className="site-edge border-t border-gc-line py-14">
      <h2 className="text-[24px] font-normal text-gc-ink">More news</h2>
      <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {data.map((a) => (
          <Link key={a.id} to="/insights/$slug" params={{ slug: a.slug }} className="group block min-w-0">
            <BlogTile title={a.title} category={a.category} className="aspect-[1.9/1] w-full transition group-hover:opacity-90" />
            <div className="mt-4 flex items-center gap-2 text-[12px] text-gc-ink">
              <span>{a.category}</span>
              <span className="text-gc-ink-muted">·</span>
              <span>{fmtDate(a.published_at)}</span>
            </div>
            <h3 className="mt-2 text-[16px] leading-[1.35] text-gc-ink">
              <span className="group-hover:underline group-hover:underline-offset-4">{a.title}</span>
              <ChevronRight className="ml-1 inline h-3.5 w-3.5 text-gc-ink-muted" />
            </h3>
          </Link>
        ))}
      </div>
    </section>
  );
}
