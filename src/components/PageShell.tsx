import type { ReactNode } from "react";
import SiteFooter from "@/components/SiteFooter";
import HeaderAuthButtons from "@/components/HeaderAuthButtons";
import SiteHeader from "@/components/SiteHeader";

const SANS = "font-['Google_Sans_Flex','Google_Sans','Product_Sans','Poppins',system-ui,sans-serif]";

/**
 * Shared public page layout in the Google Cloud "Why Google Cloud" style:
 * centered hero, optional light-blue highlight banner, body, and a
 * "Take the next step" panel above the footer.
 */
export function PageShell({
  eyebrow,
  title,
  intro,
  highlight,
  wide = false,
  oneLine = false,
  children,
}: {
  /** Story pages: title and intro on one line on tablet/desktop, wrapping on phones. */
  oneLine?: boolean;
  eyebrow?: string;
  title: ReactNode;
  intro?: string;
  highlight?: { title: string; text: ReactNode };
  /** When true, children control their own width (rich pages like About). */
  wide?: boolean;
  children: ReactNode;
}) {
  const showEyebrow = !!eyebrow && eyebrow.replace(/\\n/g, "").trim().length > 0;
  return (
    <div className={`public-cloudflare jenvu-zoom min-h-dvh w-full bg-background text-foreground ${SANS} antialiased selection:bg-home-accent selection:text-home-accent-foreground`}>
      <SiteHeader />

      {/* HERO — centered */}
      <section className="bg-background">
        <div className={`mx-auto ${oneLine ? "max-w-[1400px]" : "max-w-3xl"} px-5 pb-12 pt-14 text-center sm:px-8 sm:pb-16 sm:pt-16`}>
          {showEyebrow && <p className={`text-[14px] font-medium ${oneLine ? "text-gc-ink-muted" : "text-gc-blue-deep"}`}>{eyebrow}</p>}
          <h1 className={`mt-2 whitespace-pre-line ${oneLine ? "text-[26px] sm:whitespace-nowrap sm:text-[clamp(22px,3.2vw,40px)]" : "text-[32px] sm:text-[40px]"} font-normal leading-[1.2] tracking-tight text-gc-ink`}>
            {title}
          </h1>
          {intro && (
            <p className={`mx-auto mt-5 ${oneLine ? "max-w-none line-clamp-2 sm:line-clamp-none sm:whitespace-nowrap sm:text-[clamp(11px,1.25vw,16px)]" : "max-w-[680px]"} text-[16px] leading-[1.6] text-gc-ink-muted`}>{intro}</p>
          )}
          <div className="mt-7 flex justify-center">
            <a
              href="https://auth.jenvu.com/sign-in"
              className="inline-flex h-10 items-center rounded-full bg-gc-blue-deep px-5 text-[14px] font-medium text-gc-on-blue hover:bg-gc-blue"
            >
              Get started for free
            </a>
          </div>
        </div>
      </section>

      {highlight && (
        <div className="px-4 sm:px-6">
          <Banner title={highlight.title}>{highlight.text}</Banner>
        </div>
      )}

      <main className={wide ? "" : "mx-auto max-w-[860px] px-5 py-12 sm:px-8 sm:py-16"}>
        {wide ? (
          children
        ) : (
          <>
            <div className="space-y-10 leading-relaxed [&>section]:border-b [&>section]:border-gc-line [&>section]:pb-10 [&>section:last-child]:border-b-0">
              {children}
            </div>
            <p className="mt-10 text-[13px] text-gc-ink-muted">
              Last updated · {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </p>
          </>
        )}
      </main>

      <NextStep />

      <div className="hide-in-pwa"><SiteFooter /></div>
    </div>
  );
}

/** Full-width light-blue rounded banner with centered text. */
export function Banner({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mx-auto max-w-[1536px] rounded-2xl bg-gc-sky px-6 py-10 text-center sm:px-10">
      <h2 className="text-[24px] font-normal text-gc-ink sm:text-[26px]">{title}</h2>
      <div className="mx-auto mt-4 max-w-[720px] text-[15px] leading-[1.6] text-gc-ink-muted [&_a]:text-gc-blue-deep [&_a]:underline">
        {children}
      </div>
    </section>
  );
}

/** "Take the next step" grey panel with a contact CTA and quick links. */
export function NextStep() {
  const links = [
    { label: "Start using Jenvu", cta: "Try it free", href: "https://auth.jenvu.com/sign-in" },
    { label: "Compare plans and credits", cta: "See pricing", href: "https://jenvu.com/pricing" },
    { label: "Join the Jenvu Founding Program", cta: "Apply here", href: "https://jenvu.com/founding" },
  ];
  return (
    <div className="hide-in-pwa px-4 pb-0 pt-4 sm:px-6">
      <section className="mx-auto max-w-[1536px] bg-gc-panel px-6 py-12 sm:px-10 md:py-16">
        <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-[1fr_auto] md:gap-16">
          <div>
            <h2 className="text-[24px] font-normal text-gc-ink">Take the next step</h2>
            <p className="mt-6 max-w-[500px] text-[16px] leading-[1.6] text-gc-ink-muted">
              Tell us what you're trading. The Jenvu team will help you find the right setup and plan.
            </p>
            <a
              href="https://jenvu.com/contact"
              className="mt-7 inline-flex h-10 items-center rounded-full bg-gc-blue-deep px-5 text-[14px] font-medium text-gc-on-blue hover:bg-gc-blue"
            >
              Contact us
            </a>
          </div>
          <ul className="space-y-6 border-gc-line md:min-w-[230px] md:border-l md:pl-5">
            {links.map((l) => (
              <li key={l.label}>
                <p className="text-[14px] text-gc-ink">{l.label}</p>
                <a href={l.href} className="mt-2 inline-block text-[14px] text-gc-blue-deep hover:underline">{l.cta}</a>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

/** Two-column text + media row. */
export function Feature({
  title,
  text,
  linkLabel,
  href,
  media,
  caption,
}: {
  title: string;
  text: ReactNode;
  linkLabel?: string;
  href?: string;
  media: ReactNode;
  caption?: string;
}) {
  return (
    <section className="mx-auto grid max-w-[1040px] items-start gap-8 px-5 py-12 sm:px-8 md:grid-cols-2 md:gap-5">
      <div>
        <h2 className="text-[24px] font-normal text-gc-ink">{title}</h2>
        <div className="mt-3 text-[15px] leading-[1.65] text-gc-ink-muted">{text}</div>
        {linkLabel && href && (
          <a href={href} className="mt-6 inline-block text-[14px] text-gc-blue-deep hover:underline">{linkLabel}</a>
        )}
      </div>
      <figure>
        <div className="overflow-hidden rounded-2xl">{media}</div>
        {caption && <figcaption className="mt-3 text-[12px] text-gc-ink-muted">{caption}</figcaption>}
      </figure>
    </section>
  );
}

/** Text column + green stat numbers. */
export function Stats({
  title,
  text,
  stats,
  linkLabel,
  href,
}: {
  title: string;
  text: ReactNode;
  stats: { value: string; label: string }[];
  linkLabel?: string;
  href?: string;
}) {
  return (
    <section className="mx-auto grid max-w-[1040px] gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1fr_1.1fr] md:gap-10">
      <div>
        <h2 className="text-[24px] font-normal text-gc-ink">{title}</h2>
        <div className="mt-4 text-[15px] leading-[1.65] text-gc-ink-muted">{text}</div>
        {linkLabel && href && (
          <a href={href} className="mt-6 inline-block text-[14px] text-gc-blue-deep hover:underline">{linkLabel}</a>
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <p className="text-[44px] font-normal leading-none text-gc-success sm:text-[52px]">{s.value}</p>
            <div className="mx-auto my-4 h-px w-3/4 bg-gc-line" />
            <p className="text-[14px] leading-snug text-gc-ink">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/** "Get inspired" style bordered cards. */
export function StoryCards({
  title,
  intro,
  cards,
}: {
  title: string;
  intro?: string;
  cards: { title: string; href: string; cta?: string }[];
}) {
  return (
    <section className="mx-auto max-w-[1040px] px-5 py-14 text-center sm:px-8">
      <h2 className="text-[30px] font-normal text-gc-ink sm:text-[32px]">{title}</h2>
      {intro && <p className="mt-4 text-[15px] text-gc-ink-muted">{intro}</p>}
      <div className="mt-9 grid gap-5 text-left md:grid-cols-3">
        {cards.map((c) => (
          <a
            key={c.title}
            href={c.href}
            className="flex min-h-[160px] flex-col justify-between rounded-lg border border-gc-line bg-background p-5 transition-shadow hover:shadow-md"
          >
            <p className="text-[18px] leading-snug text-gc-ink">{c.title}</p>
            <span className="mt-6 text-[14px] text-gc-blue-deep">{c.cta ?? "Read more"}</span>
          </a>
        ))}
      </div>
    </section>
  );
}

export function H2({ children }: { children: ReactNode }) {
  return <h2 className="text-[24px] font-normal text-gc-ink">{children}</h2>;
}

export function P({ children }: { children: ReactNode }) {
  return <p className="text-[15px] leading-[1.65] text-gc-ink-muted">{children}</p>;
}

export function UL({ children }: { children: ReactNode }) {
  return (
    <ul className="list-disc space-y-2 pl-5 text-[15px] leading-[1.65] text-gc-ink-muted marker:text-gc-blue">
      {children}
    </ul>
  );
}
