import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { STORIES } from "@/lib/stories";
import StoryTile, { storyMinutes } from "@/components/stories/StoryTile";

export const Route = createFileRoute("/stories/")({
  head: () => ({ meta: [
    { title: "Jenvu Stories — Products, Trading Tools & Developer Guides" },
    { name: "description", content: "Explore Jenvu product stories, Terminal guides, JX Bot walkthroughs, News Trading and developer articles." },
    { property: "og:title", content: "Jenvu Stories — Inside the Workspace" },
    { property: "og:description", content: "Product stories and practical guides from the Jenvu workspace." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ], links: [{ rel: "canonical", href: "https://jenvu.com/stories" }] }),
  component: StoriesPage,
});

function StoriesPage() {
  const [category, setCategory] = useState("All stories");
  const featured = STORIES[0];
  const categories = ["All stories", "Trading", "AI & API", "Workspace"];
  function group(slug: string) { return /api|python|models|build-with|ai-desk/.test(slug) ? "AI & API" : /founding|insights/.test(slug) ? "Workspace" : "Trading"; }
  const filtered = STORIES.filter(s => category === "All stories" || group(s.slug) === category);
  return <div className="stories-page min-h-dvh bg-background text-foreground"><SiteHeader/><main className="site-edge py-14 sm:py-20">
    <div className="mb-12"><p className="text-sm text-muted-foreground">Inside Jenvu</p><h1 className="mt-3 text-5xl font-normal sm:text-6xl">Stories</h1><p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">The products, ideas and practical guides behind your trading workspace.</p></div>
    {featured && <section className="stories-featured"><div><div className="text-xs text-muted-foreground">{featured.tag} · {storyMinutes(featured)} min read</div><h2 className="mt-5 text-3xl leading-tight sm:text-4xl">{featured.title}</h2><p className="mt-5 text-base leading-relaxed text-muted-foreground">{featured.intro}</p><Button asChild size="lg" className="mt-7 rounded-full"><Link to="/stories/$slug" params={{slug:featured.slug}}>Read the story<ArrowRight/></Link></Button></div><Link to="/stories/$slug" params={{slug:featured.slug}} aria-label={featured.title}><img src={featured.img} alt={featured.feature.caption} width="960" height="600" className="aspect-[16/10] w-full rounded-lg object-cover"/></Link></section>}
    <section className="mt-20"><div className="flex flex-wrap items-center justify-between gap-5 border-b border-border pb-5"><h2 className="text-2xl">All stories</h2><div role="tablist" aria-label="Story categories" className="flex flex-wrap gap-1">{categories.map(c => <Button key={c} role="tab" aria-selected={c === category} variant={c === category ? 'secondary' : 'ghost'} className="rounded-full" onClick={() => setCategory(c)}>{c}</Button>)}</div></div><div className="mt-9 grid gap-x-7 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">{filtered.map(s => <StoryTile key={s.slug} story={s}/>)}</div></section>
  </main><SiteFooter/></div>;
}
