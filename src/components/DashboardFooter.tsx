import { Link } from "@tanstack/react-router";

const LINKS: { label: string; to: string }[] = [
  { label: "Home", to: "/" },
  { label: "Pricing", to: "/pricing" },
  { label: "About", to: "/about" },
  { label: "Contact", to: "/contact" },
  { label: "Insights", to: "/insights" },
  { label: "Briefs", to: "/briefs" },
  { label: "Killzones", to: "/killzones" },
  { label: "AI Engine", to: "/ai-engine" },
  { label: "Help", to: "/help" },
  { label: "Status", to: "/status" },
  { label: "Download", to: "/download" },
  { label: "Terms", to: "/terms" },
  { label: "Privacy", to: "/privacy" },
  { label: "Disclaimer", to: "/disclaimer" },
  { label: "Refund", to: "/refund" },
  { label: "Cancellation", to: "/cancellation" },
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
