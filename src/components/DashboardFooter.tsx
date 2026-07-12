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
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event("jenvu:open-cookie-preferences"))}
          className="inline-flex items-center gap-1.5 text-zinc-700 hover:underline underline-offset-4"
        >
          Cookie Preferences
        </button>
        <span className="text-zinc-500">© {year} Jenvu, Inc.</span>
      </div>
    </footer>
  );
}
