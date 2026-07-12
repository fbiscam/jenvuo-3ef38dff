import { Link } from "@tanstack/react-router";

const LINKS: { label: string; to: string }[] = [
  { label: "Support", to: "/help" },
  { label: "System Status", to: "/status" },
  { label: "Terms of Use", to: "/terms" },
  { label: "Privacy Policy", to: "/privacy" },
  { label: "Report Security Issues", to: "/security" },
];

export default function DashboardFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-10 border-t border-zinc-200 bg-[#FAFAFA]">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-5 gap-y-2 px-4 py-5 text-center text-[12px] text-zinc-600 sm:px-6">
        {LINKS.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className="text-zinc-700 hover:text-zinc-900 hover:underline underline-offset-4"
          >
            {l.label}
          </Link>
        ))}
        <Link
          to="/cookies"
          className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-zinc-700 shadow-sm hover:bg-zinc-50"
        >
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#1a73e8] text-white">
            <svg viewBox="0 0 20 20" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4,10 8,14 16,6" />
            </svg>
          </span>
          Cookie Preferences
        </Link>
        <span className="text-zinc-500">© {year} Jenvu, Inc.</span>
      </div>
    </footer>
  );
}
