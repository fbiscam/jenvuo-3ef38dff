import { Link } from "@tanstack/react-router";

const MONO = "font-mono";

const columns = [
  {
    label: "Platform",
    links: [
      { to: "/", label: "Home" },
      { to: "/app", label: "Voice Agent" },
      { to: "/signal", label: "Signal Desk" },
      { to: "/pricing", label: "Pricing" },
      { to: "/download", label: "Download App" },
    ],
  },
  {
    label: "Intelligence",
    links: [
      { to: "/insights", label: "Market Insights" },
      { to: "/ai-engine", label: "AI Engine" },
      { to: "/llm", label: "Language Model" },
      { to: "/development", label: "Development" },
    ],
  },
  {
    label: "Account",
    links: [
      { to: "/dashboard", label: "Dashboard" },
      { to: "/auth", label: "Sign In" },
      { to: "/about", label: "About" },
      { to: "/contact", label: "Contact" },
    ],
  },
  {
    label: "Legal",
    links: [
      { to: "/terms", label: "Terms of Service" },
      { to: "/privacy", label: "Privacy Policy" },
      { to: "/disclaimer", label: "Risk Disclaimer" },
    ],
  },
] as const;

export default function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="relative border-t border-zinc-200 bg-white">
      {/* Subtle divider */}
      <div className="h-px w-full bg-zinc-200" />


      {/* Main grid */}
      <div className="mx-auto max-w-6xl px-5 sm:px-6 py-12 sm:py-16">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-2.5">
              <img
                src="/favicon.png"
                alt="JENVU AI"
                className="h-7 w-7 rounded object-contain"
              />
              <span className="text-zinc-900 font-semibold tracking-tight text-lg">
                JENVU AI
              </span>
            </Link>
            <p className="text-sm text-zinc-600 leading-relaxed max-w-xs">
              Institutional-grade voice intelligence for gold traders. ICT & SMC
              analysis, narrated live.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <span className="relative flex h-2 w-2">
                <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-75" />
                <span className="relative rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span
                className={`${MONO} text-[10px] uppercase tracking-[0.25em] text-zinc-500`}
              >
                Terminal Online
              </span>
            </div>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.label} className="space-y-3">
              <div
                className={`${MONO} text-[10px] uppercase tracking-[0.25em] text-zinc-400`}
              >
                {col.label}
              </div>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.to}>
                    <Link
                      to={l.to}
                      className="text-sm text-zinc-700 hover:text-zinc-950 transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider + sub bar */}
        <div className="mt-12 pt-6 border-t border-zinc-100 flex flex-col md:flex-row items-center justify-between gap-4">
          <div
            className={`${MONO} text-[11px] uppercase tracking-[0.25em] text-zinc-500`}
          >
            © {year} JENVU AI · ALL RIGHTS RESERVED
          </div>
          <div
            className={`${MONO} text-[10px] uppercase tracking-[0.25em] text-zinc-400 flex items-center gap-3`}
          >
            <a
              href="mailto:support@jenvu.com"
              className="hover:text-zinc-700 transition-colors"
            >
              support@jenvu.com
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
