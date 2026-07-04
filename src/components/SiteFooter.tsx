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
                { href: "https://youtube.com/@jenvuai", label: "YouTube", path: "M23.498 6.186a2.995 2.995 0 0 0-2.109-2.117C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.389.569A2.995 2.995 0 0 0 .502 6.186C0 8.08 0 12 0 12s0 3.92.502 5.814a2.995 2.995 0 0 0 2.109 2.117C4.5 20.5 12 20.5 12 20.5s7.5 0 9.389-.569a2.995 2.995 0 0 0 2.109-2.117C24 15.92 24 12 24 12s0-3.92-.502-5.814ZM9.75 15.568V8.432L15.818 12 9.75 15.568Z" },
                { href: "https://discord.gg/jenvuai", label: "Discord", path: "M20.317 4.369A19.79 19.79 0 0 0 16.558 3.2a.074.074 0 0 0-.079.037c-.34.607-.719 1.4-.984 2.023a18.27 18.27 0 0 0-5.487 0 12.51 12.51 0 0 0-.996-2.023.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.677 4.369a.07.07 0 0 0-.032.028C.533 9.045-.32 13.579.099 18.057a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.995a.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.927 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.009c.12.099.246.198.372.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.891.077.077 0 0 0-.041.107c.36.699.772 1.364 1.225 1.994a.076.076 0 0 0 .084.029 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .031-.055c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03ZM8.02 15.331c-1.182 0-2.157-1.086-2.157-2.42 0-1.333.955-2.42 2.157-2.42 1.21 0 2.176 1.095 2.157 2.42 0 1.334-.955 2.42-2.157 2.42Zm7.974 0c-1.182 0-2.157-1.086-2.157-2.42 0-1.333.955-2.42 2.157-2.42 1.21 0 2.176 1.095 2.157 2.42 0 1.334-.947 2.42-2.157 2.42Z" },
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
