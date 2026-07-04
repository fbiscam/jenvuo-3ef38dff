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
            <div className="flex items-center gap-2.5 pt-1">
              {[
                { href: "https://x.com/jenvuai", label: "X (Twitter)", slug: "x" },
                { href: "https://instagram.com/jenvuai", label: "Instagram", slug: "instagram" },
                { href: "https://facebook.com/jenvuai", label: "Facebook", slug: "facebook" },
                { href: "https://whatsapp.com/channel/jenvuai", label: "WhatsApp", slug: "whatsapp" },
              ].map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white transition-all hover:scale-110 hover:border-zinc-300 hover:shadow-sm"
                >
                  <img
                    src={`https://cdn.simpleicons.org/${s.slug}/000000`}
                    alt={`${s.label} logo`}
                    className="h-4 w-4"
                    loading="lazy"
                  />
                </a>
              ))}
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
