import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import SiteFooter from "@/components/SiteFooter";
import HeaderAuthButtons from "@/components/HeaderAuthButtons";
import SiteNavLinks from "@/components/SiteNavLinks";

const MONO = "font-['JetBrains_Mono',ui-monospace,monospace]";
const SANS = "font-['Google_Sans','Product_Sans','Poppins',system-ui,sans-serif]";


export function PageShell({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <>
      <div className={`public-cloudflare jenvu-zoom min-h-dvh w-full bg-background text-foreground ${SANS} antialiased selection:bg-home-accent selection:text-home-accent-foreground`}>
        {/* NAV — matches homepage */}
        <header className="hide-in-pwa sticky top-0 z-50 bg-white">
          <div className="relative mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 px-5 py-3 sm:px-6 sm:py-4 md:flex md:justify-between">
            <a href="https://jenvu.com" className="flex min-w-0 items-center gap-2.5">
              <img src="/favicon.png" alt="Jenvu" className="h-7 w-7 shrink-0 rounded-md object-contain" />
              <span className="truncate text-[22px] tracking-tight leading-none" style={{ color: "#3c4043", fontFamily: "\"Google Sans\", \"Product Sans\", \"DM Sans\", system-ui, sans-serif", fontWeight: 500 }}>Jenvu</span>
            </a>
            <SiteNavLinks />
            <HeaderAuthButtons />

          </div>
        </header>

        {/* HERO — Google Cloud "Why Google Cloud" style: left-aligned on soft blue */}
        <section className="public-page-hero">
          <div className="relative z-10 mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
            <p className="text-[14px] font-medium text-gc-blue-deep">{eyebrow}</p>
            <h1 className="mt-3 max-w-3xl whitespace-pre-line text-[32px] font-normal leading-[1.2] tracking-tight text-gc-ink sm:text-[44px]">
              {title}
            </h1>
            {intro && (
              <p className="mt-5 max-w-2xl text-[16px] leading-relaxed text-gc-ink-muted sm:text-[18px]">
                {intro}
              </p>
            )}
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="https://auth.jenvu.com/sign-in"
                className="inline-flex h-11 items-center rounded-full bg-gc-blue px-6 text-[14px] font-medium text-primary-foreground hover:bg-gc-blue-hover"
              >
                Get started for free
              </a>
              <a
                href="https://jenvu.com/contact"
                className="inline-flex h-11 items-center rounded-full border border-gc-ink-muted/40 bg-background px-6 text-[14px] font-medium text-gc-blue-deep hover:bg-gc-blue-soft"
              >
                Contact us
              </a>
            </div>
          </div>
        </section>

        {/* BODY */}
        <main className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
          <div className="max-w-[820px] space-y-10 leading-relaxed [&>section]:border-b [&>section]:border-border [&>section]:pb-10 [&>section:last-child]:border-b-0">
            {children}
          </div>
          <p className="mt-10 text-[13px] text-gc-ink-muted">
            Last updated · {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </p>
        </main>

        <div className="hide-in-pwa"><SiteFooter /></div>
      </div>
    </>
  );
}

export function H2({ children }: { children: ReactNode }) {
  return <h2 className="text-[24px] font-normal text-gc-ink sm:text-[28px]">{children}</h2>;
}

export function P({ children }: { children: ReactNode }) {
  return <p className="text-[16px] leading-relaxed text-gc-ink-muted">{children}</p>;
}

export function UL({ children }: { children: ReactNode }) {
  return (
    <ul className="list-disc space-y-2 pl-5 text-[16px] text-gc-ink-muted marker:text-gc-blue">
      {children}
    </ul>
  );
}
