import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";

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
      <div className={`jenvu-zoom min-h-dvh w-full bg-[#FAFAFA] text-zinc-900 ${SANS} antialiased selection:bg-zinc-900 selection:text-white`}>
        <SiteHeader />


        {/* HERO */}
        <section className="border-b border-zinc-100">
          <div className="mx-auto max-w-6xl px-5 sm:px-6 py-14 sm:py-20">
            <h1 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl whitespace-pre-line">
              {title}
            </h1>
            {intro && (
              <p className="mt-5 max-w-2xl text-base text-zinc-600 leading-relaxed sm:text-lg">
                {intro}
              </p>
            )}
          </div>
        </section>

        {/* BODY */}
        <main className="mx-auto max-w-6xl px-5 sm:px-6 py-14 sm:py-20">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-10 md:p-14 space-y-10 leading-relaxed shadow-[0_24px_60px_-24px_rgba(0,0,0,0.08)]">
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
    <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900 pt-2 border-t border-zinc-100 first:border-t-0 first:pt-0">
      {children}
    </h2>
  );
}

export function P({ children }: { children: ReactNode }) {
  return <p className="text-zinc-700 leading-relaxed">{children}</p>;
}

export function UL({ children }: { children: ReactNode }) {
  return (
    <ul className="space-y-2 text-zinc-700 list-disc pl-5 marker:text-zinc-400">
      {children}
    </ul>
  );
}
