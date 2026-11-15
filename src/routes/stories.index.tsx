import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { STORIES } from "@/lib/stories";

const TITLE = "Stories: how Jenvu works with MT5, AI models, news and Python";
const DESCRIPTION =
  "Real workflows behind Jenvu: JX Bot on MetaTrader 5, one API key for many AI models, Gold news reactions and Python examples, plus product updates.";

export const Route = createFileRoute("/stories/")({
  head: () => ({
    meta: [
      { title: `${TITLE} — Jenvu` },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: "https://jenvu.com/stories" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://jenvu.com/stories" }],
  }),
  component: StoriesIndex,
});

function StoriesIndex() {
  return (
    <PageShell
      wide
      eyebrow="STORIES"
      title="Stories"
      intro="How Jenvu works with MetaTrader 5, AI models, economic news and Python, plus what's new on the platform."
    >
      <section className="mx-auto max-w-[1200px] px-5 py-12 sm:px-8">
        <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {STORIES.map((s) => (
            <Link key={s.slug} to="/stories/$slug" params={{ slug: s.slug }} className="group block">
              <div className="overflow-hidden rounded-2xl bg-gc-ink">
                <img
                  src={s.img}
                  alt=""
                  width={1024}
                  height={640}
                  loading="lazy"
                  decoding="async"
                  className="aspect-[16/10] h-auto w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                />
              </div>
              <p className="mt-4 text-[12px] font-medium tracking-[0.08em] text-gc-ink-muted">{s.tag}</p>
              <h2 className="mt-2 text-[20px] font-normal leading-snug text-gc-ink group-hover:underline">{s.title}</h2>
              <p className="mt-2 line-clamp-3 text-[15px] leading-[1.6] text-gc-ink-muted">{s.intro}</p>
            </Link>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
