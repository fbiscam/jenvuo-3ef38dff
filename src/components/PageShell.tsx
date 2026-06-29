import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

const ACCENT = "#E8B84A";

export function PageShell({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh w-full bg-white text-black font-[Urbanist,sans-serif]">
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />

      <header className="relative z-10 mx-auto max-w-7xl px-6 py-6 flex items-center justify-between">
        <Link to="/" className="font-black tracking-[0.25em] text-lg">
          JENVU AI
        </Link>
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-black/70 hover:text-black"
        >
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
      </header>

      <section className="relative mx-auto max-w-4xl px-6 pt-10 pb-16">
        <div className="text-[11px] uppercase tracking-[0.3em] font-bold text-black/50">
          {eyebrow}
        </div>
        <h1 className="mt-4 text-5xl lg:text-6xl font-black uppercase tracking-tight leading-[0.95]">
          {title}
        </h1>
        <div
          className="mt-6 h-[2px] w-24"
          style={{ background: ACCENT }}
        />
        {intro && (
          <p className="mt-8 text-lg text-black/70 leading-relaxed max-w-3xl">
            {intro}
          </p>
        )}
      </section>

      <main className="relative mx-auto max-w-4xl px-6 pb-24">
        <div className="rounded-[2rem] bg-[#0A0A0A] text-white p-8 lg:p-12 space-y-8 leading-relaxed">
          {children}
        </div>

        <p className="mt-10 text-center text-xs uppercase tracking-[0.3em] text-black/40 font-semibold">
          Last updated · {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </p>
      </main>

      <footer className="border-t border-black/10">
        <div className="mx-auto max-w-7xl px-6 py-8 flex flex-wrap items-center justify-between gap-4 text-sm">
          <div className="font-black tracking-[0.2em]">JENVU AI</div>
          <div className="flex flex-wrap gap-5 text-black/60 font-semibold">
            <Link to="/about">About</Link>
            <Link to="/ai-engine">AI Engine</Link>
            <Link to="/llm">LLM</Link>
            <Link to="/development">Build</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/disclaimer">Disclaimer</Link>
          </div>
          <div className="text-black/50">© {new Date().getFullYear()} JENVU</div>
        </div>
      </footer>
    </div>
  );
}

export function H2({ children }: { children: ReactNode }) {
  return (
    <h2
      className="text-2xl font-black uppercase tracking-tight pt-2"
      style={{ color: ACCENT }}
    >
      {children}
    </h2>
  );
}

export function P({ children }: { children: ReactNode }) {
  return <p className="text-white/75">{children}</p>;
}

export function UL({ children }: { children: ReactNode }) {
  return (
    <ul className="space-y-2 text-white/75 list-disc pl-5 marker:text-[color:var(--accent,#E8B84A)]">
      {children}
    </ul>
  );
}
