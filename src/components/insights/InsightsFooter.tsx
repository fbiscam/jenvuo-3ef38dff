import { Link } from "@tanstack/react-router";
import JenvuMark from "@/components/JenvuMark";
import ThemeToggle from "@/components/ThemeToggle";

type Item = { label: string; to?: string; href?: string };

const COLUMNS: { title: string; items: Item[] }[][] = [
  [
    {
      title: "Products",
      items: [
        { label: "Terminal", to: "/dashboard/terminal" },
        { label: "JX Bot", to: "/jx-bot" },
        { label: "AI Engine", to: "/ai-engine" },
        { label: "Kill zones", to: "/killzones" },
        { label: "Scam check", to: "/scam-check" },
      ],
    },
    { title: "Download", items: [{ label: "Jenvu app", to: "/download" }] },
  ],
  [
    {
      title: "Solutions",
      items: [
        { label: "ICT Gold trading", to: "/strategies/ict-gold-trading" },
        { label: "Broadcasts", to: "/broadcasts" },
        { label: "Founding Program", to: "/founding" },
      ],
    },
  ],
  [
    {
      title: "Developers",
      items: [
        { label: "API Platform", to: "/platform" },
        { label: "Docs", to: "/docs" },
        { label: "Models", to: "/models" },
        { label: "Pricing", to: "/pricing" },
      ],
    },
  ],
  [
    {
      title: "Company",
      items: [
        { label: "About", to: "/about" },
        { label: "Founder", to: "/founder" },
        { label: "News", to: "/insights" },
        { label: "Contact", to: "/contact" },
      ],
    },
    { title: "Help", items: [{ label: "Help Center", to: "/help" }, { label: "Search", to: "/search" }] },
  ],
  [
    {
      title: "Legal",
      items: [
        { label: "Terms", to: "/terms" },
        { label: "Privacy", to: "/privacy" },
        { label: "Refunds", to: "/refund" },
        { label: "Cancellation", to: "/cancellation" },
        { label: "Disclaimer", to: "/disclaimer" },
      ],
    },
    {
      title: "Social",
      items: [
        { label: "@jenvu on X", href: "https://x.com/jenvu" },
        { label: "YouTube", href: "https://www.youtube.com/@jenvu" },
        { label: "LinkedIn", href: "https://www.linkedin.com/company/jenvu" },
        { label: "Instagram", href: "https://www.instagram.com/jenvucompany/" },
      ],
    },
  ],
];

const LINK = "text-[14px] text-gc-ink-muted transition-colors hover:text-gc-ink";

/** Multi-column footer for the blog list and article pages. */
export default function InsightsFooter() {
  return (
    <footer className="hide-in-pwa border-t border-gc-line bg-background">
      <div className="site-edge grid gap-10 py-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,3fr)]">
        <div className="flex flex-col justify-between gap-8 lg:border-r lg:border-dashed lg:border-gc-line lg:pr-8">
          <div>
            <div className="flex items-center gap-2 text-gc-ink">
              <JenvuMark className="h-6 w-6" />
              <span className="text-[17px] font-medium tracking-[2px]">JENVU</span>
            </div>
            <p className="mt-3 text-[12px] text-gc-ink-muted">© {new Date().getUTCFullYear()} Jenvu</p>
          </div>
          <ThemeToggle />
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
          {COLUMNS.map((stack, i) => (
            <div key={i} className="flex flex-col gap-8">
              {stack.map((col) => (
                <div key={col.title}>
                  <div className="text-[14px] font-medium text-gc-ink">{col.title}</div>
                  <ul className="mt-3 space-y-2">
                    {col.items.map((it) => (
                      <li key={it.label}>
                        {it.to ? (
                          <Link to={it.to} className={LINK}>{it.label}</Link>
                        ) : (
                          <a href={it.href} target="_blank" rel="noopener noreferrer" className={LINK}>{it.label}</a>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}
