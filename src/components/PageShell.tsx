import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowUpRight, BookOpen, FileText, Headphones, Mail, Sparkles, type LucideIcon } from "lucide-react";
import BlogFooter from "@/components/BlogFooter";
import SiteHeader from "@/components/SiteHeader";
import { useAuthUser } from "@/hooks/useAuthUser";

const SANS = "font-['Google_Sans_Flex','Google_Sans','Product_Sans','Poppins',system-ui,sans-serif]";
const AURORAS = ["var(--platform-aurora-1)", "var(--platform-aurora-2)", "var(--platform-aurora-3)"];

/** Same pill buttons as the homepage (black primary, warm-grey light). */
export const pillBlue =
  "inline-flex items-center gap-1.5 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition hover:opacity-90";
export const pillOutline =
  "inline-flex items-center gap-1.5 rounded-full bg-gc-pill px-5 py-2.5 text-sm font-medium text-foreground transition hover:brightness-95";
const blueLink = "inline-flex items-center gap-1 text-[15px] font-medium text-gc-blue hover:underline";

/**
 * Shared public page layout in the API Platform style: big centred heading,
 * pill buttons, aurora strip, soft bordered sections and a "Take the next step"
 * box above the footer.
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
    <div className={`public-cloudflare min-h-dvh w-full bg-background text-foreground ${SANS} antialiased selection:bg-home-accent selection:text-home-accent-foreground`}>
      <SiteHeader />

      {/* HERO — centred, Platform style */}
      <section className="bg-background">
        <div className={`mx-auto ${oneLine ? "max-w-[1400px]" : "max-w-4xl"} px-5 pb-14 pt-16 text-center sm:px-8 sm:pb-16 sm:pt-24`}>
          {showEyebrow && (
            <span className="inline-flex items-center rounded-full border border-gc-line bg-background px-3.5 py-1 text-[13px] font-medium text-gc-ink-muted">
              {eyebrow}
            </span>
          )}
          <h1
            className={`mx-auto mt-4 whitespace-pre-line ${
              oneLine
                ? "text-[26px] sm:whitespace-nowrap sm:text-[clamp(22px,3.2vw,40px)]"
                : "max-w-3xl text-[2.4rem] sm:text-[3.4rem]"
            } font-medium leading-[1.08] tracking-tight text-gc-ink`}
          >
            {title}
          </h1>
          {intro && (
            <p
              className={`mx-auto mt-6 ${
                oneLine ? "max-w-none line-clamp-2 sm:line-clamp-none sm:whitespace-nowrap sm:text-[clamp(11px,1.25vw,16px)]" : "max-w-[700px] sm:text-[17px]"
              } text-[16px] leading-[1.6] text-gc-ink-muted`}
            >
              {intro}
            </p>
          )}
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <HeroPrimaryCta />
            {!oneLine && (
              <Link to="/contact" className={pillOutline}>
                Contact sales <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>
      </section>

      {!oneLine && <PolicyHub />}

      {highlight && (
        <div className="mx-auto max-w-[82.5rem] px-5 pt-10 [&>section]:max-w-none">
          <Banner title={highlight.title}>{highlight.text}</Banner>
        </div>
      )}

      <main className={wide ? "py-6 sm:py-10" : "mx-auto max-w-[860px] px-5 py-12 sm:px-8 sm:py-16"}>
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

      <div className="hide-in-pwa"><BlogFooter /></div>
    </div>
  );
}

const POLICIES = [
  { to: "/terms", label: "Terms of Use" },
  { to: "/privacy", label: "Privacy Policy" },
  { to: "/refund", label: "Refund Policy" },
  { to: "/disclaimer", label: "Risk Disclaimer" },
  { to: "/cancellation", label: "Cancellation Policy" },
  { to: "/help", label: "Help Center" },
] as const;

/** Policy pages: quick links between policies plus who to ask (replaces the old blank colour strip). */
function PolicyHub() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  if (!POLICIES.some((p) => p.to !== "/help" && path.endsWith(p.to))) return null;
  return (
    <div className="mx-auto max-w-[82.5rem] px-5">
      <div className="flex flex-col gap-4 rounded-md border border-gc-line bg-background p-4 sm:p-5 md:flex-row md:items-center md:justify-between">
        <nav aria-label="Policies" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] md:flex-wrap md:pb-0">
          {POLICIES.map((p) => {
            const active = path.endsWith(p.to);
            return (
              <Link
                key={p.to}
                to={p.to}
                aria-current={active ? "page" : undefined}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13.5px] font-medium transition-colors ${
                  active ? "bg-gc-blue text-gc-on-blue" : "border border-gc-line text-gc-ink hover:bg-gc-blue-soft"
                }`}
              >
                {p.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-gc-ink-muted">
          <span className="inline-flex items-center gap-1.5 md:hidden xl:inline-flex"><FileText className="h-4 w-4" /> Official Jenvu policy</span>
          <a href="mailto:support@jenvu.com" className="inline-flex items-center gap-1.5 hover:text-gc-ink">
            <Mail className="h-4 w-4" /> support@jenvu.com
          </a>
        </div>
      </div>
    </div>
  );
}

/** Soft bordered box with an aurora glow and centred text. */
export function Banner({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="relative mx-auto max-w-[1200px] overflow-hidden rounded-md border border-gc-line bg-background px-6 py-12 text-center sm:px-10">
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-40" style={{ backgroundImage: "var(--platform-aurora-2)" }} />
      <div className="relative">
        <h2 className="text-[26px] font-medium tracking-tight text-gc-ink sm:text-[30px]">{title}</h2>
        <div className="mx-auto mt-4 max-w-[720px] text-[15px] leading-[1.65] text-gc-ink-muted [&_a]:font-medium [&_a]:text-gc-blue [&_a]:underline [&_a]:underline-offset-2">
          {children}
        </div>
      </div>
    </section>
  );
}

/** "Take the next step" box with a contact CTA and quick links. */
export function NextStep() {
  const links: { label: string; cta: string; href?: string; to?: "/pricing" | "/founding"; icon: LucideIcon }[] = [
    { label: "Join the Founding Program", cta: "Apply now", to: "/founding", icon: Sparkles },
    { label: "Compare plans and credits", cta: "See pricing", to: "/pricing", icon: BookOpen },
    { label: "Already a member", cta: "Sign in", href: "https://auth.jenvu.com/sign-in", icon: Headphones },
  ];
  const cls = "flex items-center gap-4 rounded-md bg-background/90 p-4 shadow-sm transition hover:bg-background";
  return (
    <div className="hide-in-pwa mx-auto max-w-[1300px] px-5 pb-0 pt-4 sm:px-10">
      <section className="overflow-hidden rounded-md border border-gc-line bg-background">
        <div className="grid md:grid-cols-[1.1fr_1fr]">
          <div className="px-5 py-10 sm:px-10 md:py-14">
            <h2 className="text-[30px] font-medium tracking-tight text-gc-ink sm:text-[36px]">Take the next step</h2>
            <p className="mt-5 max-w-[500px] text-[16px] leading-[1.6] text-gc-ink-muted">
              Tell us what you're trading. The Jenvu team will help you find the right setup and plan.
            </p>
            <Link to="/contact" className={`mt-8 ${pillBlue}`}>
              Contact us
            </Link>
          </div>
          <ul className="grid content-center gap-3 border-t border-gc-line p-5 sm:p-8 md:border-l md:border-t-0" style={{ backgroundImage: "var(--platform-aurora-3)" }}>
            {links.map((l) => (
              <li key={l.label}>
                {(() => {
                  const inner = (
                    <>
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gc-line bg-background text-gc-ink">
                        <l.icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[14px] text-gc-ink">{l.label}</span>
                        <span className="mt-0.5 block text-[14px] font-medium text-gc-blue">{l.cta}</span>
                      </span>
                    </>
                  );
                  return l.to ? <Link to={l.to} className={cls}>{inner}</Link> : <a href={l.href} className={cls}>{inner}</a>;
                })()}
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
    <section className="mx-auto grid max-w-[1200px] items-center gap-8 px-5 py-14 sm:px-8 md:grid-cols-2 md:gap-14">
      <div>
        <h2 className="text-[30px] font-medium leading-tight tracking-tight text-gc-ink sm:text-[36px]">{title}</h2>
        <div className="mt-5 text-[16px] leading-[1.65] text-gc-ink-muted">{text}</div>
        {linkLabel && href && (
          <a href={href} className={`mt-7 ${blueLink}`}>
            {linkLabel} <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
      <figure>
        <div className="overflow-hidden rounded-md">{media}</div>
        {caption && <figcaption className="mt-3 text-[13px] text-gc-ink-muted">{caption}</figcaption>}
      </figure>
    </section>
  );
}

/** Text column + stat cards. */
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
    <section className="mx-auto grid max-w-[1200px] items-start gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1fr_1.15fr] md:gap-14">
      <div>
        <h2 className="text-[30px] font-medium leading-tight tracking-tight text-gc-ink sm:text-[36px]">{title}</h2>
        <div className="mt-5 text-[16px] leading-[1.65] text-gc-ink-muted">{text}</div>
        {linkLabel && href && (
          <a href={href} className={`mt-7 ${blueLink}`}>
            {linkLabel} <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {stats.map((s, i) => (
          <div key={s.label} className="relative overflow-hidden rounded-md border border-gc-line bg-background p-5">
            <div aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ backgroundImage: AURORAS[i % AURORAS.length] }} />
            <p className="text-[38px] font-medium leading-none tracking-tight text-gc-ink sm:text-[44px]">{s.value}</p>
            <p className="mt-4 text-[14px] leading-snug text-gc-ink-muted">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/** "Get inspired" bordered cards with an aurora top. */
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
    <section className="mx-auto max-w-[1200px] px-5 py-14 text-center sm:px-8">
      <h2 className="text-[30px] font-medium tracking-tight text-gc-ink sm:text-[40px]">{title}</h2>
      {intro && <p className="mt-4 text-[16px] text-gc-ink-muted">{intro}</p>}
      <div className="mt-10 grid gap-5 text-left md:grid-cols-3">
        {cards.map((c, i) => (
          <a
            key={c.title}
            href={c.href}
            className="group flex flex-col overflow-hidden rounded-md border border-gc-line bg-background transition-shadow hover:shadow-md"
          >
            <div aria-hidden className="h-24" style={{ backgroundImage: AURORAS[i % AURORAS.length] }} />
            <div className="flex flex-1 flex-col justify-between p-6">
              <p className="text-[18px] font-medium leading-snug text-gc-ink">{c.title}</p>
              <span className={`mt-6 ${blueLink}`}>
                {c.cta ?? "Read more"} <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

export function H2({ children }: { children: ReactNode }) {
  return <h2 className="text-[26px] font-medium tracking-tight text-gc-ink">{children}</h2>;
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

/** Signed-out visitors apply; signed-in users go straight to their dashboard. */
function HeroPrimaryCta() {
  const { user, loading } = useAuthUser();
  if (loading) return <span className={`${pillBlue} invisible`} aria-hidden>Apply now</span>;
  if (user) {
    return (
      <Link to="/dashboard/overview" className={pillBlue}>
        Go to dashboard <ArrowUpRight className="h-3.5 w-3.5" />
      </Link>
    );
  }
  return (
    <Link to="/founding" className={pillBlue}>
      Apply now
    </Link>
  );
}
