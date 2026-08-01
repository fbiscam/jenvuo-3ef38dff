import type { ReactNode } from "react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

const SANS = "font-['Google_Sans','Product_Sans','Poppins',system-ui,sans-serif]";

export function ToolsShell({
  eyebrow,
  title,
  intro,
  right,
  children,
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={`jenvu-zoom min-h-dvh w-full bg-[#FAFAFA] text-zinc-900 ${SANS} antialiased`}>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-6 sm:py-14">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            {eyebrow && (
              <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">{eyebrow}</p>
            )}
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
            {intro && <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-zinc-600">{intro}</p>}
          </div>
          {right}
        </div>
        {children}
      </main>
      <div className="hide-in-pwa">
        <SiteFooter />
      </div>
    </div>
  );
}

export function ToolCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[22px] border border-zinc-200/70 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_28px_-12px_rgba(16,24,40,0.10)] ring-1 ring-white/60 sm:p-6 ${className}`}
    >
      {children}
    </div>
  );
}

export default ToolsShell;
