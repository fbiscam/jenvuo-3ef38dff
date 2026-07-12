import { Link } from "@tanstack/react-router";

const LINKS: { label: string; to: string }[] = [
  { label: "About", to: "/about" },
  { label: "Contact", to: "/contact" },
  { label: "Privacy", to: "/privacy" },
  { label: "Terms", to: "/terms" },
  { label: "Help", to: "/help" },
];

export default function DashboardFooter({ sidebarCollapsed = false }: { sidebarCollapsed?: boolean }) {
  const year = new Date().getFullYear();
  return (
    <footer
      className={`fixed bottom-0 right-0 left-0 z-30 border-t border-zinc-200/80 bg-white/85 backdrop-blur-md ${
        sidebarCollapsed ? "lg:left-[60px]" : "lg:left-[200px]"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
        {/* Brand mark */}
        <div className="flex items-center gap-2 text-[12px] text-zinc-500">
          <span
            className="inline-block h-1.5 w-1.5 rounded-full bg-zinc-900"
            aria-hidden
          />
          <span
            className="font-medium tracking-tight text-zinc-900"
            style={{ fontFamily: "'Google Sans', Urbanist, sans-serif" }}
          >
            Jenvu
          </span>
          <span className="hidden text-zinc-300 sm:inline">·</span>
          <span className="hidden sm:inline">© {year}</span>
        </div>

        {/* Links */}
        <nav className="flex flex-wrap items-center justify-end gap-x-1 gap-y-1 text-[12px] text-zinc-600">
          {LINKS.map((l, i) => (
            <span key={l.to} className="flex items-center">
              {i > 0 && (
                <span
                  className="mx-2 inline-block h-1 w-1 rounded-full bg-zinc-300"
                  aria-hidden
                />
              )}
              <Link
                to={l.to}
                className="rounded px-1 py-0.5 tracking-tight text-zinc-600 transition-colors hover:text-zinc-900"
              >
                {l.label}
              </Link>
            </span>
          ))}
        </nav>
      </div>
    </footer>
  );
}
