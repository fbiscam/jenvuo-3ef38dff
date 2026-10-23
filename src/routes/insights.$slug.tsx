import SiteHeader from "@/components/SiteHeader";
import HeaderAuthButtons from "@/components/HeaderAuthButtons";
import { createFileRoute, Link, useParams, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Twitter, Linkedin, Facebook, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Tables } from "@/integrations/supabase/types";
import BlogFooter from "@/components/BlogFooter";
import { insightCoverUrl } from "@/lib/insight-cover";

type Insight = Tables<"insights">;

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
function fmtUTCLong(iso: string) {
  const d = new Date(iso);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()} · ${hh}:${mm} UTC`;
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


const MONO = "font-['JetBrains_Mono',ui-monospace,monospace]";
const SANS = "font-['Google_Sans','Product_Sans','Google Sans',system-ui,sans-serif]";

function InsightDetailPage() {
  const { slug } = useParams({ from: "/insights/$slug" });
  const { data: insight } = useSuspenseQuery(insightDetailQueryOptions(slug));
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const scrolled = h.scrollTop;
      const max = h.scrollHeight - h.clientHeight;
      setProgress(max > 0 ? Math.min(100, Math.max(0, (scrolled / max) * 100)) : 0);
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
  const ShareRail = () => (
    <div className="flex flex-col items-center gap-6">
      {shareLinks.map(({ label, Icon, href }) => (
        <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="text-gc-ink hover:text-gc-blue">
          <Icon className="h-5 w-5" />
        </a>
      ))}
    </div>
  );

  return (
    <div className={`min-h-dvh w-full bg-background text-gc-ink ${SANS} antialiased`}>
      <div aria-hidden="true" className="fixed inset-x-0 top-0 z-[60] h-[3px] bg-transparent">
        <div className="h-full bg-gc-blue transition-[width] duration-150" style={{ width: `${progress}%` }} />
      </div>
      <SiteHeader />

      <div className="jenvu-blog-content">
        <section className="mx-auto max-w-[1000px] px-5 pb-10 pt-14 text-center sm:px-8 sm:pt-16">
          <span className="inline-flex rounded border border-gc-line px-2 py-1 text-[14px] leading-none text-gc-ink">{insight.category}</span>
          <h1 className="mt-5 text-[32px] font-medium leading-[1.2] tracking-[-0.5px] text-gc-ink sm:text-[46px]">
            {insight.title}
          </h1>
          <div className="mt-5 text-[14px] text-gc-ink-muted">{fmtUTCLong(insight.published_at)}</div>
        </section>

        <div className="mx-auto grid max-w-[1400px] gap-6 px-5 sm:px-8 lg:grid-cols-[minmax(0,1fr)_48px]">
          <div className="aspect-[16/8] overflow-hidden rounded-[28px] bg-gc-ink">
            <img
              src={insightCoverUrl(insight.title, insight.category, insight.image_url)}
              alt={insight.title}
              width={1280}
              height={720}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="hidden pt-4 lg:block"><ShareRail /></div>
        </div>

        <div className="mt-10 text-center">
          <div className="text-[16px] font-medium text-gc-ink">Jenvu Team</div>
          <div className="text-[15px] text-gc-ink-muted">Gold research desk, Jenvu</div>
        </div>

        <main className="mx-auto grid max-w-[1400px] gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[200px_minmax(0,1fr)_48px] lg:gap-14">
          <aside className="hidden lg:block">
            <div className="sticky top-28">
              <div className="text-[20px] font-medium leading-[1.4] text-gc-ink">Try Jenvu Terminal</div>
              <p className="mt-3 text-[14px] leading-[1.7] text-gc-ink-muted">Access the live gold chart in Jenvu</p>
              <a href="https://auth.jenvu.com/sign-in" className="mt-5 inline-flex h-12 items-center rounded-full bg-gc-blue px-6 text-[16px] font-medium text-gc-on-blue hover:bg-gc-blue-hover">
                Try now
              </a>
            </div>
          </aside>

          <div className="mx-auto w-full max-w-[840px]">
          {insight.excerpt && (
            <p className="mb-8 text-[18px] leading-[1.7] text-gc-ink-muted">{insight.excerpt}</p>
          )}
          <article className="article-body text-[17px] leading-[1.8] text-gc-ink-muted">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => <h2 className="mb-5 mt-14 text-[30px] font-normal leading-[1.25] text-gc-ink">{children}</h2>,
                h2: ({ children }) => <h2 className="mb-5 mt-14 text-[26px] font-normal leading-[1.3] text-gc-ink">{children}</h2>,
                h3: ({ children }) => <h3 className="mb-4 mt-10 text-[21px] font-medium text-gc-ink">{children}</h3>,
                h4: ({ children }) => <h4 className="mb-3 mt-8 text-[17px] font-medium text-gc-ink">{children}</h4>,
                p: ({ children }) => <p className="mb-6 text-gc-ink">{children}</p>,
                strong: ({ children }) => <strong className="font-medium text-gc-ink">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
                a: ({ href, children }) => (
                  <a href={href} className="text-gc-blue underline-offset-4 hover:underline">{children}</a>
                ),
                ul: ({ children }) => <ul className="my-6 list-disc space-y-2 pl-6 marker:text-gc-blue">{children}</ul>,
                ol: ({ children }) => <ol className="my-6 list-decimal space-y-2 pl-6 marker:text-gc-ink-muted">{children}</ol>,
                li: ({ children }) => <li className="pl-1 text-gc-ink">{children}</li>,
                blockquote: ({ children }) => (
                  <blockquote className="my-8 rounded-r-2xl border-l-4 border-gc-blue bg-gc-canvas px-6 py-5 text-gc-ink">{children}</blockquote>
                ),
                hr: () => <hr className="my-12 border-gc-line" />,
                code: ({ children, className }) => {
                  const isBlock = className?.includes("language-");
                  if (isBlock) {
                    return (
                      <code className={`${MONO} my-6 block overflow-x-auto rounded-2xl bg-gc-surface p-5 text-[14px] text-gc-ink`}>{children}</code>
                    );
                  }
                  return <code className={`${MONO} rounded bg-gc-surface px-1.5 py-0.5 text-[0.9em] text-gc-ink`}>{children}</code>;
                },
                pre: ({ children }) => <pre className="my-6">{children}</pre>,
                table: ({ children }) => (
                  <div className="my-8 overflow-x-auto rounded-2xl border border-gc-line">
                    <table className="w-full text-[15px]">{children}</table>
                  </div>
                ),
                thead: ({ children }) => <thead className="bg-gc-surface">{children}</thead>,
                th: ({ children }) => <th className="border-b border-gc-line px-4 py-3 text-left font-medium text-gc-ink">{children}</th>,
                td: ({ children }) => <td className="border-b border-gc-line px-4 py-3 text-gc-ink">{children}</td>,
                img: ({ src, alt }) => <img src={src} alt={alt} className="my-8 w-full rounded-2xl border border-gc-line" />,
              }}
            >
              {insight.content}
            </ReactMarkdown>
          </article>

          <div className="mt-16 border-t border-gc-line pt-8">
            <Link to="/insights" className="text-[15px] font-medium text-gc-blue hover:underline">← Back to all articles</Link>
          </div>
          </div>

          <div className="hidden lg:block"><div className="sticky top-28"><ShareRail /></div></div>
        </main>

        <RelatedArticles slug={insight.slug} />
      </div>

      <BlogFooter />
    </div>
  );
}

function RelatedArticles({ slug }: { slug: string }) {
  const { data } = useQuery({
    queryKey: ["insights-related", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insights")
        .select("id, title, slug, category, content, image_url")
        .neq("slug", slug)
        .order("published_at", { ascending: false })
        .limit(4);
      if (error) throw error;
      return data;
    },
  });
  if (!data?.length) return null;
  return (
    <section className="mx-auto max-w-[1200px] border-t border-gc-line px-5 py-14 sm:px-8">
      <h2 className="text-[20px] font-medium text-gc-ink">Related articles</h2>
      <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {data.map((a) => {
          const words = (a.content || "").trim().split(/\s+/).filter(Boolean).length;
          return (
            <Link key={a.id} to="/insights/$slug" params={{ slug: a.slug }} className="group text-center">
              <div className="aspect-[16/9] overflow-hidden rounded-2xl border border-gc-line bg-gc-surface">
                <img src={insightCoverUrl(a.title, a.category, a.image_url)} alt={a.title} loading="lazy" width={1280} height={720} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              </div>
              <span className="mt-6 inline-flex rounded border border-gc-line px-2 py-1 text-[14px] leading-none text-gc-ink">{a.category}</span>
              <h3 className="mt-3 line-clamp-3 text-[18px] leading-[1.45] text-gc-ink group-hover:text-gc-blue">{a.title}</h3>
              <div className="mt-2 text-[14px] text-gc-ink-muted">By Jenvu Team • {Math.max(1, Math.round(words / 220))}-minute read</div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
