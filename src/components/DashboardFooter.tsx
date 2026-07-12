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
          className="inline-flex items-center gap-1.5 text-zinc-700 hover:underline underline-offset-4"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
            <circle cx="12" cy="12" r="11" fill="#1a73e8" />
            <path d="M6 12.5 L10 16 L15 9" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M15.5 13.5 L19 17 M19 13.5 L15.5 17" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          Cookie Preferences
        </Link>
        <span className="text-zinc-500">© {year} Jenvu, Inc.</span>
      </div>
    </footer>
  );
}
