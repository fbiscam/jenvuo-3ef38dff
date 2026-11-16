import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import StoryTile, { storyMinutes } from "@/components/stories/StoryTile";
import { STORIES, getStory } from "@/lib/stories";

export const Route = createFileRoute("/stories/$slug")({
  loader: ({ params }) => {
    const story = getStory(params.slug);
    if (!story) throw notFound();
    return { slug: story.slug };
  },
  head: ({ loaderData }) => {
    const story = loaderData ? getStory(loaderData.slug) : undefined;
    if (!story) return { meta: [{ title: "Story not found — Jenvu" }, { name: "description", content: "This Jenvu story is unavailable." }, { property: "og:title", content: "Story not found — Jenvu" }, { property: "og:description", content: "Explore more Jenvu product stories." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] };
    const url = `https://jenvu.com/stories/${story.slug}`;
    return {
      meta: [
        { title: `${story.title} — Jenvu` },
        { name: "description", content: story.intro },
        { property: "og:title", content: story.title },
        { property: "og:description", content: story.intro },
        { property: "og:url", content: url },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  notFoundComponent: StoryNotFound,
  component: StoryPage,
});

function StoryNotFound() {
  return <div className="bg-background text-foreground"><SiteHeader/><main className="site-edge py-24"><h1 className="text-4xl">Story not found</h1><Button asChild variant="link" className="mt-5"><Link to="/stories">All stories<ArrowRight/></Link></Button></main><SiteFooter/></div>;
}

function StoryPage() {
  const { slug } = Route.useLoaderData();
  const story = getStory(slug);
  if (!story) return <StoryNotFound/>;
  const idx = STORIES.findIndex((s) => s.slug === slug);
  const related = [1, 2, 3].map((n) => STORIES[(idx + n) % STORIES.length]);
  return <div className="stories-page min-h-dvh bg-background text-foreground"><SiteHeader/><main className="site-edge py-12 sm:py-20">
    <Button asChild variant="link" className="mb-9 px-0"><Link to="/stories"><ArrowLeft/>All stories</Link></Button>
    <header className="mx-auto max-w-3xl"><p className="text-xs text-muted-foreground">{story.tag.trim() || 'MARKET GUIDES'} · {storyMinutes(story)} min read</p><h1 className="mt-5 text-4xl font-normal leading-tight sm:text-5xl">{story.title}</h1><p className="mt-6 text-lg leading-relaxed text-muted-foreground">{story.intro}</p></header>
    <figure className="mx-auto my-10 max-w-5xl"><img src={story.img} alt={story.feature.caption} width="1024" height="640" className="aspect-[16/9] w-full rounded-lg object-cover"/><figcaption className="mt-3 text-center text-xs text-muted-foreground">{story.feature.caption}</figcaption></figure>
    <article className="story-article mx-auto max-w-3xl"><h2>{story.feature.title}</h2>{story.feature.text.map(t => <p key={t}>{t}</p>)}<aside className="my-10 border-l-2 border-foreground pl-6"><h3 className="text-xl">{story.banner.title}</h3><p>{story.banner.text}</p></aside>
      {story.code && <div className="my-10 overflow-hidden rounded-lg border border-border bg-muted"><div className="border-b border-border px-5 py-3 text-xs text-muted-foreground">{story.code.title}</div><pre className="overflow-x-auto p-5 font-code text-xs leading-relaxed"><code>{story.code.text}</code></pre></div>}
      <h2>{story.steps.title}</h2><ul className="my-6 list-disc space-y-3 pl-5 text-base leading-relaxed text-muted-foreground">{story.steps.points.map(pt => <li key={pt}>{pt}</li>)}</ul>
      <div className="my-10 grid grid-cols-3 gap-4 border-y border-border py-8">{story.stats.map(st => <div key={st.label}><strong className="text-2xl font-normal sm:text-3xl">{st.value}</strong><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{st.label}</p></div>)}</div><Button asChild size="lg" className="rounded-full"><a href={story.cta.href}>{story.cta.label}<ArrowRight/></a></Button>
    </article><section className="mt-24 border-t border-border pt-12"><h2 className="mb-8 text-3xl">More stories</h2><div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">{related.map(r => r && <StoryTile key={r.slug} story={r}/>)}</div></section>
  </main><SiteFooter/></div>;
}
