import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { PageShell, Banner, StoryCards, UL } from "@/components/PageShell";
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
      {/* Feature: text and picture, vertically centred */}
      <section className="mx-auto grid max-w-[1040px] items-center gap-10 px-5 py-12 sm:px-8 md:grid-cols-2">
        <div>
          <h2 className="text-[26px] font-normal leading-tight text-gc-ink">{story.feature.title}</h2>
          <div className="mt-4 space-y-4 text-[16px] leading-[1.65] text-gc-ink-muted">
            {story.feature.text.map((t, i) => (
              <p key={i}>{t}</p>
            ))}
          </div>
          <a href={story.cta.href} className="mt-6 inline-flex h-10 items-center rounded-full border border-gc-line px-5 text-[14px] font-medium text-gc-blue-deep hover:bg-gc-surface">
            {story.cta.label}
          </a>
        </div>
        <figure>
          <div className="overflow-hidden rounded-2xl bg-gc-ink">
            <img src={story.img} alt="" width={1024} height={640} className="aspect-[16/10] h-auto w-full object-cover" />
          </div>
          <figcaption className="mt-3 text-center text-[13px] text-gc-ink-muted">{story.feature.caption}</figcaption>
        </figure>
      </section>

      <div className="mx-auto max-w-[1040px] px-5 py-6 sm:px-8">
        <Banner title={story.banner.title}>{story.banner.text}</Banner>
      </div>

      {/* Key points + numbers */}
      <section className="mx-auto grid max-w-[1040px] items-center gap-10 px-5 py-14 sm:px-8 md:grid-cols-2">
        <div>
          <h2 className="text-[26px] font-normal leading-tight text-gc-ink">{story.steps.title}</h2>
          <div className="mt-5">
            <UL>
              {story.steps.points.map((pt) => (
                <li key={pt}>{pt}</li>
              ))}
            </UL>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {story.stats.map((st) => (
            <div key={st.label} className="flex flex-col items-center text-center">
              <p className="text-[40px] font-normal leading-none text-gc-success sm:text-[48px]">{st.value}</p>
              <div className="my-4 h-px w-3/4 bg-gc-line" />
              <p className="text-[14px] leading-snug text-gc-ink">{st.label}</p>
            </div>
          ))}
        </div>
      </section>

      <StoryCards
        title="More stories"
        intro="Keep reading about what's new at Jenvu."
        cards={related.map((r) => ({ title: r.title, href: `/stories/${r.slug}`, cta: "Read the story" }))}
      />
    </PageShell>
  );
}
