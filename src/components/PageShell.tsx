import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import SiteFooter from "@/components/SiteFooter";
import HeaderAuthButtons from "@/components/HeaderAuthButtons";

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
        <header className="hide-in-pwa sticky top-0 z-50 border-b border-zinc-100 bg-white">
          <div className="relative mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 py-3 sm:px-6 sm:py-4 md:flex md:justify-between">
            <Link to="/" className="flex min-w-0 items-center gap-2.5">
              <img src="/favicon.png" alt="Jenvu Logo" className="h-7 w-7 shrink-0 rounded-md object-contain" />
              <span className="truncate text-[22px] tracking-tight leading-none" style={{ color: "#3c4043", fontFamily: "\"Google Sans\", \"Product Sans\", \"DM Sans\", system-ui, sans-serif", fontWeight: 500 }}>Jenvu</span>
            </Link>
            <SiteNavLinks />
            <HeaderAuthButtons />

          </div>
        </header>

        {/* HERO */}
        <section className="public-page-hero border-b border-border">
          <div className="relative z-10 mx-auto max-w-4xl px-5 py-16 text-center sm:px-6 sm:py-24">
            <span className="inline-flex rounded-full border border-home-accent/30 bg-home-accent-soft px-3 py-1 text-[11px] font-medium text-home-accent">{eyebrow}</span>
            <h1 className="mx-auto mt-5 max-w-3xl whitespace-pre-line text-3xl font-semibold text-foreground sm:text-4xl md:text-5xl">
              {title}
            </h1>
            {intro && (
              <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                {intro}
              </p>
            )}
          </div>
        </section>

        {/* BODY */}
        <main className="public-page-rail mx-auto max-w-[900px] px-5 py-14 sm:px-8 sm:py-20">
          <div className="divide-y divide-border border-y border-border bg-background leading-relaxed [&>section]:py-8 first:[&>section]:pt-0 last:[&>section]:pb-0 sm:[&>section]:py-10">
            {children}
          </div>
          <p className={`mt-8 text-center ${MONO} text-[10px] uppercase tracking-[0.22em] text-zinc-500`}>
            Last updated · {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </p>
        </main>

        <div className="hide-in-pwa"><SiteFooter /></div>
      </div>
    </>
  );
}

export function H2({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-xl font-semibold text-foreground sm:text-2xl">
      {children}
    </h2>
  );
}

export function P({ children }: { children: ReactNode }) {
  return <p className="leading-relaxed text-muted-foreground">{children}</p>;
}

export function UL({ children }: { children: ReactNode }) {
  return (
    <ul className="space-y-2 pl-5 text-muted-foreground marker:text-home-accent list-disc">
      {children}
    </ul>
  );
}
