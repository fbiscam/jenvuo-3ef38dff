import { Link } from "@tanstack/react-router";

const LINKS: { label: string; to: string }[] = [
  { label: "Support", to: "/help" },
  { label: "System Status", to: "/status" },
  { label: "Terms of Use", to: "/terms" },
  { label: "Privacy Policy", to: "/privacy" },
  { label: "Report Security Issues", to: "/security" },
  { label: "Cookie Preferences", to: "/cookies" },
];

export default function DashboardFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-10 border-t border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 text-[12px] text-zinc-600 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-zinc-700 hover:text-zinc-900 hover:underline underline-offset-4"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="text-zinc-500">© {year} Jenvu, Inc.</div>
      </div>
    </footer>
  );
}
