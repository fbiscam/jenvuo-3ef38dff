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
      { to: "/killzones", label: "Killzone Times" },
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
      { to: "/help", label: "Help Center" },
      { to: "/about", label: "About" },
      { to: "/contact", label: "Contact" },
    ],
  },
  {
    label: "Legal",
    links: [
      { to: "/terms", label: "Terms of Service" },
      { to: "/privacy", label: "Privacy Policy" },
      { to: "/refund", label: "Refund Policy" },
      { to: "/cancellation", label: "Cancellation Policy" },
      { to: "/disclaimer", label: "Risk Disclaimer" },
    ],
  },

] as const;

export default function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="relative bg-white">
      {/* Subtle divider */}
      <div className="h-px w-full bg-transparent" />


      {/* Main grid */}
      <div className="mx-auto max-w-6xl px-5 sm:px-6 py-8 sm:py-10">
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
              {[
                { href: "https://x.com/jenvuai", label: "X (Twitter)", path: "M18.244 2H21.5l-7.19 8.213L22.5 22h-6.79l-4.79-6.24L5.4 22H2.14l7.69-8.78L2 2h6.91l4.34 5.73L18.244 2Zm-1.19 18h1.88L7.03 4H5.03l12.024 16Z" },
                { href: "https://instagram.com/jenvuai", label: "Instagram", path: "M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.334 3.608 1.308.975.975 1.246 2.242 1.308 3.608.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.062 1.366-.334 2.633-1.308 3.608-.975.975-2.242 1.246-3.608 1.308-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.062-2.633-.334-3.608-1.308-.975-.975-1.246-2.242-1.308-3.608C2.175 15.647 2.163 15.267 2.163 12s.012-3.584.07-4.85c.062-1.366.334-2.633 1.308-3.608.975-.975 2.242-1.246 3.608-1.308C8.416 2.175 8.796 2.163 12 2.163Zm0 1.802c-3.155 0-3.507.012-4.744.068-1.023.047-1.58.216-1.95.36-.49.19-.84.418-1.208.786-.368.368-.596.718-.786 1.208-.144.37-.313.927-.36 1.95-.056 1.237-.068 1.589-.068 4.744s.012 3.507.068 4.744c.047 1.023.216 1.58.36 1.95.19.49.418.84.786 1.208.368.368.718.596 1.208.786.37.144.927.313 1.95.36 1.237.056 1.589.068 4.744.068s3.507-.012 4.744-.068c1.023-.047 1.58-.216 1.95-.36.49-.19.84-.418 1.208-.786.368-.368.596-.718.786-1.208.144-.37.313-.927.36-1.95.056-1.237.068-1.589.068-4.744s-.012-3.507-.068-4.744c-.047-1.023-.216-1.58-.36-1.95a3.256 3.256 0 0 0-.786-1.208 3.256 3.256 0 0 0-1.208-.786c-.37-.144-.927-.313-1.95-.36-1.237-.056-1.589-.068-4.744-.068Zm0 3.063a5.135 5.135 0 1 1 0 10.27 5.135 5.135 0 0 1 0-10.27Zm0 8.468a3.333 3.333 0 1 0 0-6.666 3.333 3.333 0 0 0 0 6.666Zm5.338-8.669a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4Z" },
                { href: "https://facebook.com/jenvuai", label: "Facebook", path: "M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.99 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12Z" },
              ].map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 transition-colors hover:border-zinc-900 hover:bg-zinc-900 hover:text-white"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
                    <path d={s.path} />
                  </svg>
                </a>
              ))}
            </div>

          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.label} className="space-y-3">
              <div
                className={`${MONO} text-xs font-bold uppercase tracking-[0.25em] text-zinc-700`}
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
        <div className="mt-8 pt-4 pb-4 border-t border-zinc-100 flex flex-col md:flex-row items-start justify-between gap-3 md:translate-y-2">
          <div
            className={`${MONO} whitespace-nowrap text-[9px] tracking-[0.15em] sm:text-[11px] sm:tracking-[0.25em] uppercase text-zinc-900`}
          >
            © {year} JENVU AI · ALL RIGHTS RESERVED
          </div>
          <div
            className={`${MONO} text-[10px] uppercase tracking-[0.25em] text-zinc-900 flex items-center gap-3`}
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
