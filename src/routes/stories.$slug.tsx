import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { PageShell, Feature, Banner, Stats, StoryCards, H2, UL } from "@/components/PageShell";
import { STORIES, getStory } from "@/lib/stories";

export const Route = createFileRoute("/stories/$slug")({
  loader: ({ params }) => {
    const story = getStory(params.slug);
    if (!story) throw notFound();
    return { slug: story.slug };
  },
  head: ({ loaderData }) => {
    const story = loaderData ? getStory(loaderData.slug) : undefined;
    if (!story) {
      return { meta: [{ title: "Story not found — Jenvu" }, { name: "robots", content: "noindex" }] };
    }
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
  return (
    <PageShell eyebrow="\n" title="Story not found" intro="This story doesn't exist or has moved.">
      <Link to="/" className="text-gc-blue-deep hover:underline">Back to the homepage</Link>
    </PageShell>
  );
}

function StoryPage() {
  const { slug } = Route.useLoaderData();
  const story = getStory(slug)!;
  const idx = STORIES.findIndex((s) => s.slug === slug);
  const related = [1, 2, 3].map((n) => STORIES[(idx + n) % STORIES.length]);

  return (
    <PageShell wide eyebrow={story.tag} title={story.title} intro={story.intro}>
      <Feature
        title={story.feature.title}
        text={
          <>
            {story.feature.text.map((t, i) => (
              <p key={i} className={i ? "mt-4" : ""}>{t}</p>
            ))}
          </>
        }
        linkLabel={story.cta.label}
        href={story.cta.href}
        media={<img src={story.img} alt="" width={1024} height={640} className="h-auto w-full" />}
        caption={story.feature.caption}
      />

      <div className="px-4 py-6 sm:px-6">
        <Banner title={story.banner.title}>{story.banner.text}</Banner>
      </div>

      <Stats
        title={story.steps.title}
        text={
          <UL>
            {story.steps.points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </UL>
        }
        stats={story.stats}
      />

      <div className="mx-auto max-w-[1040px] px-5 sm:px-8">
        <H2>{""}</H2>
      </div>

      <StoryCards
        title="More stories"
        intro="Keep reading about what's new at Jenvu."
        cards={related.map((r) => ({ title: r.title, href: `/stories/${r.slug}`, cta: "Read the story" }))}
      />
    </PageShell>
  );
}
